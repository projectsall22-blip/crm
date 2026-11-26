import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, FileText, RefreshCw, CheckSquare,
  AlertTriangle, Trophy, Bell, X, CheckCheck,
  Clock, Zap,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.jsx';

/* ── Icon + color per notification type ─────────────────────── */
const TYPE_CONFIG = {
  new_lead:        { icon: Target,        bg: 'bg-purple-100',  text: 'text-purple-600', dot: 'bg-purple-500',  label: 'Lead'    },
  lead_won:        { icon: Trophy,        bg: 'bg-emerald-100', text: 'text-emerald-600',dot: 'bg-emerald-500', label: 'Won'     },
  policy_issued:   { icon: FileText,      bg: 'bg-indigo-100',  text: 'text-indigo-600', dot: 'bg-indigo-500',  label: 'Policy'  },
  policy_pending:  { icon: Clock,         bg: 'bg-amber-100',   text: 'text-amber-600',  dot: 'bg-amber-500',   label: 'Pending' },
  policy_expiring: { icon: AlertTriangle, bg: 'bg-orange-100',  text: 'text-orange-600', dot: 'bg-orange-500',  label: 'Expiring'},
  renewal_due:     { icon: RefreshCw,     bg: 'bg-blue-100',    text: 'text-blue-600',   dot: 'bg-blue-500',    label: 'Renewal' },
  task_overdue:    { icon: CheckSquare,   bg: 'bg-red-100',     text: 'text-red-600',    dot: 'bg-red-500',     label: 'Task'    },
};

const DEFAULT_CONFIG = { icon: Bell, bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Info' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── Bell button (used in TopBar) ───────────────────────────── */
export function NotificationBell() {
  const { unreadCount, togglePanel, panelOpen } = useNotifications();

  return (
    <button
      onClick={togglePanel}
      aria-label="Notifications"
      className={`relative p-2 rounded-lg transition-colors ${
        panelOpen ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-100 text-gray-500'
      }`}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
          bg-red-500 text-white text-[10px] font-bold rounded-full
          flex items-center justify-center animate-bounce-in ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

/* ── Category filter tabs ───────────────────────────────────── */
const CATEGORIES = [
  { key: 'all',     label: 'All'      },
  { key: 'lead',    label: 'Leads'    },
  { key: 'policy',  label: 'Policies' },
  { key: 'renewal', label: 'Renewals' },
  { key: 'task',    label: 'Tasks'    },
];

/* ── Main panel ─────────────────────────────────────────────── */
export function NotificationPanel({ activeCategory, onCategoryChange }) {
  const { notifications, loading, markAllAsRead, markAsRead, closePanel, unreadCount, refresh } = useNotifications();
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Check it's not the bell button itself
        if (!e.target.closest('[data-notif-bell]')) closePanel();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closePanel]);

  const filtered = activeCategory === 'all'
    ? notifications
    : notifications.filter((n) => n.category === activeCategory);

  const handleClick = (notif) => {
    markAsRead(notif.id);
    if (notif.link) navigate(notif.link);
    closePanel();
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[380px] max-h-[560px] flex flex-col
        bg-white rounded-2xl border border-gray-100 z-50 animate-slide-down overflow-hidden"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,.14)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-gray-800">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800
                px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
          <button
            onClick={refresh}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 px-3 pt-2 pb-1 border-b border-gray-100 shrink-0 overflow-x-auto">
        {CATEGORIES.map((cat) => {
          const catCount = cat.key === 'all'
            ? notifications.filter((n) => !n.read).length
            : notifications.filter((n) => n.category === cat.key && !n.read).length;
          return (
            <button
              key={cat.key}
              onClick={() => onCategoryChange(cat.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                whitespace-nowrap transition-colors ${
                activeCategory === cat.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {cat.label}
              {catCount > 0 && (
                <span className={`text-[10px] font-bold px-1 py-0 rounded-full ${
                  activeCategory === cat.key ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {catCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Bell className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">All caught up!</p>
            <p className="text-xs text-gray-400">No notifications in this category.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filtered.map((notif, i) => (
              <NotificationItem
                key={notif.id}
                notif={notif}
                index={i}
                onClick={() => handleClick(notif)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="shrink-0 px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
          <p className="text-xs text-gray-400 text-center">
            {notifications.length} total · refreshes every minute
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Single notification row ────────────────────────────────── */
function NotificationItem({ notif, index, onClick }) {
  const cfg = TYPE_CONFIG[notif.type] || DEFAULT_CONFIG;
  const Icon = cfg.icon;

  return (
    <li
      onClick={onClick}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
        hover:bg-indigo-50/60 group
        ${!notif.read ? 'bg-indigo-50/30' : ''}
        ${notif.urgent ? 'border-l-2 border-red-400' : ''}
      `}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Icon box */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
        <Icon className={`w-4 h-4 ${cfg.text}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              {notif.urgent && <Zap className="w-3 h-3 text-red-500 shrink-0" />}
              <p className={`text-xs font-semibold leading-tight ${
                notif.urgent ? 'text-red-700' : 'text-gray-800'
              }`}>
                {notif.title}
              </p>
            </div>
            <p className="text-xs text-gray-700 mt-0.5 leading-snug line-clamp-1">
              {notif.message}
            </p>
            {notif.sub && (
              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{notif.sub}</p>
            )}
          </div>
          {/* Unread dot */}
          {!notif.read && (
            <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${cfg.dot}`} />
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notif.time)}</p>
      </div>
    </li>
  );
}
