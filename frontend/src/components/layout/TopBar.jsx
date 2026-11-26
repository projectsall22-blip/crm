import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, User, LogOut, ChevronDown, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { NotificationBell, NotificationPanel } from '../NotificationPanel.jsx';

/* ── Global search config ──────────────────────────────────── */
const SEARCH_SHORTCUTS = [
  { label: 'Clients',   path: '/clients',   hint: 'View all clients'      },
  { label: 'Leads',     path: '/leads',     hint: 'View all leads'        },
  { label: 'Policies',  path: '/policies',  hint: 'View all policies'     },
  { label: 'Renewals',  path: '/renewals',  hint: 'Upcoming renewals'     },
  { label: 'Tasks',     path: '/tasks',     hint: 'My tasks'              },
  { label: 'Reports',   path: '/reports',   hint: 'Analytics & reports'   },
];

export default function TopBar({ onMenuClick }) {
  const { user, logout }                    = useAuth();
  const { panelOpen, closePanel }           = useNotifications();
  const navigate                            = useNavigate();
  const [profileOpen, setProfileOpen]       = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchFocus, setSearchFocus]       = useState(false);
  const [notifCategory, setNotifCategory]   = useState('all');
  const profileRef = useRef(null);
  const searchRef  = useRef(null);

  /* Close profile dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Keyboard shortcut: Ctrl+K / Cmd+K → focus search */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        setSearchFocus(false);
        searchRef.current?.blur();
        closePanel();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closePanel]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /* Search: filter shortcuts by query and navigate */
  const filteredShortcuts = searchQuery.trim()
    ? SEARCH_SHORTCUTS.filter((s) =>
        s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.hint.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SEARCH_SHORTCUTS;

  const handleSearchSelect = (path) => {
    navigate(path);
    setSearchQuery('');
    setSearchFocus(false);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && filteredShortcuts.length > 0) {
      handleSearchSelect(filteredShortcuts[0].path);
    }
  };

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
    : '??';

  const roleColor = {
    admin:    'bg-indigo-600',
    manager:  'bg-purple-600',
    producer: 'bg-emerald-600',
  }[user?.role] || 'bg-indigo-600';

  return (
    <header className="topbar">
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile burger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search bar with live dropdown */}
        <div className="relative hidden sm:block">
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 w-72 transition-all duration-200 ${
            searchFocus
              ? 'bg-white ring-2 ring-indigo-300 shadow-sm'
              : 'bg-gray-100 hover:bg-gray-200/70'
          }`}>
            <Search className="w-4 h-4 shrink-0 text-gray-400" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search… (Ctrl+K)"
              className="bg-transparent outline-none text-sm text-gray-700 w-full placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onMouseDown={(e) => { e.preventDefault(); setSearchQuery(''); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search dropdown */}
          {searchFocus && (
            <div className="absolute top-full mt-1.5 left-0 w-72 bg-white rounded-xl border border-gray-100
              shadow-lg z-50 overflow-hidden animate-slide-down py-1">
              {filteredShortcuts.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400">No results for "{searchQuery}"</p>
              ) : (
                filteredShortcuts.map((s) => (
                  <button
                    key={s.path}
                    onMouseDown={() => handleSearchSelect(s.path)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left
                      hover:bg-indigo-50 transition-colors group"
                  >
                    <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-700">{s.label}</p>
                      <p className="text-xs text-gray-400">{s.hint}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Mobile brand name */}
        <span className="sm:hidden text-sm font-bold text-gray-700">Oracle RMS</span>
      </div>

      <div className="flex items-center gap-1">
        {/* Notification Bell + Panel */}
        <div className="relative" data-notif-bell="true">
          <NotificationBell />
          {panelOpen && (
            <NotificationPanel
              activeCategory={notifCategory}
              onCategoryChange={setNotifCategory}
            />
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative ml-1" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gray-100 transition-colors"
          >
            <div className={`w-8 h-8 rounded-full ${roleColor} text-white flex items-center
              justify-center text-xs font-bold ring-2 ring-white shadow-sm`}>
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg
              border border-gray-100 py-1 z-50 animate-slide-down">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-full ${roleColor} text-white flex items-center
                    justify-center text-sm font-bold`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5
                      rounded-full capitalize ${
                        user?.role === 'admin'    ? 'bg-indigo-100 text-indigo-700' :
                        user?.role === 'manager'  ? 'bg-purple-100 text-purple-700' :
                                                    'bg-emerald-100 text-emerald-700'
                      }`}>
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setProfileOpen(false); navigate('/dashboard'); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm
                  text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4 text-indigo-500" /> Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm
                  text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
