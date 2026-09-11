/**
 * BoardersWatch Motion Tracking Service
 *
 * Server-side motion detection & tracking using FFmpeg frame differencing.
 * FFmpeg samples the RTSP feed as small grayscale frames; the server compares
 * consecutive frames to compute the motion percentage, centroid and bounding
 * region. Detected motion triggers the alert pipeline (in-app + email), can
 * record an evidence clip, and (optionally) auto-pans the camera to follow.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const cameraService = require('./camera.service');

const W = 160;
const H = 90;
const FPS = 3;
const PIXEL_DIFF = 25;         // per-pixel intensity change to count as "changed"
const COOLDOWN_MS = 12000;     // min gap between alerts per camera
const CLIP_SECONDS = 8;        // evidence clip length

const RECORDINGS_DIR = path.join(__dirname, '../../recordings');
if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

const STREAM_DIR = path.join(__dirname, '../../streams');
if (!fs.existsSync(STREAM_DIR)) fs.mkdirSync(STREAM_DIR, { recursive: true });

const emitters = new EventEmitter();
emitters.setMaxListeners(50);

const detectors = new Map();

function getFfmpegPath() {
  try {
    const p = require('ffmpeg-static');
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return 'ffmpeg';
}

/**
 * Sensitivity (percent of frame that must change) -> alert threshold.
 * Stored on the camera as `motion_sensitivity` (0.1 - 10.0). Lower = more sensitive.
 */
function thresholdFor(camera) {
  let s = parseFloat(camera.motion_sensitivity);
  if (!Number.isFinite(s) || s <= 0) {
    // fall back to legacy alert_threshold
    const map = { low: 0.6, medium: 1.5, high: 3.5 };
    s = map[camera.alert_threshold] || 1.5;
  }
  return s;
}

function startDetection(camera, onMotion) {
  const id = camera.camera_id;
  if (detectors.has(id)) return detectors.get(id);

  let rtsp = camera.rtsp_url;
  const outputDir = path.join(STREAM_DIR, `cam_${id}`);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const hlsPath = path.join(outputDir, 'stream.m3u8');

  // ONE RTSP connection feeds BOTH the motion analysis pipe (stdout) and HLS
  // for browser viewing (Tapo cameras allow only a single RTSP client).
  const args = [
    '-rtsp_transport', 'tcp',
    '-timeout', '8000000',
    '-i', rtsp,
    // Output 1: low-res grayscale frames to stdout for motion analysis
    '-map', '0:v', '-vf', `scale=${W}:${H},format=gray`, '-r', String(FPS),
    '-f', 'rawvideo', '-pix_fmt', 'gray', '-',
    // Output 2: HLS for live viewing
    '-map', '0:v', '-an',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
    '-g', '25', '-sc_threshold', '0',
    '-f', 'hls', '-hls_time', '1', '-hls_list_size', '3',
    '-hls_flags', 'delete_segments+append_list',
    '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
    hlsPath,
  ];

  const proc = spawn(getFfmpegPath(), args, { stdio: ['ignore', 'pipe', 'ignore'] });
  const frameSize = W * H;
  let buffer = Buffer.alloc(0);
  let prev = null;

  const det = {
    camera,
    proc,
    prev: null,
    hlsPath,
    outputDir,
    state: { cameraId: id, motion: false, pct: 0, cx: null, cy: null, bbox: null, ts: Date.now() },
    lastAlertAt: 0,
    frames: 0,
    onMotion,
    running: true,
  };

  proc.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= frameSize) {
      const frame = buffer.subarray(0, frameSize);
      buffer = buffer.subarray(frameSize);
      det.frames++;

      if (prev) {
        let sumx = 0, sumy = 0, active = 0;
        let minx = W, miny = H, maxx = 0, maxy = 0;
        for (let i = 0; i < frameSize; i++) {
          if (Math.abs(frame[i] - prev[i]) > PIXEL_DIFF) {
            const x = i % W;
            const y = (i / W) | 0;
            sumx += x; sumy += y; active++;
            if (x < minx) minx = x;
            if (x > maxx) maxx = x;
            if (y < miny) miny = y;
            if (y > maxy) maxy = y;
          }
        }
        const pct = (active / frameSize) * 100;
        const moving = active > 0 && pct >= 0.05;
        const state = {
          cameraId: id,
          motion: moving,
          pct: +pct.toFixed(2),
          cx: active ? +(sumx / active / W).toFixed(3) : null,
          cy: active ? +(sumy / active / H).toFixed(3) : null,
          bbox: active ? {
            x: +(minx / W).toFixed(3), y: +(miny / H).toFixed(3),
            w: +((maxx - minx) / W).toFixed(3), h: +((maxy - miny) / H).toFixed(3),
          } : null,
          ts: Date.now(),
        };
        det.state = state;
        emitters.emit('motion', state);
        emitters.emit('frame', state);

        const threshold = thresholdFor(det.camera);
        const now = Date.now();
        if (pct >= threshold && now - det.lastAlertAt > COOLDOWN_MS) {
          det.lastAlertAt = now;
          try { det.onMotion && det.onMotion(det.camera, state); } catch (e) { console.error('[Motion] onMotion error', e.message); }
        }
      }
      prev = Buffer.from(frame);
    }
  });

  proc.on('close', () => { det.running = false; detectors.delete(id); });
  proc.on('error', (e) => { console.error(`[Motion] ffmpeg error cam ${id}:`, e.message); detectors.delete(id); });

  detectors.set(id, det);
  console.log(`[Motion] Detection started for camera ${id} (${camera.camera_name})`);
  return det;
}

function stopDetection(cameraId) {
  const det = detectors.get(cameraId);
  if (det) {
    try { det.proc.kill('SIGTERM'); } catch {}
    detectors.delete(cameraId);
    console.log(`[Motion] Detection stopped for camera ${cameraId}`);
  }
}

function stopAll() {
  for (const id of [...detectors.keys()]) stopDetection(id);
}

function getState(cameraId) {
  const det = detectors.get(Number(cameraId));
  return det ? det.state : { cameraId: Number(cameraId), motion: false, pct: 0, cx: null, cy: null, bbox: null, running: false };
}

function getAllStates() {
  const out = {};
  for (const [id, det] of detectors) out[id] = det.state;
  return out;
}

function isRunning(cameraId) {
  return detectors.has(Number(cameraId));
}

function onFrame(listener) { emitters.on('frame', listener); }
function onMotionEvent(listener) { emitters.on('motion', listener); }
function off(listener) { emitters.off('frame', listener); emitters.off('motion', listener); }

/**
 * Record a short evidence clip from the camera's live HLS feed.
 * (Reading HLS avoids a second RTSP connection, which Tapo cameras reject.)
 * @returns {Promise<string|null>} clip file path
 */
function recordClip(camera, seconds = CLIP_SECONDS) {
  return new Promise((resolve) => {
    try {
      const det = detectors.get(camera.camera_id);
      const hlsPath = det ? det.hlsPath : path.join(STREAM_DIR, `cam_${camera.camera_id}`, 'stream.m3u8');
      if (!fs.existsSync(hlsPath)) return resolve(null);

      const dir = path.join(RECORDINGS_DIR, `cam_${camera.camera_id}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = path.join(dir, `${stamp}.mp4`);

      const proc = spawn(getFfmpegPath(), [
        '-i', hlsPath,
        '-t', String(seconds),
        '-c', 'copy',
        '-movflags', '+faststart',
        '-y', file,
      ], { stdio: ['ignore', 'ignore', 'pipe'] });

      let err = '';
      proc.stderr.on('data', d => { err = (err + d.toString()).slice(-800); });

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(file)) {
          pruneClips(camera.camera_id, 25);
          resolve(file);
        } else {
          console.error(`[Motion] clip failed (code ${code}): ${err}`);
          resolve(null);
        }
      });
      proc.on('error', () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

function getHlsPath(cameraId) {
  return path.join(STREAM_DIR, `cam_${cameraId}`, 'stream.m3u8');
}

function pruneClips(cameraId, keep) {
  try {
    const dir = path.join(RECORDINGS_DIR, `cam_${cameraId}`);
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp4')).sort();
    while (files.length > keep) {
      const f = files.shift();
      try { fs.unlinkSync(path.join(dir, f)); } catch {}
    }
  } catch {}
}

function listClips(cameraId) {
  try {
    const dir = path.join(RECORDINGS_DIR, `cam_${cameraId}`);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.mp4'))
      .sort()
      .reverse()
      .map(f => {
        const st = fs.statSync(path.join(dir, f));
        return { file: f, size: st.size, created: st.mtime, url: `/api/recordings/cam_${cameraId}/${f}` };
      });
  } catch { return []; }
}

module.exports = {
  startDetection, stopDetection, stopAll, getState, getAllStates, isRunning,
  onFrame, onMotionEvent, off, recordClip, listClips, getHlsPath, RECORDINGS_DIR,
};
