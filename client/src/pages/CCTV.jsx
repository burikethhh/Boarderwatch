import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { IconPlus, IconCCTV, IconWifi, IconWifiOff, IconAlertTriangle, IconSettings, IconRefresh, IconLoader, IconX } from '../components/Icons';

function CameraPlayer({ camera, onStartStream, onStopStream, streaming }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    if (!streaming || !videoRef.current) return;

    let Hls;
    const initPlayer = async () => {
      Hls = (await import('hls.js')).default;
      const src = `/api/stream/${camera.camera_id}`;
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current.play().catch(() => {});
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = src;
        videoRef.current.play().catch(() => {});
      }
    };
    initPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streaming, camera.camera_id]);

  return (
    <div className="aspect-video bg-black relative overflow-hidden">
      {streaming ? (
        <video ref={videoRef} className="w-full h-full object-contain" muted autoPlay playsInline />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <IconCCTV className="w-12 h-12 text-surface-4" />
        </div>
      )}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-2">
        <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium uppercase tracking-wider ${streaming ? 'bg-green-500/90 text-white' : camera.status === 'active' ? 'bg-white text-black' : 'bg-surface-3 text-text-muted'}`}>
          {streaming ? 'LIVE' : camera.status === 'active' ? 'READY' : camera.status}
        </span>
        {streaming && (
          <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-black/60 text-white text-[9px] sm:text-[10px] rounded font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {new Date().toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
        <span className="px-1.5 sm:px-2 py-0.5 bg-black/60 text-white text-[10px] sm:text-[11px] rounded">
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
  const [presets, setPresets] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [streamingCameras, setStreamingCameras] = useState(new Set());
  const [form, setForm] = useState({ camera_name: '', location: '', brand: 'tapo', ip_address: '', username: '', password: '', port: 554, stream_path: '/stream1', motion_detection: 1, alert_threshold: 'medium' });

  const fetchData = useCallback(async () => {
    const [c, p, a] = await Promise.all([
      api.get('/cameras'),
      api.get('/cameras/presets'),
      api.get('/notifications/alerts?acknowledged=0'),
    ]);
    setCameras(c.data);
    setPresets(p.data);
    setAlerts(a.data);
  }, []);

  const { loading, lastUpdated, refresh } = usePolling(fetchData, 5000);

  const handleStartStream = async (camId) => {
    try {
      await api.post(`/cameras/${camId}/stream/start`);
      setStreamingCameras(prev => new Set(prev).add(camId));
    } catch (err) {
      console.error('Start stream failed:', err);
    }
  };

  const handleStopStream = async (camId) => {
    try {
      await api.post(`/cameras/${camId}/stream/stop`);
      setStreamingCameras(prev => { const next = new Set(prev); next.delete(camId); return next; });
    } catch (err) {
      console.error('Stop stream failed:', err);
    }
  };

  const handleTestConnection = async (camId) => {
    try {
      await api.post(`/cameras/${camId}/test`);
      refresh();
    } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/cameras', form);
    setShowForm(false);
    setForm({ camera_name: '', location: '', brand: 'tapo', ip_address: '', username: '', password: '', port: 554, stream_path: '/stream1', motion_detection: 1, alert_threshold: 'medium' });
    refresh();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/settings/test-camera', form);
      setTestResult(res.data);
    } catch {
      setTestResult({ success: false, message: 'Connection test failed' });
    }
    setTesting(false);
  };

  const handleAcknowledge = async (id) => {
    await api.put(`/notifications/alerts/${id}/acknowledge`);
    refresh();
  };

  const generateRtspUrl = () => {
    const preset = presets[form.brand] || presets.generic;
    if (!preset) return '';
    return preset.rtspFormat
      .replace('{user}', form.username || 'user')
      .replace('{pass}', form.password || 'pass')
      .replace('{ip}', form.ip_address || 'IP')
      .replace('{port}', form.port)
      .replace('{stream}', form.stream_path)
      .replace('{streamPath}', form.stream_path);
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">CCTV Monitoring</h1>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">{cameras.length} cameras &middot; {alerts.length} active alerts</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {lastUpdated && (
            <span className="text-[10px] sm:text-[11px] text-text-muted whitespace-nowrap">Live &middot; {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button onClick={refresh} className="p-1.5 sm:p-2 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition flex-shrink-0">
            <IconRefresh className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setForm({ camera_name: '', location: '', brand: 'tapo', ip_address: '', username: '', password: '', port: 554, stream_path: '/stream1', motion_detection: 1, alert_threshold: 'medium' }); setTestResult(null); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-white text-black font-medium rounded-lg text-xs sm:text-sm hover:bg-white/90 transition whitespace-nowrap flex-shrink-0">
            <IconPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Add Camera
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <IconAlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <h3 className="text-white font-medium text-xs sm:text-sm">Active Alerts ({alerts.length})</h3>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            {alerts.slice(0, 3).map(a => (
              <div key={a.alert_id} className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-surface-2 rounded-lg border border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs sm:text-sm truncate">{a.camera_name || 'Unknown'}</p>
                  <p className="text-text-muted text-[10px] sm:text-[11px] truncate">{a.description} &middot; {a.timestamp}</p>
                </div>
                <button onClick={() => handleAcknowledge(a.alert_id)} className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white text-black text-[10px] sm:text-xs font-medium rounded-lg hover:bg-white/90 transition flex-shrink-0">Ack</button>
              </div>
            ))}
            {alerts.length > 3 && (
              <p className="text-text-muted text-[11px] text-center pt-1">+{alerts.length - 3} more alerts</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        {cameras.map(cam => (
          <div key={cam.camera_id} className="bg-surface-1 border border-border rounded-xl overflow-hidden">
            <CameraPlayer camera={cam} streaming={streamingCameras.has(cam.camera_id)} onStartStream={handleStartStream} onStopStream={handleStopStream} />
            <div className="p-3 sm:p-4">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="text-white font-medium text-xs sm:text-sm truncate">{cam.camera_name}</h3>
                  <p className="text-text-muted text-[10px] sm:text-[11px] truncate">{cam.location || 'No location'}</p>
                </div>
                <span className={`flex items-center gap-1 text-[10px] sm:text-[11px] ${cam.status === 'active' ? 'text-white' : 'text-text-muted'} flex-shrink-0`}>
                  {cam.status === 'active' ? <IconWifi className="w-3 h-3" /> : <IconWifiOff className="w-3 h-3" />}
                  {cam.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-text-muted mb-3 flex-wrap">
                <span className="capitalize">{cam.brand}</span>
                <span className="text-border">|</span>
                <span>{cam.ip_address}:{cam.port}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {streamingCameras.has(cam.camera_id) ? (
                  <button onClick={() => handleStopStream(cam.camera_id)} className="flex-1 min-w-[80px] py-1.5 sm:py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-[11px] sm:text-[13px] font-medium hover:bg-red-500/30 transition">
                    Stop Stream
                  </button>
                ) : (
                  <button onClick={() => handleStartStream(cam.camera_id)} className="flex-1 min-w-[80px] py-1.5 sm:py-2 bg-surface-2 border border-border text-text-secondary hover:text-white hover:border-border-hover rounded-lg text-[11px] sm:text-[13px] transition">
                    Start Stream
                  </button>
                )}
                <button onClick={() => handleTestConnection(cam.camera_id)} className="py-1.5 sm:py-2 px-2.5 sm:px-3 bg-surface-2 border border-border text-text-secondary hover:text-white hover:border-border-hover rounded-lg text-[11px] sm:text-[13px] transition">
                  Test
                </button>
              </div>
            </div>
          </div>
        ))}

        {cameras.length === 0 && (
          <div className="col-span-full bg-surface-1 border border-border rounded-xl p-10 sm:p-16 text-center">
            <IconCCTV className="w-8 h-8 sm:w-10 sm:h-10 text-surface-4 mx-auto mb-3" />
            <p className="text-text-muted text-sm">No cameras configured</p>
            <p className="text-text-muted/50 text-[11px] mt-1">Click "Add Camera" to get started</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-surface-1 border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-0" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-medium text-white">Add Camera</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-text-muted hover:text-white"><IconX className="w-4 h-4" /></button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div>
                <p className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-widest mb-2 sm:mb-3">Camera Identity</p>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                  <div><label className="block text-[11px] sm:text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Name *</label><input value={form.camera_name} onChange={e => setForm({...form, camera_name: e.target.value})} placeholder="CAM 1 - MAIN ENTRANCE" className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 bg-surface-2 border border-border rounded-lg text-white text-xs sm:text-sm placeholder-text-muted/50" /></div>
                  <div><label className="block text-[11px] sm:text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Location</label><input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Front Door" className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 bg-surface-2 border border-border rounded-lg text-white text-xs sm:text-sm placeholder-text-muted/50" /></div>
                </div>
              </div>

              <div>
                <p className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-widest mb-2 sm:mb-3">Network</p>
                <div className="space-y-3 sm:space-y-4">
                  <div><label className="block text-[11px] sm:text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Brand *</label><select value={form.brand} onChange={e => { const p = presets[e.target.value]; setForm({...form, brand: e.target.value, port: p?.defaultPort || 554, stream_path: p?.streams?.high || '/stream1'}); }} className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 bg-surface-2 border border-border rounded-lg text-white text-xs sm:text-sm">{Object.entries(presets).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}<option value="generic">Generic RTSP</option></select></div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                    <div><label className="block text-[11px] sm:text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">IP Address *</label><input value={form.ip_address} onChange={e => setForm({...form, ip_address: e.target.value})} placeholder="192.168.1.101" className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 bg-surface-2 border border-border rounded-lg text-white text-xs sm:text-sm placeholder-text-muted/50" /></div>
                    <div><label className="block text-[11px] sm:text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Port</label><input type="number" value={form.port} onChange={e => setForm({...form, port: parseInt(e.target.value)})} className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 bg-surface-2 border border-border rounded-lg text-white text-xs sm:text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                    <div><label className="block text-[11px] sm:text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Username</label><input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 bg-surface-2 border border-border rounded-lg text-white text-xs sm:text-sm" /></div>
                    <div><label className="block text-[11px] sm:text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Password</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 bg-surface-2 border border-border rounded-lg text-white text-xs sm:text-sm" /></div>
                  </div>
                  <div><label className="block text-[11px] sm:text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Stream Path</label><input value={form.stream_path} onChange={e => setForm({...form, stream_path: e.target.value})} className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 bg-surface-2 border border-border rounded-lg text-white text-xs sm:text-sm" /></div>
                </div>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-2.5 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-widest mb-1">RTSP URL</p>
                <p className="text-[10px] sm:text-[11px] text-text-secondary font-mono break-all leading-relaxed">{generateRtspUrl()}</p>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button type="button" onClick={handleTest} disabled={testing || !form.ip_address} className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-surface-2 border border-border rounded-lg text-text-secondary hover:text-white text-xs sm:text-sm transition disabled:opacity-50">
                  {testing ? <IconLoader className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <IconWifi className="w-3 h-3 sm:w-4 sm:h-4" />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {testResult && (
                <div className={`p-2.5 sm:p-3 rounded-lg border text-xs sm:text-sm flex items-center gap-2 ${testResult.success ? 'bg-white/5 border-white/20 text-white' : 'bg-white/5 border-white/10 text-text-secondary'}`}>
                  {testResult.success ? <IconWifi className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" /> : <IconWifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />}
                  {testResult.message}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-border flex justify-end gap-2 sm:gap-3">
              <button onClick={() => setShowForm(false)} className="px-3 py-2 sm:px-4 sm:py-2.5 text-text-secondary hover:text-white transition text-xs sm:text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={!form.camera_name || !form.ip_address} className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white text-black font-medium rounded-lg text-xs sm:text-sm hover:bg-white/90 disabled:opacity-40">Add Camera</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}