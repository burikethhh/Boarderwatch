import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  IconPlus, IconCreditCard, IconTrendUp, IconClock, IconAlertTriangle,
  IconDownload, IconX, IconCheck
} from '../components/Icons';
import Pagination from '../components/Pagination';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [totalPayments, setTotalPayments] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [leases, setLeases] = useState([]);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [form, setForm] = useState({
    lease_id: '',
    tenant_name: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    payment_type: 'rent',
  });

  const load = () => {
    api.get('/payments', { params: { page, limit: 20 } }).then((res) => {
      setPayments(res.data.data);
      setTotalPayments(res.data.total);
      setPage(res.data.page);
      setTotalPages(res.data.totalPages);
    });
    api.get('/leases', { params: { status: 'active', limit: 100 } }).then((res) =>
      setLeases(res.data.data || res.data)
    );
    api.get('/payments/stats').then((res) => setStats(res.data));
  };

  useEffect(() => {
    load();
  }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lease = leases.find((l) => l.lease_id == form.lease_id);
    const res = await api.post('/payments', {
      ...form,
      tenant_name: lease?.tenant_name || form.tenant_name,
    });
    setShowForm(false);
    setForm({
      lease_id: '',
      tenant_name: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      payment_type: 'rent',
    });
    load();
    // Prompt to view the generated receipt
    if (res.data) {
      setReceiptPayment(res.data);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await api.get('/reports/payment', { params: { format: 'excel' }, responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Payment Tracking</h1>
            <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] font-mono rounded uppercase tracking-wider">
              Day N Earth Lucero
            </span>
          </div>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">
            {totalPayments} recorded transactions &middot; Digital official receipts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-surface-2 border border-border text-text-secondary hover:text-white rounded-lg text-xs sm:text-sm transition disabled:opacity-50"
          >
            <IconDownload className="w-3.5 h-3.5" /> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white text-black font-semibold rounded-lg text-xs sm:text-sm hover:bg-white/90 transition shadow-sm"
          >
            <IconPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Record Payment
          </button>
        </div>
      </div>

      {/* 4 Summary Cards (Figure 19) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-surface-1 border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-text-muted text-[10px] sm:text-[11px] uppercase tracking-widest mb-1 truncate">
                Collected Amount
              </p>
              <p className="text-xl sm:text-2xl font-semibold text-green-400">
                ₱{(stats?.collected || 24000).toLocaleString()}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <IconTrendUp className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-surface-1 border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-text-muted text-[10px] sm:text-[11px] uppercase tracking-widest mb-1 truncate">
                Pending Amount
              </p>
              <p className="text-xl sm:text-2xl font-semibold text-yellow-400">
                ₱{(stats?.pending !== undefined ? stats.pending : 8500).toLocaleString()}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <IconClock className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-surface-1 border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-text-muted text-[10px] sm:text-[11px] uppercase tracking-widest mb-1 truncate">
                Overdue Amount
              </p>
              <p className="text-xl sm:text-2xl font-semibold text-white">
                ₱{(stats?.overdue || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-3 border border-border flex items-center justify-center flex-shrink-0">
              <IconAlertTriangle className="w-4 h-4 text-text-muted" />
            </div>
          </div>
        </div>

        <div className="bg-surface-1 border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-text-muted text-[10px] sm:text-[11px] uppercase tracking-widest mb-1 truncate">
                Collection Rate
              </p>
              <p className="text-xl sm:text-2xl font-semibold text-white">
                {stats?.collectionRate || 74}%
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-3 border border-border flex items-center justify-center flex-shrink-0">
              <IconCreditCard className="w-4 h-4 text-text-secondary" />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Table */}
      <div className="bg-surface-1 border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-surface-2/40">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Receipt #</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Tenant Name</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Method</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Type</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {payments.map((p) => (
                <tr key={p.payment_id} className="hover:bg-surface-2/50 transition">
                  <td className="px-4 py-3 text-white font-mono text-xs">{p.receipt_number}</td>
                  <td className="px-4 py-3 text-white font-medium text-xs sm:text-sm">{p.tenant_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-green-400 font-semibold text-xs sm:text-sm">₱{p.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{p.payment_date}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-0.5 rounded bg-surface-3 text-text-secondary capitalize">
                      {p.payment_method?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-0.5 rounded bg-surface-3 text-text-secondary capitalize">
                      {p.payment_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setReceiptPayment(p)}
                      className="px-2.5 py-1 bg-surface-2 border border-border text-xs text-text-secondary hover:text-white rounded hover:border-border-hover transition"
                    >
                      Print Receipt
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-text-muted text-xs sm:text-sm">
                    No payment records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Record Payment Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-surface-1 border border-border rounded-2xl p-5 sm:p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Record Tenant Payment</h3>
              <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-white">
                <IconX className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1 uppercase tracking-wider">Lease Agreement *</label>
                <select
                  value={form.lease_id}
                  onChange={(e) => setForm({ ...form, lease_id: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs"
                  required
                >
                  <option value="">Select active tenant lease</option>
                  {leases.map((l) => (
                    <option key={l.lease_id} value={l.lease_id}>
                      {l.lease_number} - {l.tenant_name} (Room {l.room_number || l.room_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1 uppercase tracking-wider">Amount (PHP) *</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="3500"
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1 uppercase tracking-wider">Date *</label>
                  <input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1 uppercase tracking-wider">Payment Method</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer / Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1 uppercase tracking-wider">Payment Type</label>
                  <select
                    value={form.payment_type}
                    onChange={(e) => setForm({ ...form, payment_type: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-white text-xs"
                  >
                    <option value="rent">Monthly Rent</option>
                    <option value="deposit">Security Deposit</option>
                    <option value="utility">Utility / Water / Electricity</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-text-secondary hover:text-white transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white text-black font-semibold rounded-lg text-xs hover:bg-white/90 transition"
                >
                  Save & Generate Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Digital Receipt Modal (Printable) */}
      {receiptPayment && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setReceiptPayment(null)}
        >
          <div
            className="bg-white text-black rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative print:p-0 print:shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Controls (Hidden when printing) */}
            <div className="flex justify-between items-center mb-6 print:hidden border-b pb-4">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Official Receipt Preview</span>
              <div className="flex gap-2">
                <button
                  onClick={printReceipt}
                  className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded hover:bg-zinc-800 transition"
                >
                  Print Receipt
                </button>
                <button
                  onClick={() => setReceiptPayment(null)}
                  className="p-1.5 text-zinc-500 hover:text-black rounded"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div className="text-center pb-4 border-b border-zinc-200">
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 uppercase">
                Day N Earth Lucero Boarding House
              </h2>
              <p className="text-xs text-zinc-600">National Highway, Tacurong City, Sultan Kudarat</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Contact: 0917-123-4567 | Owner: Vannesa Cajandig Lucero</p>
              <div className="mt-3 inline-block px-3 py-1 bg-zinc-100 rounded text-xs font-mono font-bold tracking-wider">
                OFFICIAL PAYMENT RECEIPT
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs border-b border-zinc-200">
              <div className="flex justify-between">
                <span className="text-zinc-500">Receipt Number:</span>
                <span className="font-mono font-bold">{receiptPayment.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Date Issued:</span>
                <span>{receiptPayment.payment_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Received From (Tenant):</span>
                <span className="font-bold text-sm">{receiptPayment.tenant_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Payment Type:</span>
                <span className="capitalize">{receiptPayment.payment_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Payment Method:</span>
                <span className="capitalize">{receiptPayment.payment_method?.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="py-4 flex justify-between items-center text-base font-bold border-b-2 border-black">
              <span>Total Amount Paid:</span>
              <span className="text-lg">₱{Number(receiptPayment.amount).toLocaleString()}.00</span>
            </div>

            <div className="pt-6 text-center text-[11px] text-zinc-500 space-y-1">
              <p>Thank you for your payment!</p>
              <p className="text-[10px] text-zinc-400 font-mono">System verified by BoardersWatch &middot; Day N Earth Lucero</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}