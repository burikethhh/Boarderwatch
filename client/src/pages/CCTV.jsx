import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';
import {
  IconPlus, IconCCTV, IconWifi, IconWifiOff, IconAlertTriangle,
  IconSettings, IconRefresh, IconLoader, IconX, IconEye, IconCheck,
  IconRadar, IconSearch, IconTrash, IconEdit
} from '../components/Icons';

function CameraPlayer({ camera, onStartStream, onStopStream, streaming }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString());
  const [isBuffering, setIsBuffering] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!streaming || !videoRef.current) return;

    let Hls;
    let isCancelled = false;

    const initPlayer = async () => {
      try {
        Hls = (await import('hls.js')).default;
        if (isCancelled || !videoRef.current) return;

        const src = `/api/stream/${camera.camera_id}/stream.m3u8`;

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: false,
            lowLatencyMode: true,
            backBufferLength: 4,
            liveSyncDurationCount: 2,
            liveMaxLatencyDurationCount: 4,
            manifestLoadingMaxRetry: 50,
            manifestLoadingRetryDelay: 1500,
            manifestLoadingMaxRetryTimeout: 60000,
            levelLoadingMaxRetry: 50,
            levelLoadingRetryDelay: 1500,
          });
          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(videoRef.current);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsBuffering(false);
            videoRef.current?.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setIsBuffering(true);
                  setTimeout(() => {
                    if (!isCancelled && hlsRef.current) {
                      if (
                        data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
                        data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT
                      ) {
                        hls.loadSource(src);
                      } else {
                        hls.startLoad();
                      }
                    }
                  }, 1500);
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  break;
              }
            }
          });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = src;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error('HLS init error:', err);
      }
    };

    initPlayer();

    return () => {
      isCancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streaming, camera.camera_id]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div ref={containerRef} className="aspect-video bg-black relative overflow-hidden group">
      {streaming ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            muted
            autoPlay
            playsInline
          />
          {isBuffering && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2.5 z-10">
              <IconLoader className="w-8 h-8 text-blue-400 animate-spin" />
              <div className="text-center">
                <p className="text-xs text-white font-medium">Connecting to Camera Feed...</p>
                <p className="text-[10px] text-text-muted mt-0.5 font-mono">Transcoding RTSP to HLS</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80">
          <IconCCTV className="w-12 h-12 text-surface-4 mb-2 opacity-60" />
          <span className="text-[11px] text-text-muted font-mono tracking-wider">OFFLINE PREVIEW</span>
        </div>
      )}

      {/* Top Overlay Badge */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-2 z-10">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1.5 ${
            streaming
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : camera.status === 'active'
              ? 'bg-white text-black'
              : 'bg-surface-3 text-text-muted'
          }`}
        >
          {streaming && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
          {streaming ? 'LIVE REC' : camera.status === 'active' ? 'READY' : camera.status}
        </span>
        {streaming && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white text-[10px] rounded font-mono border border-white/10">
            {timeStr}
          </span>
        )}
      </div>

      {/* Fullscreen Button */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={toggleFullscreen}
          className="p-1.5 bg-black/70 hover:bg-black text-white rounded-lg border border-white/20 backdrop-blur-sm text-[11px]"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? 'Exit' : 'Full Screen'}
        </button>
      </div>

      {/* Bottom Camera Label */}
      <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-10">
        <span className="px-2 py-1 bg-black/75 backdrop-blur-sm text-white text-[11px] font-medium rounded border border-white/10">
          {camera.camera_name}
        </span>
      </div>
    </div>
  );
}

export default function CCTV() {
  const [cameras, setCameras] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [showTapoGuide, setShowTapoGuide] = useState(false);
  const [presets, setPresets] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [streamingCameras, setStreamingCameras] = useState(new Set());
  const [recordingAll, setRecordingAll] = useState(false);
  const [simulatingAlert, setSimulatingAlert] = useState(false);

  // Auto-discovery state
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredCameras, setDiscoveredCameras] = useState([]);
  const [scannedSubnets, setScannedSubnets] = useState([]);
  const [customSubnetInput, setCustomSubnetInput] = useState('');
  const [directIpInput, setDirectIpInput] = useState('');
  const [probingDirectIp, setProbingDirectIp] = useState(false);
  const [directIpResult, setDirectIpResult] = useState(null);
  const [discoveryError, setDiscoveryError] = useState(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [rebindingId, setRebindingId] = useState(null);
  const [rebindStatus, setRebindStatus] = useState(null);
  const [showDhcpGuide, setShowDhcpGuide] = useState(false);
  const [copiedMac, setCopiedMac] = useState(false);

  const [form, setForm] = useState({
    camera_name: 'CAM 1 - MAIN ENTRANCE (Tapo C200)',
    location: 'Front Gate / Main Entrance',
    brand: 'tapo',
    ip_address: '',
    username: '',
    password: '',
    port: 554,
    stream_path: 'stream1',
    motion_detection: 1,
    alert_threshold: 'medium',
  });

  const fetchData = useCallback(async () => {
    try {
      const [c, p, a] = await Promise.all([
        api.get('/cameras'),
        api.get('/cameras/presets'),
        api.get('/notifications/alerts?acknowledged=0'),
      ]);
      setCameras(c.data);
      setPresets(p.data);
      setAlerts(a.data);
    } catch (e) {
      console.error('Fetch CCTV data failed:', e);
    }
  }, []);

  const { loading, lastUpdated, refresh } = usePolling(fetchData, 5000);

  const handleStartStream = async (camId) => {
    try {
      await api.post(`/cameras/${camId}/stream/start`);
      setStreamingCameras((prev) => new Set(prev).add(camId));
    } catch (err) {
      console.error('Start stream failed:', err);
    }
  };

  const handleStopStream = async (camId) => {
    try {
      await api.post(`/cameras/${camId}/stream/stop`);
      setStreamingCameras((prev) => {
        const next = new Set(prev);
        next.delete(camId);
        return next;
      });
    } catch (err) {
      console.error('Stop stream failed:', err);
    }
  };

  const handleRecordAllToggle = () => {
    if (recordingAll) {
      setRecordingAll(false);
      cameras.forEach((c) => handleStopStream(c.camera_id));
    } else {
      setRecordingAll(true);
      cameras.forEach((c) => handleStartStream(c.camera_id));
    }
  };

  const handleTestConnection = async (camId) => {
    try {
      await api.post(`/cameras/${camId}/test`);
      refresh();
    } catch {}
  };

  const handleSaveCamera = async (e) => {
    e.preventDefault();
    try {
      if (editingCamera) {
        await api.put(`/cameras/${editingCamera.camera_id}`, form);
      } else {
        await api.post('/cameras', form);
      }
      setShowForm(false);
      setEditingCamera(null);
      refresh();
    } catch (err) {
      console.error('Save camera failed:', err);
    }
  };

  const handleEditCamera = (cam) => {
    setEditingCamera(cam);
    setForm({
      camera_name: cam.camera_name,
      location: cam.location || '',
      brand: cam.brand || 'tapo',
      ip_address: cam.ip_address,
      username: cam.username || '',
      password: '',
      port: cam.port || 554,
      stream_path: (cam.stream_path || 'stream1').replace(/^\/+/, ''),
      motion_detection: cam.motion_detection !== undefined ? cam.motion_detection : 1,
      alert_threshold: cam.alert_threshold || 'medium',
    });
    setTestResult(null);
    setShowForm(true);
  };

  const handleDeleteCamera = async (camId) => {
    if (!window.confirm('Are you sure you want to remove this camera from the system?')) return;
    try {
      await api.delete(`/cameras/${camId}`);
      if (streamingCameras.has(camId)) {
        handleStopStream(camId);
      }
      refresh();
    } catch (err) {
      console.error('Delete camera failed:', err);
    }
  };

  const handleAutoRebind = async (camId) => {
    setRebindingId(camId);
    setRebindStatus(null);
    try {
      const res = await api.post(`/cameras/${camId}/auto-rebind`);
      setRebindStatus({ success: res.data.success, message: res.data.message });
      refresh();
    } catch (err) {
      setRebindStatus({
        success: false,
        message: err.response?.data?.message || 'Failed to auto-detect camera. Verify camera is powered on and connected to Wi-Fi.',
      });
    } finally {
      setRebindingId(null);
    }
  };


  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/settings/test-camera', form);
      setTestResult(res.data);
    } catch {
      setTestResult({ success: false, message: 'Connection test failed. Verify Tapo Camera Account credentials and IP.' });
    }
    setTesting(false);
  };

  const handleAcknowledge = async (id) => {
    await api.put(`/notifications/alerts/${id}/acknowledge`);
    refresh();
  };

  const handleSimulateMotionAlert = async () => {
    if (cameras.length === 0) return;
    setSimulatingAlert(true);
    try {
      const targetCam = cameras[0];
      await api.post('/cameras/webhook', {
        camera_id: targetCam.camera_id,
        type: 'motion',
        description: `Motion Detected! ${targetCam.camera_name} detected movement at ${targetCam.location || 'Entrance'}`
      });
      refresh();
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setSimulatingAlert(false);
    }
  };

  const setupTapoC200QuickForm = () => {
    setForm({
      camera_name: 'CAM 1 - MAIN ENTRANCE (Tapo C200)',
      location: 'Front Gate / Main Entrance',
      brand: 'tapo',
      ip_address: '',
      username: '',
      password: '',
      port: 554,
      stream_path: 'stream1',
      motion_detection: 1,
      alert_threshold: 'medium',
    });
    setTestResult(null);
    setShowForm(true);
  };

  const handleAutoDiscover = async (customSubnet = null) => {
    setDiscovering(true);
    setDiscoveryError(null);
    setHasScanned(true);
    setShowDiscoverModal(true);
    try {
      const url = customSubnet ? `/cameras/discover?subnet=${encodeURIComponent(customSubnet)}` : '/cameras/discover';
      const res = await api.get(url);
      setDiscoveredCameras(res.data.cameras || []);
      setScannedSubnets(res.data.scannedSubnets || []);
    } catch (err) {
      console.error('Auto discovery error:', err);
      setDiscoveryError(err.response?.data?.error || err.message || 'Failed to scan network');
    } finally {
      setDiscovering(false);
    }
  };

  const handleProbeSingleIp = async (ip) => {
    if (!ip) return;
    setProbingDirectIp(true);
    setDirectIpResult(null);
    try {
      const res = await api.get(`/cameras/probe?ip=${encodeURIComponent(ip.trim())}`);
      setDirectIpResult(res.data);
    } catch (err) {
      setDirectIpResult({ ip, reachable: false, error: err.response?.data?.error || err.message });
    } finally {
      setProbingDirectIp(false);
    }
  };

  const handleSelectDiscoveredCamera = (dev) => {
    setForm({
      camera_name: dev.name || 'CAM 1 - Tapo C200 (Auto-Detected)',
      location: 'Front Gate / Main Entrance',
      brand: dev.brand || 'tapo',
      ip_address: dev.ip,
      username: '',
      password: '',
      port: dev.port || 554,
      stream_path: (dev.streamPath || 'stream1').replace(/^\/+/, ''),
      motion_detection: 1,
      alert_threshold: 'medium',
    });
    setShowDiscoverModal(false);
    setTestResult(null);
    setShowForm(true);
  };

  const generateRtspUrl = () => {
    const preset = presets[form.brand] || presets.generic;
    if (!preset) return '';
    const cleanStream = (form.stream_path || 'stream1').replace(/^\/+/, '');
    return `rtsp://${form.username || 'user'}:${form.password ? '••••••' : 'pass'}@${form.ip_address || '192.168.1.xxx'}:${form.port || 554}/${cleanStream}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">CCTV Surveillance</h1>
            <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] font-mono rounded uppercase tracking-wider">
              Day N Earth Lucero
            </span>
          </div>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">
            {cameras.length} cameras configured &middot; {alerts.length} active motion alerts &middot; Real-time RTSP/HLS
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setShowTapoGuide(!showTapoGuide)}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border text-text-secondary hover:text-white rounded-lg text-xs transition"
          >
            <IconCCTV className="w-3.5 h-3.5 text-blue-400" /> Tapo C200 Guide
          </button>

          <button
            onClick={() => setShowDhcpGuide(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:text-white rounded-lg text-xs transition font-medium"
            title="Lock camera IP on your Wi-Fi router so it never changes again"
          >
            <IconSettings className="w-3.5 h-3.5 text-purple-400" /> Lock Static IP
          </button>

          <button
            onClick={handleRecordAllToggle}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
              recordingAll
                ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                : 'bg-surface-2 border border-border text-text-secondary hover:text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${recordingAll ? 'bg-red-500 animate-ping' : 'bg-surface-4'}`} />
            {recordingAll ? 'Recording All' : 'Record All'}
          </button>

          <button
            onClick={handleSimulateMotionAlert}
            disabled={simulatingAlert || cameras.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border text-text-secondary hover:text-white rounded-lg text-xs transition disabled:opacity-50"
            title="Trigger a simulated motion alert to test banner and notifications"
          >
            <IconAlertTriangle className="w-3.5 h-3.5 text-yellow-400" /> Test Alert
          </button>

          <button
            onClick={refresh}
            className="p-2 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition"
            title="Refresh"
          >
            <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => handleAutoDiscover()}
            disabled={discovering}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white font-medium rounded-lg text-xs hover:bg-blue-500 transition shadow-sm"
            title="Auto-detect CCTV cameras connected to the local Wi-Fi router"
          >
            <IconRadar className={`w-4 h-4 ${discovering ? 'animate-spin' : ''}`} />
            {discovering ? 'Scanning...' : 'Auto-Detect CCTV'}
          </button>

          <button
            onClick={setupTapoC200QuickForm}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-black font-semibold rounded-lg text-xs hover:bg-white/90 transition shadow-sm"
          >
            <IconPlus className="w-4 h-4" /> Add Camera
          </button>
        </div>
      </div>

      {/* Auto-Rebind Status Notification */}
      {rebindStatus && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
          rebindStatus.success
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950/40 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-center gap-2.5 text-xs sm:text-sm">
            {rebindStatus.success ? (
              <IconCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <IconAlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <span>{rebindStatus.message}</span>
          </div>
          <button onClick={() => setRebindStatus(null)} className="text-text-muted hover:text-white p-1">
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Prominent Active Motion Detection Alert Banner (Figure 20) */}
      {alerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-950/40 via-surface-1 to-surface-1 border border-red-500/30 rounded-xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <IconAlertTriangle className="w-4 h-4 text-red-400" />
                Active Security Alerts ({alerts.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-red-400 uppercase tracking-widest">REAL-TIME MONITORING</span>
          </div>

          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.alert_id}
                className="flex items-center justify-between gap-3 p-3 bg-black/40 rounded-lg border border-red-500/20"
              >
                <div className="min-w-0">
                  <p className="text-white text-xs sm:text-sm font-medium">
                    {a.description || 'Motion detected by surveillance unit'}
                  </p>
                  <p className="text-text-muted text-[11px] mt-0.5">
                    Camera: <span className="text-white">{a.camera_name || 'Camera'}</span> &middot; Timestamp:{' '}
                    <span className="font-mono text-text-secondary">{a.timestamp}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleAcknowledge(a.alert_id)}
                  className="px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-lg hover:bg-white/90 transition flex-shrink-0"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tapo C200 Quick Guide Card */}
      {showTapoGuide && (
        <div className="bg-surface-1 border border-blue-500/30 rounded-xl p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium text-sm flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[11px] font-mono">Tapo C200</span>
              Setup & Connection Instructions
            </h3>
            <button onClick={() => setShowTapoGuide(false)} className="text-text-muted hover:text-white">
              <IconX className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-text-secondary">
            <div className="p-3 bg-surface-2 rounded-lg border border-border">
              <span className="font-semibold text-white block mb-1">1. Tapo Mobile App</span>
              Open Tapo App on your phone and select your Tapo C200 camera.
            </div>
            <div className="p-3 bg-surface-2 rounded-lg border border-border">
              <span className="font-semibold text-white block mb-1">2. Camera Account</span>
              Tap <span className="text-white">Settings</span> &gt; <span className="text-white">Advanced Settings</span> &gt; <span className="text-white">Camera Account</span>. Create a local username & password.
            </div>
            <div className="p-3 bg-surface-2 rounded-lg border border-border">
              <span className="font-semibold text-white block mb-1">3. Find Camera IP</span>
              Check <span className="text-white">Device Info</span> for your camera's local IP (e.g. <span className="font-mono text-white">192.168.1.xxx</span>).
            </div>
            <div className="p-3 bg-surface-2 rounded-lg border border-border">
              <span className="font-semibold text-white block mb-1">4. Add & Stream</span>
              Click <span className="text-white">Add Camera</span> below, enter IP & credentials, and click Start Stream.
            </div>
          </div>
        </div>
      )}

      {/* Camera Grid (Multi-Camera Display) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {cameras.map((cam) => (
          <div key={cam.camera_id} className="bg-surface-1 border border-border rounded-xl overflow-hidden shadow-sm">
            <CameraPlayer
              camera={cam}
              streaming={streamingCameras.has(cam.camera_id)}
              onStartStream={handleStartStream}
              onStopStream={handleStopStream}
            />
            <div className="p-3 sm:p-4">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="text-white font-medium text-xs sm:text-sm truncate">{cam.camera_name}</h3>
                  <p className="text-text-muted text-[11px] truncate">{cam.location || 'Day N Earth Lucero Premises'}</p>
                </div>
                <span
                  className={`flex items-center gap-1 text-[11px] font-medium ${
                    cam.status === 'active' ? 'text-green-400' : 'text-text-muted'
                  } flex-shrink-0`}
                >
                  {cam.status === 'active' ? <IconWifi className="w-3.5 h-3.5" /> : <IconWifiOff className="w-3.5 h-3.5" />}
                  {cam.status === 'active' ? 'Online' : cam.status}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-text-muted mb-3 flex-wrap font-mono">
                <span className="px-1.5 py-0.5 bg-surface-3 rounded uppercase">{cam.brand}</span>
                <span>{cam.ip_address}:{cam.port}</span>
                <span>/ {cam.stream_path || 'stream1'}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {streamingCameras.has(cam.camera_id) ? (
                  <button
                    onClick={() => handleStopStream(cam.camera_id)}
                    className="flex-1 min-w-[90px] py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition"
                  >
                    Stop Stream
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartStream(cam.camera_id)}
                    className="flex-1 min-w-[90px] py-2 bg-surface-2 border border-border text-text-secondary hover:text-white hover:border-border-hover rounded-lg text-xs font-medium transition"
                  >
                    Start Stream
                  </button>
                )}
                <button
                  onClick={() => handleTestConnection(cam.camera_id)}
                  className="py-2 px-3 bg-surface-2 border border-border text-text-secondary hover:text-white hover:border-border-hover rounded-lg text-xs transition"
                >
                  Test Connection
                </button>
                <button
                  onClick={() => handleAutoRebind(cam.camera_id)}
                  disabled={rebindingId === cam.camera_id}
                  className="py-2 px-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                  title="Camera IP changed after reboot or power off? Scan network and re-link to new IP"
                >
                  <IconRefresh className={`w-3.5 h-3.5 ${rebindingId === cam.camera_id ? 'animate-spin' : ''}`} />
                  <span>{rebindingId === cam.camera_id ? 'Re-linking...' : 'Auto-Fix IP'}</span>
                </button>
                <button
                  onClick={() => handleEditCamera(cam)}
                  className="p-2 bg-surface-2 border border-border text-text-secondary hover:text-white hover:border-border-hover rounded-lg text-xs transition"
                  title="Edit Camera Settings"
                >
                  <IconEdit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteCamera(cam.camera_id)}
                  className="p-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg text-xs transition"
                  title="Remove Camera from System"
                >
                  <IconTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {cameras.length === 0 && (
          <div className="col-span-full bg-surface-1 border border-border rounded-xl p-12 text-center">
            <IconCCTV className="w-10 h-10 text-surface-4 mx-auto mb-3" />
            <p className="text-white text-sm font-medium">No cameras configured yet</p>
            <p className="text-text-muted text-xs mt-1">Add your TP-Link Tapo C200 camera to begin live surveillance.</p>
            <button
              onClick={setupTapoC200QuickForm}
              className="mt-4 px-4 py-2 bg-white text-black font-semibold rounded-lg text-xs hover:bg-white/90 transition"
            >
              Configure Tapo C200
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Camera Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-surface-1 border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">{editingCamera ? 'Edit IP Camera Settings' : 'Add IP Camera (Tapo C200 / RTSP)'}</h3>
                <p className="text-text-muted text-xs mt-0.5">{editingCamera ? 'Update RTSP configuration parameters' : 'Configure RTSP stream parameters for live playback'}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1 text-text-muted hover:text-white">
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1 uppercase tracking-wider">Camera Name *</label>
                  <input
                    value={form.camera_name}
                    onChange={(e) => setForm({ ...form, camera_name: e.target.value })}
                    placeholder="CAM 1 - MAIN ENTRANCE (Tapo C200)"
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1 uppercase tracking-wider">Location</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Main Entrance / Gate"
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-text-secondary mb-1 uppercase tracking-wider">Brand Preset *</label>
                <select
                  value={form.brand}
                  onChange={(e) => {
                    const p = presets[e.target.value];
                    setForm({
                      ...form,
                      brand: e.target.value,
                      port: p?.defaultPort || 554,
                      stream_path: p?.streams?.high || 'stream1',
                    });
                  }}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs"
                >
                  <option value="tapo">TP-Link Tapo C200 / Series</option>
                  <option value="hikvision">Hikvision</option>
                  <option value="dahua">Dahua</option>
                  <option value="generic">Generic RTSP</option>
                </select>
                <p className="text-[10px] text-text-muted mt-1">
                  For Tapo C200: Use stream1 for 1080p, stream2 for lightweight 360p sub-stream.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1 uppercase tracking-wider">Camera Local IP *</label>
                  <input
                    value={form.ip_address}
                    onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                    placeholder="192.168.1.101"
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1 uppercase tracking-wider">RTSP Port</label>
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 554 })}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1 uppercase tracking-wider">Camera Account Username</label>
                  <input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="admin (created in Tapo App)"
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1 uppercase tracking-wider">Camera Account Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs"
                  />
                </div>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Generated RTSP Endpoint</p>
                <p className="text-[11px] text-text-secondary font-mono break-all">{generateRtspUrl()}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing || !form.ip_address}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-2 border border-border rounded-lg text-text-secondary hover:text-white text-xs transition disabled:opacity-50"
                >
                  {testing ? <IconLoader className="w-3.5 h-3.5 animate-spin" /> : <IconWifi className="w-3.5 h-3.5" />}
                  {testing ? 'Probing Camera...' : 'Test Connection'}
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-green-950/20 border-green-500/30 text-green-300'
                      : 'bg-red-950/20 border-red-500/30 text-red-300'
                  }`}
                >
                  {testResult.success ? <IconCheck className="w-4 h-4 flex-shrink-0" /> : <IconWifiOff className="w-4 h-4 flex-shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-text-secondary hover:text-white transition text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCamera}
                disabled={!form.camera_name || !form.ip_address}
                className="px-5 py-2 bg-white text-black font-semibold rounded-lg text-xs hover:bg-white/90 disabled:opacity-40 transition"
              >
                {editingCamera ? 'Update Camera' : 'Save Camera'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Discovery Radar Modal */}
      {showDiscoverModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface-1 border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
                  <IconRadar className={`w-6 h-6 ${discovering ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white">Auto-Detect CCTV on Wi-Fi</h2>
                  <p className="text-xs text-text-muted">
                    Scans local router subnet for TP-Link Tapo C200 &amp; ONVIF / RTSP cameras
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDiscoverModal(false)}
                className="p-2 text-text-muted hover:text-white hover:bg-surface-2 rounded-lg transition"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-5 flex-1">
              {/* Scanning Radar Animation / Status Banner */}
              {discovering ? (
                <div className="p-6 bg-surface-2 border border-blue-500/30 rounded-xl text-center space-y-3 relative overflow-hidden">
                  <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                    <span className="absolute inset-0 rounded-full border border-blue-500/40 animate-ping" />
                    <span className="absolute inset-2 rounded-full border border-blue-400/30 animate-pulse" />
                    <IconRadar className="w-8 h-8 text-blue-400 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Scanning Wi-Fi Network...</h3>
                    <p className="text-xs text-text-muted mt-1">
                      Sending ONVIF WS-Discovery probes and probing RTSP port 554 &amp; Tapo port 2020
                    </p>
                    {scannedSubnets.length > 0 && (
                      <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
                        {scannedSubnets.map((sub, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-mono rounded-full">
                            Subnet: {sub}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Scanned subnets badge */}
                  <div className="flex items-center justify-between text-xs bg-surface-2/60 border border-border p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-text-secondary">
                        Scanned: <span className="font-mono text-white">{scannedSubnets.join(', ') || 'Local Subnet'}</span>
                      </span>
                    </div>
                    <span className="text-text-muted">
                      {discoveredCameras.length} camera{discoveredCameras.length === 1 ? '' : 's'} detected
                    </span>
                  </div>

                  {/* Discovered Cameras Cards */}
                  {discoveredCameras.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Detected Cameras on Local Router
                      </h3>
                      {discoveredCameras.map((cam, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-surface-2 border border-blue-500/30 rounded-xl hover:border-blue-500/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 mt-0.5 flex-shrink-0">
                              <IconCCTV className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-white">{cam.name}</h4>
                                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono rounded">
                                  ONLINE
                                </span>
                              </div>
                              <p className="text-xs font-mono text-blue-300 mt-0.5">
                                IP: {cam.ip} &middot; Port: {cam.port || 554}
                              </p>
                              <p className="text-[11px] text-text-muted mt-1">
                                {cam.details || 'Ready for RTSP streaming'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSelectDiscoveredCamera(cam)}
                            className="px-4 py-2 bg-white text-black font-semibold rounded-lg text-xs hover:bg-white/90 transition shadow-sm flex items-center justify-center gap-1.5 flex-shrink-0"
                          >
                            <IconCheck className="w-3.5 h-3.5" /> 1-Click Setup
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-surface-2/40 border border-border rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium">
                        <IconAlertTriangle className="w-4 h-4" />
                        <span>No cameras responded on this router subnet</span>
                      </div>
                      <p className="text-xs text-text-muted">
                        If your Tapo C200 is connected to Wi-Fi, check the following:
                      </p>
                      <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
                        <li>
                          <strong className="text-white">LED Status:</strong> The Tapo C200 front LED should be <span className="text-emerald-400 font-semibold">solid green</span> (connected to router). If blinking amber, setup Wi-Fi in the Tapo mobile app first.
                        </li>
                        <li>
                          <strong className="text-white">Same Router / SSID:</strong> Ensure this PC and your Tapo C200 are connected to the same Wi-Fi router network.
                        </li>
                        <li>
                          <strong className="text-white">Camera Account:</strong> Tapo cameras require creating a local account in Tapo App &rarr; <em>Device Settings &rarr; Advanced Settings &rarr; Camera Account</em>.
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Direct Single IP Probe tool */}
                  <div className="p-4 bg-surface-2 border border-border rounded-xl space-y-3">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <IconSearch className="w-3.5 h-3.5 text-blue-400" /> Direct Camera IP Probe
                    </h4>
                    <p className="text-[11px] text-text-muted">
                      Already know your camera's IP from the Tapo app? (Check <em>Device Info</em> in Tapo app)
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={directIpInput}
                        onChange={(e) => setDirectIpInput(e.target.value)}
                        placeholder="e.g. 192.168.254.105 or 192.168.1.50"
                        className="flex-1 px-3 py-2 bg-surface-1 border border-border rounded-lg text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleProbeSingleIp(directIpInput)}
                        disabled={probingDirectIp || !directIpInput.trim()}
                        className="px-4 py-2 bg-surface-3 border border-border text-white text-xs rounded-lg hover:bg-surface-4 transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {probingDirectIp ? <IconLoader className="w-3.5 h-3.5 animate-spin" /> : <IconWifi className="w-3.5 h-3.5" />}
                        {probingDirectIp ? 'Probing...' : 'Check IP'}
                      </button>
                    </div>

                    {directIpResult && (
                      <div className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                        directIpResult.reachable
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-950/20 border-red-500/30 text-red-300'
                      }`}>
                        <div>
                          <p className="font-semibold">{directIpResult.reachable ? 'Camera Reachable!' : 'Unreachable'}</p>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            {directIpResult.reachable
                              ? `${directIpResult.name} found at ${directIpResult.ip} (Port ${directIpResult.port})`
                              : directIpResult.error}
                          </p>
                        </div>
                        {directIpResult.reachable && (
                          <button
                            onClick={() => handleSelectDiscoveredCamera(directIpResult)}
                            className="px-3 py-1.5 bg-white text-black font-semibold text-xs rounded hover:bg-white/90"
                          >
                            Use This IP
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Custom Subnet Scan Tool */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted flex-shrink-0">Quick Subnets:</span>
                    {['192.168.254', '192.168.1', '192.168.0'].map((sub) => (
                      <button
                        key={sub}
                        onClick={() => handleAutoDiscover(sub)}
                        className="px-2.5 py-1 bg-surface-2 border border-border hover:border-blue-400 hover:text-white rounded text-[11px] font-mono transition text-text-secondary"
                      >
                        {sub}.0/24
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-border flex items-center justify-between">
              <button
                onClick={() => handleAutoDiscover()}
                disabled={discovering}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <IconRefresh className={`w-3.5 h-3.5 ${discovering ? 'animate-spin' : ''}`} />
                {discovering ? 'Scanning...' : 'Rescan Network'}
              </button>
              <button
                onClick={() => setShowDiscoverModal(false)}
                className="px-4 py-2 bg-surface-2 border border-border text-text-secondary hover:text-white rounded-lg text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DHCP Static IP Reservation Guide Modal */}
      {showDhcpGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-surface-1 border border-border rounded-xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <IconSettings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm sm:text-base">Lock Camera IP Address (Static Lease)</h3>
                  <p className="text-text-muted text-[11px]">Prevent your Wi-Fi router from changing the Tapo C200 IP after reboots</p>
                </div>
              </div>
              <button onClick={() => setShowDhcpGuide(false)} className="text-text-muted hover:text-white p-1">
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 text-xs text-text-secondary">
              {/* Quick Info Box */}
              <div className="p-4 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-3">
                <p className="text-purple-200 font-medium">
                  Why does the IP change?
                </p>
                <p className="text-purple-300/80 leading-relaxed text-[11px]">
                  When the camera is unplugged or reboots, your Wi-Fi router’s DHCP server assigns it a dynamic IP.
                  By reserving the camera’s <strong>MAC Address</strong> in your router, the router will <strong>ALWAYS</strong> assign the exact same IP address forever.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                    <span className="text-[10px] text-text-muted block uppercase tracking-wider">Camera MAC Address</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-white text-xs font-semibold">10:5a:95:5c:7f:0d</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('10:5a:95:5c:7f:0d');
                          setCopiedMac(true);
                          setTimeout(() => setCopiedMac(false), 2000);
                        }}
                        className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] transition"
                      >
                        {copiedMac ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                    <span className="text-[10px] text-text-muted block uppercase tracking-wider">Router Gateway</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-white text-xs font-semibold">192.168.254.254</span>
                      <a
                        href="http://192.168.254.254"
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded text-[10px] transition"
                      >
                        Open
                      </a>
                    </div>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                    <span className="text-[10px] text-text-muted block uppercase tracking-wider">Recommended Static IP</span>
                    <span className="font-mono text-green-400 text-xs font-semibold block mt-1">192.168.254.123</span>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-3">
                <h4 className="text-white font-medium text-xs uppercase tracking-wider">3-Step Permanent Router Setup:</h4>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">1</span>
                    <div>
                      <span className="font-semibold text-white block">Log in to your Router Admin Page</span>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Open <a href="http://192.168.254.254" target="_blank" rel="noreferrer" className="text-blue-400 underline font-medium">http://192.168.254.254</a> in your browser (Globe At Home / PLDT / TP-Link). Login details are on the sticker under the modem.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">2</span>
                    <div>
                      <span className="font-semibold text-white block">Locate DHCP Static Lease / Binding</span>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Navigate to <strong>Network</strong> or <strong>Advanced</strong> &gt; <strong>LAN</strong> &gt; <strong>DHCP Static IP</strong> (or <em>IP & MAC Binding</em> / <em>Address Reservation</em>).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">3</span>
                    <div>
                      <span className="font-semibold text-white block">Add Static Binding & Save</span>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Enter MAC: <code className="text-white bg-surface-3 px-1.5 py-0.5 rounded font-mono">10:5a:95:5c:7f:0d</code> and IP: <code className="text-white bg-surface-3 px-1.5 py-0.5 rounded font-mono">192.168.254.123</code>. Click <strong>Apply / Save</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Software Auto-Fix feature explanation */}
              <div className="p-3.5 bg-surface-2 rounded-xl border border-border flex items-center justify-between gap-3">
                <div>
                  <span className="text-white font-medium block">Prefer not to change router settings?</span>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Whenever the camera is unplugged or restarted, simply click <strong>Auto-Fix IP</strong> on the camera card. BoardersWatch scans the router and re-links to the new IP in 2 seconds automatically!
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-border flex items-center justify-end">
              <button
                onClick={() => setShowDhcpGuide(false)}
                className="px-4 py-2 bg-white text-black font-semibold rounded-lg text-xs hover:bg-white/90 transition"
              >
                Got It, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}