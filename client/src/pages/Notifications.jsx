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
    camera_offline: { dot: 'bg-white', badge: 'bg-white/10 text-white', label: 'OFFLINE' },
    camera_tampering: { dot: 'bg-white', badge: 'bg-white/10 text-white', label: 'TAMPER' },
    lease_expiring: { dot: 'bg-white/50', badge: 'bg-white/5 text-text-secondary', label: 'WARNING' },
    payment_received: { dot: 'bg-white/70', badge: 'bg-white/5 text-text-secondary', label: 'PAYMENT' },
    tenant_registered: { dot: 'bg-white/30', badge: 'bg-white/5 text-text-muted', label: 'INFO' },
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Notifications</h1>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">{notifications.filter(n => !n.is_read).length} unread</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {lastUpdated && (
            <span className="text-[10px] sm:text-[11px] text-text-muted whitespace-nowrap">Live &middot; {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button onClick={refresh} className="p-1.5 sm:p-2 text-text-muted hover:text-white hover:bg-surface-3 rounded-lg transition flex-shrink-0">
            <IconRefresh className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex bg-surface-1 border border-border rounded-lg overflow-hidden flex-shrink-0">
            {['all', 'unread'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-[13px] font-medium capitalize transition ${filter === f ? 'bg-white text-black' : 'text-text-secondary hover:text-white'}`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={handleMarkAllRead} className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-surface-1 border border-border text-text-secondary hover:text-white rounded-lg text-xs sm:text-[13px] transition flex-shrink-0 whitespace-nowrap">
            <IconCheck className="w-3 h-3 sm:w-4 sm:h-4" /> Mark All Read
          </button>
        </div>
      </div>

      <div className="space-y-2 sm:space-y-2">
        {notifications.map(n => {
          const config = typeConfig[n.type] || typeConfig.tenant_registered;
          return (
            <div key={n.notification_id} className={`bg-surface-1 border border-border rounded-xl p-3 sm:p-4 flex items-start gap-3 sm:gap-4 transition ${!n.is_read ? 'border-l-2 border-l-white' : ''}`}>
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mt-1.5 sm:mt-2 flex-shrink-0 ${config.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
                  <h3 className="text-white text-xs sm:text-sm font-medium truncate">{n.title}</h3>
                  <span className={`px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-medium uppercase tracking-widest ${config.badge} flex-shrink-0`}>{config.label}</span>
                </div>
                <p className="text-text-secondary text-xs sm:text-[13px] line-clamp-2">{n.message}</p>
                <p className="text-text-muted text-[10px] sm:text-[11px] mt-0.5">{n.created_at}</p>
              </div>
              {!n.is_read && (
                <button onClick={() => handleMarkRead(n.notification_id)} className="text-text-muted hover:text-white text-[10px] sm:text-[11px] uppercase tracking-wider whitespace-nowrap transition flex-shrink-0">Read</button>
              )}
            </div>
          );
        })}

        {notifications.length === 0 && (
          <div className="bg-surface-1 border border-border rounded-xl p-10 sm:p-16 text-center">
            <IconNotifications className="w-8 h-8 sm:w-10 sm:h-10 text-surface-4 mx-auto mb-3 sm:mb-4" />
            <p className="text-text-muted text-xs sm:text-sm">No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}