import { useState, useEffect } from 'react';
import api from '../services/api';
import { IconPlus, IconCreditCard, IconTrendUp, IconClock } from '../components/Icons';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [leases, setLeases] = useState([]);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ lease_id: '', tenant_name: '', amount: '', payment_date: '', payment_method: 'cash', payment_type: 'rent' });

  const load = () => {
    api.get('/payments').then(res => setPayments(res.data));
    api.get('/leases?status=active').then(res => setLeases(res.data));
    api.get('/payments/stats').then(res => setStats(res.data));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lease = leases.find(l => l.lease_id == form.lease_id);
    await api.post('/payments', { ...form, tenant_name: lease?.tenant_name || form.tenant_name });
    setShowForm(false);
    setForm({ lease_id: '', tenant_name: '', amount: '', payment_date: '', payment_method: 'cash', payment_type: 'rent' });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Payments</h1>
          <p className="text-text-muted text-sm mt-1">{payments.length} total</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-white/90 transition">
          <IconPlus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-1 border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center border border-border"><IconTrendUp className="w-5 h-5 text-text-secondary" /></div>
              <div><p className="text-text-muted text-[11px] uppercase tracking-widest">Collected</p><p className="text-xl font-semibold text-white">P{stats.collected.toLocaleString()}</p></div>
            </div>
          </div>
          <div className="bg-surface-1 border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center border border-border"><IconClock className="w-5 h-5 text-text-secondary" /></div>
              <div><p className="text-text-muted text-[11px] uppercase tracking-widest">Pending</p><p className="text-xl font-semibold text-white">P{stats.pending.toLocaleString()}</p></div>
            </div>
          </div>
          <div className="bg-surface-1 border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center border border-border"><IconCreditCard className="w-5 h-5 text-text-secondary" /></div>
              <div><p className="text-text-muted text-[11px] uppercase tracking-widest">Rate</p><p className="text-xl font-semibold text-white">{stats.collectionRate}%</p></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Receipt</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Tenant</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Amount</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Date</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Method</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-text-muted uppercase tracking-widest">Type</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.payment_id} className="border-b border-border/50 hover:bg-surface-2 transition">
                  <td className="px-5 py-4 text-white font-medium text-sm">{p.receipt_number}</td>
                  <td className="px-5 py-4 text-text-secondary text-sm">{p.tenant_name || '--'}</td>
                  <td className="px-5 py-4 text-white font-medium text-sm">P{p.amount.toLocaleString()}</td>
                  <td className="px-5 py-4 text-text-secondary text-sm">{p.payment_date}</td>
                  <td className="px-5 py-4 text-text-secondary text-sm capitalize">{p.payment_method?.replace('_', ' ')}</td>
                  <td className="px-5 py-4 text-text-secondary text-sm capitalize">{p.payment_type}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-text-muted text-sm">No payments recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-surface-1 border border-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-medium text-white mb-5">Record Payment</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] text-text-secondary mb-1.5">Lease *</label>
                <select value={form.lease_id} onChange={e => setForm({...form, lease_id: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" required>
                  <option value="">Select lease</option>
                  {leases.map(l => <option key={l.lease_id} value={l.lease_id}>{l.lease_number} - {l.tenant_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[13px] text-text-secondary mb-1.5">Amount (P) *</label><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" required /></div>
                <div><label className="block text-[13px] text-text-secondary mb-1.5">Date *</label><input type="date" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[13px] text-text-secondary mb-1.5">Method</label><select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm"><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option></select></div>
                <div><label className="block text-[13px] text-text-secondary mb-1.5">Type</label><select value={form.payment_type} onChange={e => setForm({...form, payment_type: e.target.value})} className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-white text-sm"><option value="rent">Rent</option><option value="deposit">Deposit</option><option value="utility">Utility</option></select></div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-text-secondary hover:text-white transition text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-white/90">Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
