import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { IconPlus, IconCCTV, IconWifi, IconWifiOff, IconAlertTriangle, IconSettings, IconRefresh, IconLoader } from '../components/Icons';

export default function CCTV() {
  const [cameras, setCameras] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [presets, setPresets] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">CCTV Monitoring</h1>
          <p className="text-text-muted text-sm mt-1">{cameras.length} cameras - {alerts.length} active alerts</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-text-muted">Live - {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button onClick={refresh} className="p-2 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition">
            <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setForm({ camera_name: '', location: '', brand: 'tapo', ip_address: '', username: '', password: '', port: 554, stream_path: '/stream1', motion_detection: 1, alert_threshold: 'medium' }); setTestResult(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-white/90 transition">
            <IconPlus className="w-4 h-4" /> Add Camera
          </button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <IconAlertTriangle className="w-4 h-4 text-white" />
            <h3 className="text-white font-medium text-sm">Active Alerts ({alerts.length})</h3>
          </div>
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.alert_id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg border border-border">
                <div>
                  <p className="text-white text-sm">{a.camera_name || 'Unknown'}</p>
                  <p className="text-text-muted text-[11px] mt-0.5">{a.description} - {a.timestamp}</p>
                </div>
                <button onClick={() => handleAcknowledge(a.alert_id)} className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 transition">Acknowledge</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cameras.map(cam => (
          <div key={cam.camera_id} className="bg-surface-1 border border-border rounded-xl overflow-hidden">
            <div className="aspect-video bg-surface-0 flex items-center justify-center relative">
              <IconCCTV className="w-10 h-10 text-surface-4" />
              <div className="absolute top-3 left-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${cam.status === 'active' ? 'bg-white text-black' : 'bg-surface-3 text-text-muted'}`}>
                  {cam.status === 'active' ? 'LIVE' : cam.status}
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 bg-black/60 text-white text-[10px] rounded font-mono">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div className="absolute bottom-3 left-3">
                <span className="px-2 py-0.5 bg-black/60 text-white text-[11px] rounded">
                  {cam.camera_name}
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-white font-medium text-sm">{cam.camera_name}</h3>
                  <p className="text-text-muted text-[11px] mt-0.5">{cam.location || 'No location'}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-[11px] ${cam.status === 'active' ? 'text-white' : 'text-text-muted'}`}>
                  {cam.status === 'active' ? <IconWifi className="w-3 h-3" /> : <IconWifiOff className="w-3 h-3" />}
                  {cam.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-text-muted mb-4">
                <span>{cam.brand}</span>
                <span className="text-border">|</span>
                <span>{cam.ip_address}:{cam.port}</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-surface-2 border border-border rounded-lg text-text-secondary hover:text-white hover:border-border-hover text-[13px] transition">Test</button>
                <button className="py-2 px-3 bg-surface-2 border border-border rounded-lg text-text-secondary hover:text-white hover:border-border-hover transition"><IconSettings className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}

        {cameras.length === 0 && (
          <div className="col-span-full bg-surface-1 border border-border rounded-xl p-16 text-center">
            <IconCCTV className="w-10 h-10 text-surface-4 mx-auto mb-3" />
            <p className="text-text-muted text-sm">No cameras configured</p>
            <p className="text-text-muted/50 text-[11px] mt-1">Click "Add Camera" to get started</p>
          </div>
        )}
      </div>

      {/* Add Camera Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-surface-1 border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-medium text-white">Add Camera</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-text-muted hover:text-white"><IconSettings className="w-4 h-4" /></button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-3">Camera Identity</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Name *</label><input value={form.camera_name} onChange={e => setForm({...form, camera_name: e.target.value})} placeholder="CAM 1 - MAIN ENTRANCE" className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm placeholder-text-muted/50" /></div>
                  <div><label className="block text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Location</label><input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Front Door" className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm placeholder-text-muted/50" /></div>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-3">Network</p>
                <div className="space-y-4">
                  <div><label className="block text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Brand *</label><select value={form.brand} onChange={e => { const p = presets[e.target.value]; setForm({...form, brand: e.target.value, port: p?.defaultPort || 554, stream_path: p?.streams?.high || '/stream1'}); }} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm">{Object.entries(presets).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}<option value="generic">Generic RTSP</option></select></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">IP Address *</label><input value={form.ip_address} onChange={e => setForm({...form, ip_address: e.target.value})} placeholder="192.168.1.101" className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm placeholder-text-muted/50" /></div>
                    <div><label className="block text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Port</label><input type="number" value={form.port} onChange={e => setForm({...form, port: parseInt(e.target.value)})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Username</label><input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" /></div>
                    <div><label className="block text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Password</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" /></div>
                  </div>
                  <div><label className="block text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase">Stream Path</label><input value={form.stream_path} onChange={e => setForm({...form, stream_path: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" /></div>
                </div>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5">RTSP URL</p>
                <p className="text-[11px] text-text-secondary font-mono break-all leading-relaxed">{generateRtspUrl()}</p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={handleTest} disabled={testing || !form.ip_address} className="flex items-center gap-2 px-4 py-2.5 bg-surface-2 border border-border rounded-lg text-text-secondary hover:text-white text-sm transition disabled:opacity-50">
                  {testing ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconWifi className="w-4 h-4" />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${testResult.success ? 'bg-white/5 border-white/20 text-white' : 'bg-white/5 border-white/10 text-text-secondary'}`}>
                  {testResult.success ? <IconWifi className="w-4 h-4 flex-shrink-0" /> : <IconWifiOff className="w-4 h-4 flex-shrink-0" />}
                  {testResult.message}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-text-secondary hover:text-white transition text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={!form.camera_name || !form.ip_address} className="px-5 py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-white/90 disabled:opacity-40">Add Camera</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
