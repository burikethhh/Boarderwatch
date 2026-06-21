import { useState, useEffect } from 'react';
import api from '../services/api';
import { IconPlus, IconSearch, IconEdit, IconTrash, IconX, IconLoader } from '../components/Icons';
import Pagination from '../components/Pagination';

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-1 border border-border rounded-2xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto mx-2 sm:mx-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h3 className="text-sm sm:text-base font-medium text-white">{title}</h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-white transition rounded-lg hover:bg-surface-3"><IconX className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs sm:text-[13px] text-text-secondary mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ ...props }) {
  return <input {...props} className={`w-full px-2.5 sm:px-3 py-2 sm:py-2.5 bg-surface-2 border border-border rounded-lg text-white text-xs sm:text-sm placeholder-text-muted ${props.className || ''}`} />;
}

function TenantForm({ tenant, onSubmit, onClose }) {
  const [form, setForm] = useState(tenant || { first_name: '', last_name: '', phone_number: '', email: '', emergency_contact: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await onSubmit(form); onClose(); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <FormField label="First Name *"><Input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required /></FormField>
        <FormField label="Last Name *"><Input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required /></FormField>
      </div>
      <FormField label="Phone Number"><Input value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} /></FormField>
      <FormField label="Email"><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></FormField>
      <FormField label="Emergency Contact"><Input value={form.emergency_contact} onChange={e => setForm({...form, emergency_contact: e.target.value})} /></FormField>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="px-3 py-2 sm:px-4 sm:py-2.5 text-text-secondary hover:text-white transition text-xs sm:text-sm">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white text-black font-medium rounded-lg text-xs sm:text-sm hover:bg-white/90 disabled:opacity-50 flex items-center gap-2">
          {loading && <IconLoader className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />}
          {tenant ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);

  const loadTenants = () => api.get('/tenants', { params: { search, page, limit: 20 } }).then(res => { setTenants(res.data.data); setTotal(res.data.total); setPage(res.data.page); setTotalPages(res.data.totalPages); });
  useEffect(() => { loadTenants(); }, [search, page]);

  const handleCreate = async (form) => { await api.post('/tenants', form); setPage(1); loadTenants(); };
  const handleUpdate = async (form) => { await api.put(`/tenants/${editingTenant.tenant_id}`, form); loadTenants(); };
  const handleDelete = async (id) => { if (!confirm('Deactivate this tenant?')) return; await api.delete(`/tenants/${id}`); loadTenants(); };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Tenants</h1>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">{total} registered</p>
        </div>
        <button onClick={() => { setEditingTenant(null); setModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-white text-black font-medium rounded-lg text-xs sm:text-sm hover:bg-white/90 transition self-start sm:self-auto">
          <IconPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Add Tenant
        </button>
      </div>

      <div className="relative max-w-full sm:max-w-sm">
        <IconSearch className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants..." className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-surface-1 border border-border rounded-lg text-white text-xs sm:text-sm placeholder-text-muted" />
      </div>

      <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
        <div className="-mx-4 sm:mx-0 overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3.5 text-[10px] sm:text-[11px] font-medium text-text-muted uppercase tracking-widest">Name</th>
                <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3.5 text-[10px] sm:text-[11px] font-medium text-text-muted uppercase tracking-widest">Contact</th>
                <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3.5 text-[10px] sm:text-[11px] font-medium text-text-muted uppercase tracking-widest hidden sm:table-cell">Status</th>
                <th className="text-right px-3 sm:px-5 py-2.5 sm:py-3.5 text-[10px] sm:text-[11px] font-medium text-text-muted uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.tenant_id} className="border-b border-border/50 hover:bg-surface-2 transition">
                  <td className="px-3 sm:px-5 py-3 sm:py-4">
                    <p className="text-white text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none">{t.first_name} {t.last_name}</p>
                    <p className="text-text-muted text-[10px] sm:text-[11px] mt-0.5 truncate">{t.email || '--'}</p>
                  </td>
                  <td className="px-3 sm:px-5 py-3 sm:py-4 text-text-secondary text-xs sm:text-sm">{t.phone_number || '--'}</td>
                  <td className="px-3 sm:px-5 py-3 sm:py-4 hidden sm:table-cell">
                    <span className={`inline-flex px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium uppercase tracking-wider ${t.status === 'active' ? 'bg-white/10 text-white' : 'bg-surface-3 text-text-muted'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-5 py-3 sm:py-4">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditingTenant(t); setModalOpen(true); }} className="p-1.5 sm:p-2 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition"><IconEdit className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                      <button onClick={() => handleDelete(t.tenant_id)} className="p-1.5 sm:p-2 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition"><IconTrash className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr><td colSpan="4" className="px-3 sm:px-5 py-8 sm:py-12 text-center text-text-muted text-xs sm:text-sm">No tenants found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingTenant ? 'Edit Tenant' : 'Add New Tenant'}>
        <TenantForm tenant={editingTenant} onSubmit={editingTenant ? handleUpdate : handleCreate} onClose={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}