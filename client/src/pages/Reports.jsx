import { useState } from 'react';
import api from '../services/api';
import { IconDownload, IconUsers, IconCreditCard, IconDoor, IconShield } from '../components/Icons';

const reports = [
  { key: 'tenant', label: 'Tenant Report', desc: 'Complete list of all tenants with contact details and lease information', icon: IconUsers },
  { key: 'payment', label: 'Payment Report', desc: 'Collection summary, outstanding balances, and payment history', icon: IconCreditCard },
  { key: 'occupancy', label: 'Occupancy Report', desc: 'Room status, vacancy rates, and occupancy trends', icon: IconDoor },
  { key: 'security', label: 'Security Report', desc: 'CCTV alerts, incidents, and monitoring statistics', icon: IconShield },
];

export default function Reports() {
  const [loading, setLoading] = useState(null);

  const downloadReport = async (type, format) => {
    setLoading(`${type}-${format}`);
    try {
      const res = await api.get(`/reports/${type}`, { params: { format }, responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to download report'); }
    finally { setLoading(null); }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Reports</h1>
        <p className="text-text-muted text-xs sm:text-sm mt-0.5">Generate and export reports</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {reports.map(r => (
          <div key={r.key} className="bg-surface-1 border border-border rounded-xl p-4 sm:p-6 group hover:border-border-hover transition">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface-3 flex items-center justify-center border border-border flex-shrink-0">
                <r.icon className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-xs sm:text-sm mb-0.5">{r.label}</h3>
                <p className="text-text-muted text-xs sm:text-[13px] mb-3 sm:mb-4">{r.desc}</p>
                <div className="flex gap-2">
                  <button onClick={() => downloadReport(r.key, 'pdf')} disabled={loading === `${r.key}-pdf`} className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-surface-2 border border-border rounded-lg text-[10px] sm:text-[11px] text-text-secondary hover:text-white hover:border-border-hover transition uppercase tracking-wider font-medium disabled:opacity-50">
                    <IconDownload className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {loading === `${r.key}-pdf` ? '...' : 'PDF'}
                  </button>
                  <button onClick={() => downloadReport(r.key, 'excel')} disabled={loading === `${r.key}-excel`} className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-surface-2 border border-border rounded-lg text-[10px] sm:text-[11px] text-text-secondary hover:text-white hover:border-border-hover transition uppercase tracking-wider font-medium disabled:opacity-50">
                    <IconDownload className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {loading === `${r.key}-excel` ? '...' : 'Excel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}