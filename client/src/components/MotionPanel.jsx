import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  IconCCTV, IconAlertTriangle, IconLoader, IconEye, IconRefresh,
  IconCheck, IconX
} from './Icons';

/**
 * Motion Detection, AI Tracking, PTZ and Night-Vision control panel.
 * Operates on the selected camera and reads live motion state from the server.
 */
export default function MotionPanel({ cameras = [], motionStates = {} }) {
  const [selected, setSelected] = useState(cameras[0]?.camera_id || null);
  const [clips, setClips] = useState([]);
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const camera = cameras.find(c => c.camera_id === selected) || cameras[0];
  const motion = motionStates[camera?.camera_id] || {};

  useEffect(() => {
    if (!selected && cameras[0]) setSelected(cameras[0].camera_id);
  }, [cameras, selected]);

  const loadClips = useCallback(async () => {
    if (!camera) return;
    try {
      const res = await api.get(`/cameras/${camera.camera_id}/clips`);
      setClips(res.data || []);
    } catch {}
  }, [camera]);

  const loadPresets = useCallback(async () => {
    if (!camera) return;
    try {
      const res = await api.get(`/cameras/${camera.camera_id}/ptz/presets`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.value || []);
      setPresets(list);
    } catch { setPresets([]); }
  }, [camera]);

  useEffect(() => { loadClips(); loadPresets(); }, [loadClips, loadPresets]);

  const savePreset = () => act('savepreset', async () => {
    if (!presetName.trim()) return;
    try {
      await api.post(`/cameras/${camera.camera_id}/ptz/presets`, { name: presetName.trim() });
      setPresetName('');
      flash(true, 'Position saved');
      loadPresets();
    } catch (e) { flash(false, e.response?.data?.error || 'Could not save preset'); }
  });

  const gotoPreset = (token) => act(`goto-${token}`, async () => {
    try {
      await api.post(`/cameras/${camera.camera_id}/ptz/presets/goto`, { id: token });
      flash(true, 'Moved to preset');
    } catch (e) { flash(false, e.response?.data?.error || 'Could not move to preset'); }
  });

  const flash = (ok, text) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const act = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch (e) {
      flash(false, e.response?.data?.error || e.message);
    } finally { setBusy(null); }
  };

  const setSensitivity = (value) => act('sens', async () => {
    await api.put(`/cameras/${camera.camera_id}/motion/settings`, { motion_sensitivity: Number(value) });
  });

  const toggleDetection = () => act('det', async () => {
    await api.put(`/cameras/${camera.camera_id}/motion/settings`, { motion_detection: camera.motion_detection ? 0 : 1 });
    window.location.reload();
  });

  const toggleTracking = () => act('track', async () => {
    const res = await api.put(`/cameras/${camera.camera_id}/tracking`, { enabled: !camera.motion_tracking });
    flash(true, res.data.motion_tracking ? 'Auto-follow enabled' : 'Auto-follow disabled');
  });

  const ptz = (x, y) => act(`ptz${x}${y}`, async () => {
    try {
      await api.post(`/cameras/${camera.camera_id}/ptz/move`, { x, y, duration: 400 });
      flash(true, 'Camera moved');
    } catch (e) { flash(false, e.response?.data?.error || 'PTZ unavailable'); }
  });

  const ptzStop = () => act('ptzstop', async () => {
    try { await api.post(`/cameras/${camera.camera_id}/ptz/stop`); } catch (e) { flash(false, e.response?.data?.error); }
  });

  const calibrate = () => act('calib', async () => {
    try { await api.post(`/cameras/${camera.camera_id}/ptz/calibrate`); flash(true, 'Calibrating PTZ...'); }
    catch (e) { flash(false, e.response?.data?.error || 'PTZ unavailable'); }
  });

  const night = (mode) => act(`night-${mode}`, async () => {
    try {
      const res = await api.put(`/cameras/${camera.camera_id}/night-vision`, { mode });
      if (res.data.supported === false) {
        flash(true, 'Night vision is automatic on this camera (hardware IR) — mode set to ' + mode);
      } else {
        flash(true, `Night vision: ${mode}`);
      }
    } catch (e) { flash(false, e.response?.data?.error || 'Night vision control unavailable'); }
  });

  const record = () => act('rec', async () => {
    const res = await api.post(`/cameras/${camera.camera_id}/clips`, { seconds: 8 });
    if (res.data.success) { flash(true, 'Evidence clip recorded'); loadClips(); }
    else flash(false, 'Could not record clip');
  });

  if (!camera) return null;

  const moving = !!motion.motion;
  const detOn = !!camera.motion_detection;
  const trackOn = !!camera.motion_tracking;
  const sens = Number(camera.motion_sensitivity || 1.5);

  const PadBtn = ({ x, y, children, label }) => (
    <button
      onClick={() => ptz(x, y)}
      disabled={!!busy}
      title={label}
      className="w-10 h-10 flex items-center justify-center bg-surface-2 border border-border rounded-lg text-text-secondary hover:text-white hover:border-white/30 transition disabled:opacity-40"
    >
      {children}
    </button>
  );

  return (
    <div className="bg-surface-1 border border-border rounded-xl p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-semibold text-sm sm:text-base flex items-center gap-2">
            <IconCCTV className="w-4 h-4 text-emerald-400" /> Motion Detection &amp; AI Tracking
          </h2>
          <p className="text-text-muted text-[12px] mt-0.5">
            {camera.camera_name} · live server-side motion analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cameras.length > 1 && (
            <select
              value={camera.camera_id}
              onChange={(e) => setSelected(Number(e.target.value))}
              className="px-3 py-1.5 bg-surface-2 border border-border rounded-lg text-white text-xs"
            >
              {cameras.map(c => <option key={c.camera_id} value={c.camera_id}>{c.camera_name}</option>)}
            </select>
          )}
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
            moving ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-surface-2 text-text-muted border border-border'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${moving ? 'bg-emerald-400 animate-ping' : 'bg-surface-4'}`} />
            {moving ? `MOTION ${motion.pct ?? 0}%` : 'NO MOTION'}
          </span>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg border text-xs ${msg.ok ? 'bg-green-950/20 border-green-500/30 text-green-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Detection settings */}
        <div className="space-y-4">
          <h3 className="text-white text-xs font-semibold uppercase tracking-wider">Detection</h3>
          <label className="flex items-center justify-between p-3 bg-surface-2 border border-border rounded-lg cursor-pointer">
            <span className="text-white text-sm">Motion Detection</span>
            <input type="checkbox" checked={detOn} onChange={toggleDetection} className="w-4 h-4 accent-white" />
          </label>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] text-text-secondary uppercase tracking-wider font-medium">Sensitivity</label>
              <span className="text-white text-xs font-mono">{sens.toFixed(1)}%</span>
            </div>
            <input
              type="range" min="0.3" max="6" step="0.1" defaultValue={sens}
              onMouseUp={(e) => setSensitivity(e.target.value)}
              onTouchEnd={(e) => setSensitivity(e.target.value)}
              className="w-full accent-emerald-400"
            />
            <p className="text-[10px] text-text-muted mt-1">Lower = more sensitive (triggers on smaller movement)</p>
          </div>
          <label className="flex items-center justify-between p-3 bg-surface-2 border border-border rounded-lg cursor-pointer">
            <div>
              <p className="text-white text-sm">Auto-Follow Motion</p>
              <p className="text-text-muted text-[10px]">Pan/tilt camera toward movement</p>
            </div>
            <input type="checkbox" checked={trackOn} onChange={toggleTracking} className="w-4 h-4 accent-white" />
          </label>
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <IconEye className="w-3.5 h-3.5" />
            Centroid: {motion.cx != null ? `${Math.round(motion.cx * 100)}%, ${Math.round((motion.cy || 0) * 100)}%` : '—'}
          </div>
        </div>

        {/* PTZ + night vision */}
        <div className="space-y-4">
          <h3 className="text-white text-xs font-semibold uppercase tracking-wider">Pan / Tilt / Night Vision</h3>
          <div className="flex flex-col items-center gap-1.5">
            <PadBtn x={0} y={1} label="Tilt up">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </PadBtn>
            <div className="flex gap-1.5">
              <PadBtn x={-1} y={0} label="Pan left">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              </PadBtn>
              <button onClick={ptzStop} className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-lg font-bold text-[10px]" title="Stop">■</button>
              <PadBtn x={1} y={0} label="Pan right">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </PadBtn>
            </div>
            <PadBtn x={0} y={-1} label="Tilt down">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
            </PadBtn>
          </div>
          <button
            onClick={calibrate}
            disabled={!!busy}
            className="w-full py-2 bg-surface-2 border border-border rounded-lg text-text-secondary hover:text-white text-xs transition disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <IconRefresh className={`w-3.5 h-3.5 ${busy === 'calib' ? 'animate-spin' : ''}`} /> Recalibrate PTZ
          </button>

          <div>
            <p className="text-[12px] text-text-secondary uppercase tracking-wider font-medium mb-1.5">Night Vision</p>
            <div className="flex gap-2">
              {['auto', 'on', 'off'].map(m => (
                <button
                  key={m}
                  onClick={() => night(m)}
                  disabled={!!busy}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition border ${
                    (camera.night_vision || 'auto') === m
                      ? 'bg-white text-black border-white'
                      : 'bg-surface-2 border-border text-text-secondary hover:text-white'
                  }`}
                >
                  {m === 'auto' ? 'Auto' : m === 'on' ? 'IR On' : 'Off'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-text-muted mt-1">Auto uses the camera's IR sensor in low light (hardware)</p>
          </div>

          <div>
            <p className="text-[12px] text-text-secondary uppercase tracking-wider font-medium mb-1.5">Camera Presets</p>
            <div className="flex gap-2 mb-2">
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g. Main Gate"
                className="flex-1 px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs"
              />
              <button
                onClick={savePreset}
                disabled={!!busy || !presetName.trim()}
                className="px-3 py-2 bg-white text-black rounded-lg text-xs font-semibold hover:bg-white/90 transition disabled:opacity-40"
              >
                Save
              </button>
            </div>
            <div className="space-y-2">
              {presets.length === 0 && <p className="text-text-muted text-[11px]">No presets saved. Aim the camera and save a position.</p>}
              {presets.map(p => (
                <button
                  key={p.token}
                  onClick={() => gotoPreset(p.token)}
                  disabled={!!busy}
                  className="w-full flex items-center justify-between gap-2 p-2.5 bg-surface-2 border border-border rounded-lg hover:border-white/30 transition disabled:opacity-40"
                >
                  <span className="text-white text-xs truncate">{p.name}</span>
                  <span className="text-blue-400 text-[10px] font-medium flex-shrink-0">Go ▶</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Evidence clips */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-xs font-semibold uppercase tracking-wider">Evidence Clips</h3>
            <button
              onClick={record}
              disabled={!!busy}
              className="px-2.5 py-1.5 bg-white text-black rounded-lg text-[11px] font-semibold hover:bg-white/90 transition disabled:opacity-40 flex items-center gap-1"
            >
              {busy === 'rec' ? <IconLoader className="w-3 h-3 animate-spin" /> : null} Record
            </button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {clips.length === 0 && <p className="text-text-muted text-[11px]">No clips yet. Motion events auto-record an 8s clip.</p>}
            {clips.map(c => (
              <a
                key={c.file}
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 p-2.5 bg-surface-2 border border-border rounded-lg hover:border-white/30 transition"
              >
                <div className="min-w-0">
                  <p className="text-white text-[11px] truncate font-mono">{c.file.replace('.mp4', '')}</p>
                  <p className="text-text-muted text-[10px]">{(c.size / 1024 / 1024).toFixed(1)} MB · {new Date(c.created).toLocaleTimeString()}</p>
                </div>
                <span className="text-blue-400 text-[10px] font-medium flex-shrink-0">Play ▶</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
