import { useState, useEffect } from 'react';
import api from '../services/api';
import { IconPlus, IconEdit, IconDoor } from '../components/Icons';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ room_number: '', floor: 1, type: 'single', capacity: 1, monthly_rate: '', amenities: '' });

  const load = () => {
    api.get('/rooms').then(res => setRooms(res.data));
    api.get('/rooms/stats').then(res => setStats(res.data));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing) { await api.put(`/rooms/${editing.room_id}`, form); }
    else { await api.post('/rooms', form); }
    setShowForm(false); setEditing(null);
    setForm({ room_number: '', floor: 1, type: 'single', capacity: 1, monthly_rate: '', amenities: '' });
    load();
  };

  const handleEdit = (room) => { setForm(room); setEditing(room); setShowForm(true); };

  const statusStyles = {
    available: 'border-white/20 bg-white/5',
    occupied: 'border-white bg-white',
    maintenance: 'border-white/30 bg-white/10',
  };

  const statusText = {
    available: 'text-text-secondary',
    occupied: 'text-black',
    maintenance: 'text-white',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Rooms</h1>
          <p className="text-text-muted text-sm mt-1">{rooms.length} rooms total</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ room_number: '', floor: 1, type: 'single', capacity: 1, monthly_rate: '', amenities: '' }); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-white/90 transition">
          <IconPlus className="w-4 h-4" /> Add Room
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Occupied', value: stats.occupied },
            { label: 'Available', value: stats.available },
            { label: 'Maintenance', value: stats.maintenance },
            { label: 'Rate', value: `${stats.occupancyRate}%` },
          ].map(s => (
            <div key={s.label} className="bg-surface-1 border border-border rounded-xl p-5">
              <p className="text-text-muted text-[11px] uppercase tracking-widest mb-2">{s.label}</p>
              <p className="text-2xl font-semibold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.map(room => (
          <div key={room.room_id} className="bg-surface-1 border border-border rounded-xl p-5 group hover:border-border-hover transition">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-widest">Room</p>
                <p className="text-xl font-semibold text-white mt-0.5">{room.room_number}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${statusStyles[room.status]} ${statusText[room.status]}`}>
                {room.status}
              </span>
            </div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-text-muted">Type</span>
                <span className="text-text-secondary">{room.type} (cap {room.capacity})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Floor</span>
                <span className="text-text-secondary">{room.floor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Rate</span>
                <span className="text-white font-medium">P{room.monthly_rate?.toLocaleString()}/mo</span>
              </div>
              {room.amenities && (
                <div className="pt-2 border-t border-border">
                  <p className="text-text-muted text-[11px]">{room.amenities}</p>
                </div>
              )}
            </div>
            <button onClick={() => handleEdit(room)} className="mt-4 w-full py-2 bg-surface-2 border border-border rounded-lg text-text-secondary hover:text-white hover:border-border-hover text-sm transition flex items-center justify-center gap-2">
              <IconEdit className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-surface-1 border border-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-medium text-white mb-5">{editing ? 'Edit Room' : 'Add Room'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[13px] text-text-secondary mb-1.5">Room Number *</label><input value={form.room_number} onChange={e => setForm({...form, room_number: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" required /></div>
                <div><label className="block text-[13px] text-text-secondary mb-1.5">Floor</label><input type="number" value={form.floor} onChange={e => setForm({...form, floor: parseInt(e.target.value)})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[13px] text-text-secondary mb-1.5">Type</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm"><option value="single">Single</option><option value="double">Double</option></select></div>
                <div><label className="block text-[13px] text-text-secondary mb-1.5">Capacity</label><input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" /></div>
              </div>
              <div><label className="block text-[13px] text-text-secondary mb-1.5">Monthly Rate (P) *</label><input type="number" value={form.monthly_rate} onChange={e => setForm({...form, monthly_rate: parseFloat(e.target.value)})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" required /></div>
              <div><label className="block text-[13px] text-text-secondary mb-1.5">Amenities</label><input value={form.amenities} onChange={e => setForm({...form, amenities: e.target.value})} placeholder="WiFi, AC, Private CR" className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm placeholder-text-muted" /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-text-secondary hover:text-white transition text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-white/90">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
