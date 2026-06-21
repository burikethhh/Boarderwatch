import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  IconSettings, IconCCTV, IconRooms, IconBell, IconCheck,
  IconX, IconPlus, IconTrash, IconEdit, IconLoader, IconWifi, IconWifiOff
} from '../components/Icons';

// ========== TAB BUTTON ==========
function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition whitespace-nowrap ${
        active ? 'bg-white text-black' : 'text-text-secondary hover:text-white hover:bg-surface-3'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ========== FIELD ==========
function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-[12px] text-text-secondary mb-1.5 tracking-wider uppercase font-medium">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-text-muted mt-1">{hint}</p>}
    </div>
  );
}

function Input({ className = '', ...props }) {
  return <input {...props} className={`w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm placeholder-text-muted/50 focus:border-white/20 transition ${className}`} />;
}

function Select({ className = '', children, ...props }) {
  return <select {...props} className={`w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm focus:border-white/20 transition ${className}`}>{children}</select>;
}

function Btn({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-white text-black hover:bg-white/90',
    secondary: 'bg-surface-2 border border-border text-text-secondary hover:text-white hover:border-border-hover',
    danger: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
  };
  return (
    <button {...props} className={`px-4 py-2.5 rounded-lg text-[13px] font-medium transition flex items-center gap-2 ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

// ========== TAB 1: GENERAL ==========
function GeneralTab({ settings, onSave }) {
  const [form, setForm] = useState({
    boarding_house_name: settings.boarding_house_name || 'Day N Earth Lucero Boarding House',
    address: settings.address || 'Tacurong City, Sultan Kudarat',
    contact_phone: settings.contact_phone || '',
    contact_email: settings.contact_email || '',
    owner_name: settings.owner_name || '',
    monthly_due_day: settings.monthly_due_day || '1',
    late_fee_percentage: settings.late_fee_percentage || '5',
    auto_lease_expiry: settings.auto_lease_expiry || '30',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-white mb-1">Boarding House Information</h3>
        <p className="text-text-muted text-[13px]">Basic details about your boarding house</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Boarding House Name">
          <Input value={form.boarding_house_name} onChange={e => setForm({...form, boarding_house_name: e.target.value})} />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
        </Field>
        <Field label="Owner Name">
          <Input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} />
        </Field>
        <Field label="Contact Phone">
          <Input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} placeholder="+63 9XX XXX XXXX" />
        </Field>
        <Field label="Contact Email">
          <Input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} placeholder="owner@email.com" />
        </Field>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-base font-medium text-white mb-1">Lease & Payment Rules</h3>
        <p className="text-text-muted text-[13px]">Configure payment due dates and lease policies</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Field label="Monthly Due Day" hint="Day of month rent is due">
          <Input type="number" min="1" max="31" value={form.monthly_due_day} onChange={e => setForm({...form, monthly_due_day: e.target.value})} />
        </Field>
        <Field label="Late Fee %" hint="Percentage added after due date">
          <Input type="number" min="0" max="100" value={form.late_fee_percentage} onChange={e => setForm({...form, late_fee_percentage: e.target.value})} />
        </Field>
        <Field label="Lease Expiry Warning" hint="Days before expiry to alert">
          <Input type="number" min="1" max="90" value={form.auto_lease_expiry} onChange={e => setForm({...form, auto_lease_expiry: e.target.value})} />
        </Field>
      </div>

      <div className="flex justify-end pt-4">
        <Btn onClick={handleSave} disabled={saving}>
          {saving ? <IconLoader className="w-4 h-4 animate-spin" /> : saved ? <IconCheck className="w-4 h-4" /> : null}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </Btn>
      </div>
    </div>
  );
}

// ========== TAB 2: CAMERAS ==========
function CameraTab({ settings, onSave }) {
  const [cameras, setCameras] = useState([]);
  const [presets, setPresets] = useState({});
  const [testing, setTesting] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [form, setForm] = useState({
    camera_name: '', location: '', brand: 'tapo', ip_address: '', username: '', password: '', port: 554, stream_path: '/stream1', motion_detection: 1, alert_threshold: 'medium'
  });

  const load = () => {
    api.get('/cameras').then(res => setCameras(res.data));
    api.get('/cameras/presets').then(res => setPresets(res.data));
  };

  useEffect(() => { load(); }, []);

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

  const handleSave = async () => {
    if (editingCamera) {
      await api.put(`/cameras/${editingCamera.camera_id}`, form);
    } else {
      await api.post('/cameras', form);
    }
    setShowAdd(false);
    setEditingCamera(null);
    resetForm();
    load();
  };

  const handleEdit = (cam) => {
    setEditingCamera(cam);
    setForm({
      camera_name: cam.camera_name, location: cam.location || '', brand: cam.brand,
      ip_address: cam.ip_address || '', username: cam.username || '', password: '',
      port: cam.port || 554, stream_path: cam.stream_path || '/stream1',
      motion_detection: cam.motion_detection, alert_threshold: cam.alert_threshold
    });
    setShowAdd(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this camera?')) return;
    await api.delete(`/cameras/${id}`);
    load();
  };

  const resetForm = () => {
    setForm({ camera_name: '', location: '', brand: 'tapo', ip_address: '', username: '', password: '', port: 554, stream_path: '/stream1', motion_detection: 1, alert_threshold: 'medium' });
    setTestResult(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-white mb-1">Camera Setup</h3>
          <p className="text-text-muted text-[13px]">Add and configure IP cameras with RTSP streaming</p>
        </div>
        <Btn onClick={() => { resetForm(); setEditingCamera(null); setShowAdd(true); }}>
          <IconPlus className="w-4 h-4" /> Add Camera
        </Btn>
      </div>

      {/* Camera List */}
      <div className="space-y-3">
        {cameras.map(cam => (
          <div key={cam.camera_id} className="bg-surface-2 border border-border rounded-xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${cam.status === 'active' ? 'bg-white/10 border-white/20' : 'bg-surface-3 border-border'}`}>
              <IconCCTV className={`w-5 h-5 ${cam.status === 'active' ? 'text-white' : 'text-text-muted'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-medium">{cam.camera_name}</p>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider ${cam.status === 'active' ? 'bg-white/10 text-white' : 'bg-surface-3 text-text-muted'}`}>
                  {cam.status}
                </span>
              </div>
              <p className="text-text-muted text-[11px] mt-0.5">{cam.brand} - {cam.ip_address}:{cam.port} - {cam.location || 'No location'}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(cam)} className="p-2 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition"><IconEdit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(cam.camera_id)} className="p-2 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition"><IconTrash className="w-4 h-4" /></button>
            </div>
          </div>
        ))}

        {cameras.length === 0 && (
          <div className="bg-surface-2 border border-border rounded-xl p-10 text-center">
            <IconCCTV className="w-8 h-8 text-surface-4 mx-auto mb-3" />
            <p className="text-text-muted text-sm">No cameras configured</p>
            <p className="text-text-muted/50 text-[11px] mt-1">Click "Add Camera" to set up your first camera</p>
          </div>
        )}
      </div>

      {/* Add/Edit Camera Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="bg-surface-1 border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-medium text-white">{editingCamera ? 'Edit Camera' : 'Add New Camera'}</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 text-text-muted hover:text-white"><IconX className="w-4 h-4" /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Step 1: Camera Identity */}
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-3">Camera Identity</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Camera Name *">
                    <Input value={form.camera_name} onChange={e => setForm({...form, camera_name: e.target.value})} placeholder="CAM 1 - MAIN ENTRANCE" />
                  </Field>
                  <Field label="Location">
                    <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Front Door, Hallway, etc." />
                  </Field>
                </div>
              </div>

              {/* Step 2: Network */}
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-3">Network Configuration</p>
                <div className="space-y-4">
                  <Field label="Camera Brand" hint="Auto-fills RTSP URL format based on brand">
                    <Select value={form.brand} onChange={e => {
                      const p = presets[e.target.value];
                      setForm({...form, brand: e.target.value, port: p?.defaultPort || 554, stream_path: p?.streams?.high || '/stream1'});
                    }}>
                      {Object.entries(presets).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
                      <option value="generic">Generic RTSP Camera</option>
                    </Select>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="IP Address *" hint="e.g. 192.168.1.101">
                      <Input value={form.ip_address} onChange={e => setForm({...form, ip_address: e.target.value})} placeholder="192.168.1.101" />
                    </Field>
                    <Field label="RTSP Port" hint="Default: 554">
                      <Input type="number" value={form.port} onChange={e => setForm({...form, port: parseInt(e.target.value)})} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Username" hint="Camera login username">
                      <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                    </Field>
                    <Field label="Password" hint="Camera login password">
                      <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={editingCamera ? 'Leave blank to keep current' : ''} />
                    </Field>
                  </div>

                  <Field label="Stream Path" hint="Auto-filled based on brand">
                    <Input value={form.stream_path} onChange={e => setForm({...form, stream_path: e.target.value})} />
                  </Field>
                </div>
              </div>

              {/* RTSP URL Preview */}
              <div className="bg-surface-2 border border-border rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5">Generated RTSP URL</p>
                <p className="text-[11px] text-text-secondary font-mono break-all leading-relaxed">{generateRtspUrl()}</p>
              </div>

              {/* Connection Test */}
              <div>
                <Btn variant="secondary" onClick={handleTest} disabled={testing || !form.ip_address}>
                  {testing ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconWifi className="w-4 h-4" />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </Btn>

                {testResult && (
                  <div className={`mt-3 p-3 rounded-lg border text-sm flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-white/5 border-white/20 text-white'
                      : 'bg-white/5 border-white/10 text-text-secondary'
                  }`}>
                    {testResult.success ? <IconCheck className="w-4 h-4 flex-shrink-0" /> : <IconX className="w-4 h-4 flex-shrink-0" />}
                    {testResult.message}
                  </div>
                )}
              </div>

              {/* Step 3: Detection */}
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest mb-3">Motion Detection</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Motion Detection">
                    <Select value={form.motion_detection} onChange={e => setForm({...form, motion_detection: parseInt(e.target.value)})}>
                      <option value={1}>Enabled</option>
                      <option value={0}>Disabled</option>
                    </Select>
                  </Field>
                  <Field label="Alert Sensitivity">
                    <Select value={form.alert_threshold} onChange={e => setForm({...form, alert_threshold: e.target.value})}>
                      <option value="low">Low - Fewer alerts</option>
                      <option value="medium">Medium - Balanced</option>
                      <option value="high">High - More alerts</option>
                    </Select>
                  </Field>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Btn variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Btn>
              <Btn onClick={handleSave} disabled={!form.camera_name || !form.ip_address}>
                {editingCamera ? 'Update Camera' : 'Add Camera'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== TAB 3: ROOMS ==========
function RoomTab() {
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [bulkForm, setBulkForm] = useState({ monthly_rate: '', amenities: '' });
  const [saving, setSaving] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ room_number: '', floor: 1, type: 'single', capacity: 1, monthly_rate: '', amenities: '' });

  const load = () => {
    api.get('/rooms', { params: { limit: 100 } }).then(res => setRooms(res.data.data || res.data));
    api.get('/rooms/stats').then(res => setStats(res.data));
  };

  useEffect(() => { load(); }, []);

  const handleBulkUpdate = async () => {
    if (!bulkForm.monthly_rate && !bulkForm.amenities) return;
    setSaving(true);
    await api.post('/settings/rooms/bulk', {
      rooms: rooms.map(r => ({
        ...r,
        monthly_rate: bulkForm.monthly_rate ? parseFloat(bulkForm.monthly_rate) : r.monthly_rate,
        amenities: bulkForm.amenities || r.amenities,
      }))
    });
    setSaving(false);
    setEditMode(false);
    setBulkForm({ monthly_rate: '', amenities: '' });
    load();
  };

  const handleAddRoom = async () => {
    if (!newRoom.room_number || !newRoom.monthly_rate) return;
    await api.post('/rooms', newRoom);
    setShowAddRoom(false);
    setNewRoom({ room_number: '', floor: 1, type: 'single', capacity: 1, monthly_rate: '', amenities: '' });
    load();
  };

  const handleDeleteRoom = async (id) => {
    if (!confirm('Delete this room?')) return;
    await api.delete(`/rooms/${id}`);
    load();
  };

  const handleUpdateRoom = async (room, field, value) => {
    await api.put(`/rooms/${room.room_id}`, { ...room, [field]: value });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-white mb-1">Room Configuration</h3>
          <p className="text-text-muted text-[13px]">Manage rooms, pricing, and amenities</p>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Btn variant="secondary" onClick={() => setEditMode(false)}>Cancel</Btn>
              <Btn onClick={handleBulkUpdate} disabled={saving}>
                {saving ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconCheck className="w-4 h-4" />}
                Apply Changes
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="secondary" onClick={() => setEditMode(true)}>
                <IconEdit className="w-4 h-4" /> Bulk Edit
              </Btn>
              <Btn onClick={() => setShowAddRoom(true)}>
                <IconPlus className="w-4 h-4" /> Add Room
              </Btn>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Occupied', value: stats.occupied },
            { label: 'Available', value: stats.available },
            { label: 'Rate', value: `${stats.occupancyRate}%` },
          ].map(s => (
            <div key={s.label} className="bg-surface-2 border border-border rounded-lg p-3 text-center">
              <p className="text-text-muted text-[10px] uppercase tracking-widest">{s.label}</p>
              <p className="text-lg font-semibold text-white mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Edit Panel */}
      {editMode && (
        <div className="bg-surface-2 border border-border rounded-xl p-5">
          <p className="text-[10px] text-text-muted uppercase tracking-widest mb-4">Bulk Update All Rooms</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Set Monthly Rate (P)" hint="Leave blank to keep current rate">
              <Input type="number" value={bulkForm.monthly_rate} onChange={e => setBulkForm({...bulkForm, monthly_rate: e.target.value})} placeholder="e.g. 4000" />
            </Field>
            <Field label="Set Amenities" hint="Leave blank to keep current amenities">
              <Input value={bulkForm.amenities} onChange={e => setBulkForm({...bulkForm, amenities: e.target.value})} placeholder="WiFi, AC, Private CR" />
            </Field>
          </div>
        </div>
      )}

      {/* Room Table */}
      <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-[10px] font-medium text-text-muted uppercase tracking-widest">Room</th>
                <th className="text-left px-5 py-3 text-[10px] font-medium text-text-muted uppercase tracking-widest">Floor</th>
                <th className="text-left px-5 py-3 text-[10px] font-medium text-text-muted uppercase tracking-widest">Type</th>
                <th className="text-left px-5 py-3 text-[10px] font-medium text-text-muted uppercase tracking-widest">Cap</th>
                <th className="text-left px-5 py-3 text-[10px] font-medium text-text-muted uppercase tracking-widest">Rate (P/mo)</th>
                <th className="text-left px-5 py-3 text-[10px] font-medium text-text-muted uppercase tracking-widest">Amenities</th>
                <th className="text-left px-5 py-3 text-[10px] font-medium text-text-muted uppercase tracking-widest">Status</th>
                <th className="text-right px-5 py-3 text-[10px] font-medium text-text-muted uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(r => (
                <tr key={r.room_id} className="border-b border-border/50 hover:bg-surface-2 transition">
                  <td className="px-5 py-3 text-white font-medium text-sm">{r.room_number}</td>
                  <td className="px-5 py-3 text-text-secondary text-sm">{r.floor}</td>
                  <td className="px-5 py-3 text-text-secondary text-sm capitalize">{r.type}</td>
                  <td className="px-5 py-3 text-text-secondary text-sm">{r.capacity}</td>
                  <td className="px-5 py-3">
                    {editMode ? (
                      <input type="number" defaultValue={r.monthly_rate} onBlur={e => handleUpdateRoom(r, 'monthly_rate', parseFloat(e.target.value))} className="w-24 px-2 py-1 bg-surface-3 border border-border rounded text-white text-sm" />
                    ) : (
                      <span className="text-white text-sm font-medium">{r.monthly_rate?.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editMode ? (
                      <input defaultValue={r.amenities || ''} onBlur={e => handleUpdateRoom(r, 'amenities', e.target.value)} className="w-40 px-2 py-1 bg-surface-3 border border-border rounded text-white text-sm" />
                    ) : (
                      <span className="text-text-secondary text-[12px]">{r.amenities || '--'}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                      r.status === 'occupied' ? 'bg-white text-black' : r.status === 'available' ? 'bg-white/10 text-white' : 'bg-surface-3 text-text-muted'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {!editMode && (
                      <button onClick={() => handleDeleteRoom(r.room_id)} className="p-1.5 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition"><IconTrash className="w-3.5 h-3.5" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowAddRoom(false)}>
          <div className="bg-surface-1 border border-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-medium text-white mb-5">Add New Room</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Room Number *"><Input value={newRoom.room_number} onChange={e => setNewRoom({...newRoom, room_number: e.target.value})} placeholder="301" /></Field>
                <Field label="Floor"><Input type="number" value={newRoom.floor} onChange={e => setNewRoom({...newRoom, floor: parseInt(e.target.value)})} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Type">
                  <Select value={newRoom.type} onChange={e => setNewRoom({...newRoom, type: e.target.value})}>
                    <option value="single">Single</option><option value="double">Double</option>
                  </Select>
                </Field>
                <Field label="Capacity"><Input type="number" value={newRoom.capacity} onChange={e => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})} /></Field>
              </div>
              <Field label="Monthly Rate (P) *"><Input type="number" value={newRoom.monthly_rate} onChange={e => setNewRoom({...newRoom, monthly_rate: e.target.value})} /></Field>
              <Field label="Amenities"><Input value={newRoom.amenities} onChange={e => setNewRoom({...newRoom, amenities: e.target.value})} placeholder="WiFi, AC, Private CR" /></Field>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Btn variant="secondary" onClick={() => setShowAddRoom(false)}>Cancel</Btn>
              <Btn onClick={handleAddRoom} disabled={!newRoom.room_number || !newRoom.monthly_rate}>Add Room</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== TAB 4: NOTIFICATIONS ==========
function NotificationTab({ settings, onSave }) {
  const [form, setForm] = useState({
    twilio_account_sid: settings.twilio_account_sid || '',
    twilio_auth_token: settings.twilio_auth_token || '',
    twilio_phone_number: settings.twilio_phone_number || '',
    sendgrid_api_key: settings.sendgrid_api_key || '',
    sendgrid_from_email: settings.sendgrid_from_email || '',
    notify_motion: settings.notify_motion || '1',
    notify_lease_expiry: settings.notify_lease_expiry || '1',
    notify_payment: settings.notify_payment || '1',
    notify_new_tenant: settings.notify_new_tenant || '1',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-white mb-1">SMS Notifications (Twilio)</h3>
        <p className="text-text-muted text-[13px]">Configure Twilio for SMS alerts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Account SID" hint="From Twilio Console">
          <Input value={form.twilio_account_sid} onChange={e => setForm({...form, twilio_account_sid: e.target.value})} placeholder="AC..." />
        </Field>
        <Field label="Auth Token" hint="From Twilio Console">
          <Input type="password" value={form.twilio_auth_token} onChange={e => setForm({...form, twilio_auth_token: e.target.value})} placeholder="Your auth token" />
        </Field>
        <Field label="Twilio Phone Number" hint="+1XXXXXXXXXX">
          <Input value={form.twilio_phone_number} onChange={e => setForm({...form, twilio_phone_number: e.target.value})} placeholder="+1 555-123-4567" />
        </Field>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-base font-medium text-white mb-1">Email Notifications (SendGrid)</h3>
        <p className="text-text-muted text-[13px]">Configure SendGrid for email alerts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="API Key" hint="From SendGrid Settings">
          <Input type="password" value={form.sendgrid_api_key} onChange={e => setForm({...form, sendgrid_api_key: e.target.value})} placeholder="SG..." />
        </Field>
        <Field label="From Email" hint="Verified sender email">
          <Input type="email" value={form.sendgrid_from_email} onChange={e => setForm({...form, sendgrid_from_email: e.target.value})} placeholder="alerts@yourdomain.com" />
        </Field>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-base font-medium text-white mb-1">Notification Triggers</h3>
        <p className="text-text-muted text-[13px]">Choose which events trigger notifications</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { key: 'notify_motion', label: 'Motion Detected', desc: 'When camera detects movement' },
          { key: 'notify_lease_expiry', label: 'Lease Expiring', desc: 'When lease is about to expire' },
          { key: 'notify_payment', label: 'Payment Received', desc: 'When tenant makes a payment' },
          { key: 'notify_new_tenant', label: 'New Tenant', desc: 'When a new tenant registers' },
        ].map(n => (
          <label key={n.key} className="flex items-center gap-3 p-3 bg-surface-2 border border-border rounded-lg cursor-pointer hover:border-border-hover transition">
            <input type="checkbox" checked={form[n.key] === '1'} onChange={e => setForm({...form, [n.key]: e.target.checked ? '1' : '0'})} className="w-4 h-4 accent-white" />
            <div>
              <p className="text-white text-sm">{n.label}</p>
              <p className="text-text-muted text-[11px]">{n.desc}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Btn onClick={handleSave} disabled={saving}>
          {saving ? <IconLoader className="w-4 h-4 animate-spin" /> : saved ? <IconCheck className="w-4 h-4" /> : null}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
        </Btn>
      </div>
    </div>
  );
}

// ========== MAIN SETTINGS PAGE ==========
export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      setSettings(res.data.settings || {});
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaveSettings = async (newSettings) => {
    await api.put('/settings', { settings: newSettings });
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const tabs = [
    { key: 'general', label: 'General', icon: IconSettings },
    { key: 'cameras', label: 'Cameras', icon: IconCCTV },
    { key: 'rooms', label: 'Rooms & Pricing', icon: IconRooms },
    { key: 'notifications', label: 'Notifications', icon: IconBell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
        <p className="text-text-muted text-sm mt-1">Configure your boarding house system</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-surface-1 border border-border rounded-xl p-1.5 overflow-x-auto">
        {tabs.map(t => (
          <TabButton key={t.key} active={activeTab === t.key} onClick={() => setActiveTab(t.key)} icon={t.icon} label={t.label} />
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-surface-1 border border-border rounded-xl p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <IconLoader className="w-5 h-5 text-white animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'general' && <GeneralTab settings={settings} onSave={handleSaveSettings} />}
            {activeTab === 'cameras' && <CameraTab settings={settings} onSave={handleSaveSettings} />}
            {activeTab === 'rooms' && <RoomTab />}
            {activeTab === 'notifications' && <NotificationTab settings={settings} onSave={handleSaveSettings} />}
          </>
        )}
      </div>
    </div>
  );
}
