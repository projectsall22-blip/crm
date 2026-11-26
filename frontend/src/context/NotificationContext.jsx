import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 60_000; // poll every 60 seconds

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [summary, setSummary]             = useState({});
  const [loading, setLoading]             = useState(false);
  const [panelOpen, setPanelOpen]         = useState(false);
  // Track which ids have been "read" locally (backend is stateless for reads)
  const [readIds, setReadIds]             = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('crm_notif_read') || '[]')); }
    catch { return new Set(); }
  });
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      const { notifications: items = [], summary: sum = {} } = res.data;

      // Apply local read state
      const withRead = items.map((n) => ({ ...n, read: readIds.has(n.id) }));
      setNotifications(withRead);
      setSummary(sum);
      setUnreadCount(withRead.filter((n) => !n.read).length);
    } catch (err) {
      // Silently fail — don't disrupt the app for notification errors
      console.warn('[notifications] fetch failed:', err?.response?.status);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Start polling when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [isAuthenticated, fetchNotifications]);

  // Re-apply readIds whenever they change (after mark-as-read)
  useEffect(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: readIds.has(n.id) }))
    );
    setUnreadCount((prev) => {
      // recalculate from current notifications
      return notifications.filter((n) => !readIds.has(n.id)).length;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readIds]);

  const markAsRead = useCallback((id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('crm_notif_read', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      localStorage.setItem('crm_notif_read', JSON.stringify([...next]));
      return next;
    });
    setUnreadCount(0);
  }, [notifications]);

  const openPanel  = useCallback(() => setPanelOpen(true),  []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const togglePanel = useCallback(() => setPanelOpen((o) => !o), []);

  // When panel opens, mark all visible as read after 3s
  useEffect(() => {
    if (!panelOpen) return;
    const t = setTimeout(() => markAllAsRead(), 3000);
    return () => clearTimeout(t);
  }, [panelOpen, markAllAsRead]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      summary,
      loading,
      panelOpen,
      openPanel,
      closePanel,
      togglePanel,
      markAsRead,
      markAllAsRead,
      refresh: fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export default NotificationContext;
