import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

/**
 * useNotifications - Real-time notification polling
 * Provides unread count and poll for new notifications
 */
export function useNotifications(pollInterval = 5000) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);
  const prevCountRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      setLoading(true);
      const [countRes, listRes] = await Promise.all([
        api.get('/notifications/unread-count'),
        api.get('/notifications', { params: { is_read: 0 } }),
      ]);

      if (mountedRef.current) {
        const newCount = countRes.data.count;
        setUnreadCount(newCount);
        setNotifications(listRes.data);
        setLastChecked(new Date());

        // Trigger browser notification if new alerts arrived
        if (newCount > prevCountRef.current && prevCountRef.current > 0 && document.hidden) {
          try {
            new Notification('BoardersWatch', {
              body: `You have ${newCount} unread notification${newCount > 1 ? 's' : ''}`,
              icon: '/favicon.svg',
              tag: 'boarderswatch-alert',
            });
          } catch {}
        }

        prevCountRef.current = newCount;
      }
    } catch (err) {
      // Silent fail for polling
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, pollInterval);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollInterval, fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    await api.put(`/notifications/${id}/read`);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    await api.put('/notifications/read-all');
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    unreadCount,
    notifications,
    loading,
    lastChecked,
    refresh: fetchNotifications,
    markAsRead,
    markAllRead,
  };
}
