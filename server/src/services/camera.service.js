const { getDatabase } = require('../config/database');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const STREAM_DIR = path.join(__dirname, '../../streams');

if (!fs.existsSync(STREAM_DIR)) {
  fs.mkdirSync(STREAM_DIR, { recursive: true });
}

// Store active streams
const activeStreams = new Map();
const lastStreamResults = new Map();

/**
 * Get FFmpeg binary path (uses ffmpeg-static if available, ensures execute permissions)
 */
function getFfmpegPath() {
  try {
    const staticPath = require('ffmpeg-static');
    if (staticPath && fs.existsSync(staticPath)) {
      try { fs.chmodSync(staticPath, 0o755); } catch {}
      return staticPath;
    }
  } catch {}
  return 'ffmpeg';
}

const dns = require('dns').promises;

/**
 * Resolve hostname to IPv4 to prevent IPv6/getaddrinfo segfaults on cloud container environments
 */
async function resolveRtspUrlToIPv4(rtspUrl) {
  try {
    const parsed = new URL(rtspUrl);
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) {
      return rtspUrl;
    }
    const resolved = await dns.lookup(parsed.hostname, { family: 4 });
    if (resolved && resolved.address) {
      parsed.hostname = resolved.address;
      return parsed.toString();
    }
  } catch (err) {
    console.warn('[CameraService] IPv4 DNS lookup fallback:', err.message);
  }
  return rtspUrl;
}

/**
 * Start RTSP relay for a camera - converts to HLS for browser playback
 */
async function startStream(camera) {
  const cameraId = camera.camera_id;

  // If the motion engine already holds the single allowed RTSP connection,
  // reuse its HLS output instead of opening a second one.
  try {
    const motion = require('./motion.service');
    if (motion.isRunning(cameraId)) {
      const hlsPath = motion.getHlsPath(cameraId);
      const info = { process: null, shared: true, camera, hlsPath, outputDir: path.dirname(hlsPath), startedAt: new Date(), status: 'streaming' };
      activeStreams.set(cameraId, info);
      return info;
    }
  } catch {}

  if (activeStreams.has(cameraId)) {
    return activeStreams.get(cameraId);
  }

  const ffmpegPath = getFfmpegPath();
  const effectiveRtspUrl = await resolveRtspUrlToIPv4(camera.rtsp_url);
  const outputDir = path.join(STREAM_DIR, `cam_${cameraId}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const hlsPath = path.join(outputDir, 'stream.m3u8');

  const args = [
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-rtsp_transport', 'tcp',
    '-timeout', '15000000',
    '-i', effectiveRtspUrl,
    '-an', // Disable audio for lightweight RTSP transcoding
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-g', '25',
    '-sc_threshold', '0',
    '-f', 'hls',
    '-hls_time', '1',
    '-hls_list_size', '3',
    '-hls_flags', 'delete_segments+append_list',
    '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
    hlsPath,
    '-y',
  ];

  const ffmpeg = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  const streamInfo = {
    process: ffmpeg,
    camera,
    hlsPath,
    outputDir,
    startedAt: new Date(),
    status: 'starting',
  };

  streamInfo.stderrLog = '';
  ffmpeg.stdout.on('data', () => {});
  ffmpeg.stderr.on('data', (data) => {
    const msg = data.toString();
    streamInfo.stderrLog = ((streamInfo.stderrLog || '') + msg).slice(-2000);
    streamInfo.lastStderr = streamInfo.stderrLog;
    if (msg.includes('frame=') || msg.includes('Opening') || msg.includes('EXTINF')) {
      streamInfo.status = 'streaming';
    }
  });

  ffmpeg.on('close', (code) => {
    streamInfo.status = 'stopped';
    lastStreamResults.set(cameraId, { status: 'stopped', exitCode: code, lastStderr: streamInfo.lastStderr });
    activeStreams.delete(cameraId);
    console.log(`Stream for camera ${cameraId} stopped with code ${code}. Stderr: ${streamInfo.lastStderr || 'none'}`);
  });

  ffmpeg.on('error', (err) => {
    console.error(`Stream error for camera ${cameraId}:`, err.message);
    streamInfo.status = 'error';
    lastStreamResults.set(cameraId, { status: 'error', error: err.message, lastStderr: streamInfo.lastStderr });
    activeStreams.delete(cameraId);
  });

  activeStreams.set(cameraId, streamInfo);
  console.log(`Started stream for camera ${cameraId}: ${camera.camera_name}`);
  return streamInfo;
}

/**
 * Stop a camera stream
 */
function stopStream(cameraId) {
  const stream = activeStreams.get(cameraId);
  if (stream) {
    // Shared HLS is owned by the motion engine - don't kill it, just detach.
    if (stream.shared) {
      activeStreams.delete(cameraId);
      return;
    }
    try {
      stream.process.kill('SIGTERM');
    } catch {}
    activeStreams.delete(cameraId);

    // Clean up HLS files
    if (fs.existsSync(stream.outputDir)) {
      setTimeout(() => {
        try {
          fs.readdirSync(stream.outputDir).forEach(f => {
            try { fs.unlinkSync(path.join(stream.outputDir, f)); } catch {}
          });
        } catch {}
      }, 500);
    }
  }
}

/**
 * Stop all streams
 */
function stopAllStreams() {
  for (const [cameraId] of activeStreams) {
    stopStream(cameraId);
  }
}

/**
 * Get stream status for a camera
 */
function getStreamStatus(cameraId) {
  const stream = activeStreams.get(cameraId);
  if (stream) {
    const hasM3u8 = fs.existsSync(stream.hlsPath);
    let segmentCount = 0;
    try {
      segmentCount = fs.readdirSync(stream.outputDir).filter(f => f.endsWith('.ts')).length;
    } catch {}

    return {
      status: stream.status,
      startedAt: stream.startedAt,
      camera: stream.camera.camera_name,
      hasM3u8,
      segmentCount,
      lastStderr: stream.lastStderr,
    };
  }
  const last = lastStreamResults.get(cameraId);
  return last || { status: 'stopped' };
}

/**
 * Get all active streams
 */
function getActiveStreams() {
  const streams = [];
  for (const [cameraId, stream] of activeStreams) {
    streams.push({
      cameraId,
      cameraName: stream.camera.camera_name,
      status: stream.status,
      startedAt: stream.startedAt,
    });
  }
  return streams;
}

/**
 * Probe RTSP stream to check if camera is reachable
 */
async function probeCamera(rtspUrl, timeout = 18000) {
  const effectiveRtspUrl = await resolveRtspUrlToIPv4(rtspUrl);
  return new Promise((resolve) => {
    const ffmpegPath = getFfmpegPath();
    const args = [
      '-rtsp_transport', 'tcp',
      '-timeout', '15000000',
      '-i', effectiveRtspUrl,
      '-t', '1',
      '-f', 'null',
      '-',
    ];

    const ffmpeg = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        ffmpeg.kill('SIGTERM');
        resolved = true;
        resolve({ reachable: false, error: 'Connection timeout' });
      }
    }, timeout);

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (!resolved) {
        clearTimeout(timer);
        resolved = true;
        if (code === 0 || stderr.includes('Stream #')) {
          // Extract stream info
          const resolutionMatch = stderr.match(/(\d{3,4})x(\d{3,4})/);
          const codecMatch = stderr.match(/Video: (\w+)/);
          resolve({
            reachable: true,
            resolution: resolutionMatch ? `${resolutionMatch[1]}x${resolutionMatch[2]}` : 'unknown',
            codec: codecMatch ? codecMatch[1] : 'unknown',
          });
        } else {
          resolve({ reachable: false, error: `FFmpeg exit code: ${code} - ${(stderr.slice(-400).trim() || 'no stderr')}` });
        }
      }
    });

    ffmpeg.on('error', (err) => {
      if (!resolved) {
        clearTimeout(timer);
        resolved = true;
        resolve({ reachable: false, error: `Spawn error: ${err.message}` });
      }
    });
  });
}

module.exports = {
  startStream,
  stopStream,
  stopAllStreams,
  getStreamStatus,
  getActiveStreams,
  probeCamera,
};
