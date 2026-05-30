import { useState, useCallback } from 'react';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { IconNotifications, IconCheck, IconRefresh } from '../components/Icons';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  const fetchData = useCallback(async () => {
    const params = {};
    if (filter === 'unread') params.is_read = 0;
    const res = await api.get('/notifications', { params });
    setNotifications(res.data);
  }, [filter]);

  const { loading, lastUpdated, refresh } = usePolling(fetchData, 5000);

  const handleMarkRead = async (id) => { await api.put(`/notifications/${id}/read`); refresh(); };
  const handleMarkAllRead = async () => { await api.put('/notifications/read-all'); refresh(); };

  const typeConfig = {
    motion_detected: { dot: 'bg-white', badge: 'bg-white/10 text-white', label: 'ALERT' },
    lease_expiring: { dot: 'bg-white/50', badge: 'bg-white/5 text-text-secondary', label: 'WARNING' },
    payment_received: { dot: 'bg-white/70', badge: 'bg-white/5 text-text-secondary', label: 'PAYMENT' },
    tenant_registered: { dot: 'bg-white/30', badge: 'bg-white/5 text-text-muted', label: 'INFO' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Notifications</h1>
          <p className="text-text-muted text-sm mt-1">{notifications.filter(n => !n.is_read).length} unread</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-text-muted">Live - {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button onClick={refresh} className="p-2 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition">
            <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex bg-surface-1 border border-border rounded-lg overflow-hidden">
            {['all', 'unread'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 text-[13px] font-medium capitalize transition ${filter === f ? 'bg-white text-black' : 'text-text-secondary hover:text-white'}`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={handleMarkAllRead} className="flex items-center gap-2 px-4 py-2 bg-surface-1 border border-border text-text-secondary hover:text-white rounded-lg text-[13px] transition">
            <IconCheck className="w-4 h-4" /> Mark All Read
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {notifications.map(n => {
          const config = typeConfig[n.type] || typeConfig.tenant_registered;
          return (
            <div key={n.notification_id} className={`bg-surface-1 border border-border rounded-xl p-4 flex items-start gap-4 transition ${!n.is_read ? 'border-l-2 border-l-white' : ''}`}>
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${config.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white text-sm font-medium">{n.title}</h3>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-widest ${config.badge}`}>{config.label}</span>
                </div>
                <p className="text-text-secondary text-[13px]">{n.message}</p>
                <p className="text-text-muted text-[11px] mt-1">{n.created_at}</p>
              </div>
              {!n.is_read && (
                <button onClick={() => handleMarkRead(n.notification_id)} className="text-text-muted hover:text-white text-[11px] uppercase tracking-wider whitespace-nowrap transition">Read</button>
              )}
            </div>
          );
        })}

        {notifications.length === 0 && (
          <div className="bg-surface-1 border border-border rounded-xl p-16 text-center">
            <IconNotifications className="w-10 h-10 text-surface-4 mx-auto mb-4" />
            <p className="text-text-muted text-sm">No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}
