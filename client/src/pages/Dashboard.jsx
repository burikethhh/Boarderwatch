import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { IconUsers, IconDoor, IconCreditCard, IconAlertTriangle, IconPlus, IconEye, IconFileText, IconClock, IconRefresh } from '../components/Icons';

function MetricCard({ icon: Icon, label, value, loading }) {
  return (
    <div className="bg-surface-1 border border-border rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-text-muted text-[10px] sm:text-[11px] uppercase tracking-widest mb-1 sm:mb-2 truncate">{label}</p>
          <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            {loading ? <span className="inline-block w-10 h-7 sm:w-12 sm:h-8 bg-surface-3 rounded animate-pulse" /> : value}
          </p>
        </div>
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface-3 flex items-center justify-center border border-border flex-shrink-0 ml-3">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    const [m, p, n] = await Promise.all([
      api.get('/dashboard/metrics'),
      api.get('/dashboard/recent-payments'),
      api.get('/dashboard/recent-notifications'),
    ]);
    setMetrics(m.data);
    setRecentPayments(p.data);
    setNotifications(n.data);
  }, []);

  const { loading, lastUpdated, refresh } = usePolling(fetchData, 8000);

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">Overview of your boarding house operations</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {lastUpdated && (
            <span className="text-[10px] sm:text-[11px] text-text-muted">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button onClick={refresh} className="p-1.5 sm:p-2 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition" title="Refresh">
            <IconRefresh className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard icon={IconUsers} label="Tenants" value={metrics?.totalTenants ?? 0} loading={loading && !metrics} />
        <MetricCard icon={IconDoor} label="Occupied" value={metrics?.occupiedRooms ?? 0} loading={loading && !metrics} />
        <MetricCard icon={IconClock} label="Pending" value={metrics?.pendingPayments ?? 0} loading={loading && !metrics} />
        <MetricCard icon={IconAlertTriangle} label="Alerts" value={metrics?.unreadAlerts ?? 0} loading={loading && !metrics} />
      </div>

      <div className="bg-surface-1 border border-border rounded-xl p-4 sm:p-6">
        <h2 className="text-white text-[10px] sm:text-[11px] uppercase tracking-widest font-medium mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { icon: IconPlus, label: 'Add Tenant', to: '/tenants' },
            { icon: IconCreditCard, label: 'Record Payment', to: '/payments' },
            { icon: IconEye, label: 'View CCTV', to: '/cctv' },
            { icon: IconFileText, label: 'Reports', to: '/reports' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.to)}
              className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 bg-surface-2 border border-border rounded-lg text-text-secondary hover:text-white hover:border-border-hover transition text-xs sm:text-sm"
            >
              <action.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-surface-1 border border-border rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <h2 className="text-white text-[10px] sm:text-[11px] uppercase tracking-widest font-medium">Recent Payments</h2>
            <button onClick={() => navigate('/payments')} className="text-[10px] sm:text-[11px] text-text-muted hover:text-white transition uppercase tracking-wider">View all</button>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-text-muted text-xs sm:text-sm text-center py-6 sm:py-8">No payments recorded yet</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {recentPayments.map(p => (
                <div key={p.payment_id} className="flex items-center justify-between p-2.5 sm:p-3 bg-surface-2 rounded-lg border border-border gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-xs sm:text-sm truncate">{p.tenant_name || 'N/A'}</p>
                    <p className="text-text-muted text-[10px] sm:text-[11px] mt-0.5">{p.payment_date}</p>
                  </div>
                  <span className="text-white font-medium text-xs sm:text-sm flex-shrink-0">P{p.amount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-1 border border-border rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <h2 className="text-white text-[10px] sm:text-[11px] uppercase tracking-widest font-medium">Recent Notifications</h2>
            <button onClick={() => navigate('/notifications')} className="text-[10px] sm:text-[11px] text-text-muted hover:text-white transition uppercase tracking-wider">View all</button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-text-muted text-xs sm:text-sm text-center py-6 sm:py-8">No notifications yet</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {notifications.map(n => (
                <div key={n.notification_id} className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-surface-2 rounded-lg border border-border">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 sm:mt-2 flex-shrink-0 ${
                    n.type === 'motion_detected' || n.type === 'camera_offline' || n.type === 'camera_tampering' ? 'bg-white' :
                    n.type === 'lease_expiring' ? 'bg-white/50' :
                    n.type === 'payment_received' ? 'bg-white/70' : 'bg-white/30'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-white text-xs sm:text-sm truncate">{n.title}</p>
                    <p className="text-text-muted text-[10px] sm:text-[11px] mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}