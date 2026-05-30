import { useState, useEffect } from 'react';
import api from '../services/api';
import { IconPlus, IconRefresh } from '../components/Icons';

export default function Leases() {
  const [leases, setLeases] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tenant_id: '', room_id: '', start_date: '', end_date: '', monthly_rent: '' });

  const load = () => {
    api.get('/leases').then(res => setLeases(res.data));
    api.get('/tenants').then(res => setTenants(res.data));
    api.get('/rooms').then(res => setRooms(res.data));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/leases', form);
    setShowForm(false);
    setForm({ tenant_id: '', room_id: '', start_date: '', end_date: '', monthly_rent: '' });
    load();
  };

  const handleRenew = async (id) => {
    const endDate = prompt('New end date (YYYY-MM-DD):');
    if (!endDate) return;
    await api.post(`/leases/${id}/renew`, { end_date: endDate });
    load();
  };

  const statusStyles = {
    active: 'bg-white/10 text-white',
    expiring_soon: 'bg-white/5 text-text-secondary',
    expired: 'bg-surface-3 text-text-muted',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Leases</h1>
          <p className="text-text-muted text-sm mt-1">{leases.length} total</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-white/90 transition">
          <IconPlus className="w-4 h-4" /> Create Lease
        </button>
      </div>

      <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Lease</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Tenant</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Room</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Period</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Rate</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Status</th>
                <th className="text-right px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leases.map(l => (
                <tr key={l.lease_id} className="border-b border-border/50 hover:bg-surface-2 transition">
                  <td className="px-5 py-4 text-white font-medium text-sm">{l.lease_number}</td>
                  <td className="px-5 py-4 text-text-secondary text-sm">{l.tenant_name || '--'}</td>
                  <td className="px-5 py-4 text-text-secondary text-sm">{l.room_number || '--'}</td>
                  <td className="px-5 py-4 text-text-secondary text-sm">{l.start_date} - {l.end_date}</td>
                  <td className="px-5 py-4 text-white text-sm font-medium">P{l.monthly_rent?.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider ${statusStyles[l.status] || 'bg-surface-3 text-text-muted'}`}>
                      {l.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      {l.status === 'active' && (
                        <button onClick={() => handleRenew(l.lease_id)} className="p-2 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition" title="Renew">
                          <IconRefresh className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {leases.length === 0 && (
                <tr><td colSpan="7" className="px-5 py-12 text-center text-text-muted text-sm">No leases found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-surface-1 border border-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-medium text-white mb-5">Create New Lease</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[13px] text-text-secondary mb-1.5">Tenant *</label>
                <select value={form.tenant_id} onChange={e => setForm({...form, tenant_id: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" required>
                  <option value="">Select tenant</option>
                  {tenants.filter(t => t.status === 'active').map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] text-text-secondary mb-1.5">Room *</label>
                <select value={form.room_id} onChange={e => setForm({...form, room_id: e.target.value, monthly_rent: rooms.find(r => r.room_id == e.target.value)?.monthly_rate || ''})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" required>
                  <option value="">Select room</option>
                  {rooms.filter(r => r.status === 'available').map(r => <option key={r.room_id} value={r.room_id}>Room {r.room_number} - P{r.monthly_rate}/mo</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[13px] text-text-secondary mb-1.5">Start Date *</label><input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" required /></div>
                <div><label className="block text-[13px] text-text-secondary mb-1.5">End Date *</label><input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" required /></div>
              </div>
              <div><label className="block text-[13px] text-text-secondary mb-1.5">Monthly Rent (P) *</label><input type="number" value={form.monthly_rent} onChange={e => setForm({...form, monthly_rent: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" required /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-text-secondary hover:text-white transition text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-white/90">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
