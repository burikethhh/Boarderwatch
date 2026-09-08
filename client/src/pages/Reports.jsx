import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  IconDownload, IconUsers, IconCreditCard, IconDoor, IconShield,
  IconTrendUp, IconPieChart, IconRefresh
} from '../components/Icons';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';

const reportTypes = [
  {
    key: 'tenant',
    label: 'Tenant Report',
    desc: 'Complete directory of registered tenants, room assignments, emergency contacts, and lease duration.',
    icon: IconUsers,
    formats: ['excel', 'pdf']
  },
  {
    key: 'payment',
    label: 'Payment & Collection Report',
    desc: 'Financial ledger of all rent, deposit, and utility collections with outstanding balance summaries.',
    icon: IconCreditCard,
    formats: ['excel', 'pdf']
  },
  {
    key: 'occupancy',
    label: 'Room Occupancy Report',
    desc: 'Room inventory, bed capacity utilization, maintenance status, and vacancy rate analytics.',
    icon: IconDoor,
    formats: ['excel', 'pdf']
  },
  {
    key: 'security',
    label: 'CCTV Surveillance & Incident Report',
    desc: 'Motion detection incident history, camera uptime statistics, and alert acknowledgment logs.',
    icon: IconShield,
    formats: ['pdf']
  },
];

export default function Reports() {
  const [loadingExport, setLoadingExport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await api.get('/reports/analytics');
      setAnalytics(res.data);
    } catch (e) {
      console.error('Fetch analytics failed:', e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const downloadReport = async (type, format) => {
    setLoadingExport(`${type}-${format}`);
    try {
      const res = await api.get(`/reports/${type}`, { params: { format }, responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to generate report. Please verify backend connection.');
    } finally {
      setLoadingExport(null);
    }
  };

  const monthlyData = analytics?.monthlyTrends || [
    { month: 'May', collected: 21000, target: 28000 },
    { month: 'Jun', collected: 24500, target: 28000 },
    { month: 'Jul', collected: 22000, target: 28000 },
    { month: 'Aug', collected: 26000, target: 28000 },
    { month: 'Sep', collected: 24000, target: 28000 },
    { month: 'Oct', collected: 24000, target: 28000 },
  ];

  const occupancyPieData = analytics?.occupancy?.distribution || [
    { name: 'Occupied', value: 8, color: '#22c55e' },
    { name: 'Vacant', value: 2, color: '#eab308' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Reports & Data Analytics</h1>
            <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] font-mono rounded uppercase tracking-wider">
              Day N Earth Lucero
            </span>
          </div>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">
            Operational summaries, Excel/PDF exports, and longitudinal trend visualizers
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="p-2 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition self-start sm:self-auto"
          title="Refresh Analytics"
        >
          <IconRefresh className={`w-4 h-4 ${loadingAnalytics ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 4 Report Cards (Figure 22) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reportTypes.map((r) => (
          <div
            key={r.key}
            className="bg-surface-1 border border-border rounded-xl p-5 hover:border-border-hover transition shadow-sm"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center border border-border flex-shrink-0">
                <r.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-sm mb-1">{r.label}</h3>
                <p className="text-text-muted text-xs mb-4 leading-relaxed">{r.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {r.formats.includes('excel') && (
                    <button
                      onClick={() => downloadReport(r.key, 'excel')}
                      disabled={loadingExport === `${r.key}-excel`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-border rounded-lg text-xs font-medium text-text-secondary hover:text-white hover:border-border-hover transition disabled:opacity-50"
                    >
                      <IconDownload className="w-3 h-3" />
                      {loadingExport === `${r.key}-excel` ? 'Exporting...' : 'Export Excel'}
                    </button>
                  )}
                  {r.formats.includes('pdf') && (
                    <button
                      onClick={() => downloadReport(r.key, 'pdf')}
                      disabled={loadingExport === `${r.key}-pdf`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-border rounded-lg text-xs font-medium text-text-secondary hover:text-white hover:border-border-hover transition disabled:opacity-50"
                    >
                      <IconDownload className="w-3 h-3" />
                      {loadingExport === `${r.key}-pdf` ? 'Generating...' : 'Export PDF'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Analytics Charts (Figure 22 in Research Paper) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 pt-2">
        {/* Monthly Collection Trend Chart */}
        <div className="lg:col-span-2 bg-surface-1 border border-border rounded-xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                <IconTrendUp className="w-4 h-4 text-green-400" />
                Monthly Revenue Collection Trend (6 Months)
              </h2>
              <p className="text-text-muted text-xs mt-0.5">Historical collection vs target (₱28,000 baseline)</p>
            </div>
            <span className="text-[11px] font-mono text-text-muted uppercase">PHP Currency</span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} tickFormatter={(v) => `₱${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(val) => [`₱${Number(val).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="collected" name="Collected Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Monthly Target" fill="#3f3f46" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Distribution Chart */}
        <div className="bg-surface-1 border border-border rounded-xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                <IconDoor className="w-4 h-4 text-yellow-400" />
                Room Occupancy Distribution
              </h2>
              <span className="text-[11px] font-mono text-green-400 font-bold">
                {analytics?.occupancy?.rate || 80}% Occupied
              </span>
            </div>
            <p className="text-text-muted text-xs mb-2">Total Rooms: 10 (8 Occupied, 2 Vacant)</p>
          </div>

          <div className="h-56 sm:h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {occupancyPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || (index === 0 ? '#22c55e' : '#eab308')} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(val, name) => [`${val} Rooms`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-center text-xs">
            <div className="p-2 bg-surface-2 rounded-lg">
              <span className="text-text-muted text-[10px] uppercase block">Occupied</span>
              <span className="text-white font-bold">{analytics?.occupancy?.occupied || 8} Rooms</span>
            </div>
            <div className="p-2 bg-surface-2 rounded-lg">
              <span className="text-text-muted text-[10px] uppercase block">Available</span>
              <span className="text-white font-bold">{analytics?.occupancy?.available || 2} Rooms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}