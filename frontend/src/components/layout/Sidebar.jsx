import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Target, FileText,
  RefreshCw, CheckSquare, FolderOpen, Mail,
  Building2, BarChart3, Shield, Settings, UserCog, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const ALL_NAV = [
  { to: '/dashboard',    label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'producer'] },
  { to: '/clients',      label: 'Clients',   icon: Users,           roles: ['admin', 'manager', 'producer'] },
  { to: '/leads',        label: 'Leads',     icon: Target,          roles: ['admin', 'manager', 'producer'] },
  { to: '/leads/kanban', label: 'Pipeline',  icon: ClipboardList,   roles: ['admin', 'manager', 'producer'] },
  { to: '/policies',     label: 'Policies',  icon: FileText,        roles: ['admin', 'manager', 'producer'] },
  { to: '/renewals',     label: 'Renewals',  icon: RefreshCw,       roles: ['admin', 'manager', 'producer'] },
  { to: '/tasks',        label: 'Tasks',     icon: CheckSquare,     roles: ['admin', 'manager', 'producer'] },
  { to: '/documents',    label: 'Documents', icon: FolderOpen,      roles: ['admin', 'manager', 'producer'] },
  { to: '/email/logs',   label: 'Email Logs',icon: Mail,            roles: ['admin', 'manager', 'producer'] },
  {
    group: 'Administration',
    items: [
      { to: '/insurers',         label: 'Insurers',      icon: Building2, roles: ['admin'] },
      { to: '/products',         label: 'Products',      icon: FileText,  roles: ['admin'] },
      { to: '/users',            label: 'Users',         icon: UserCog,   roles: ['admin'] },
      { to: '/email/management', label: 'Email Settings',icon: Settings,  roles: ['admin'] },
      { to: '/reports',          label: 'Reports',       icon: BarChart3, roles: ['admin', 'manager'] },
      { to: '/audit-logs',       label: 'Audit Logs',    icon: Shield,    roles: ['admin'] },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`sidebar fixed lg:static inset-y-0 left-0 z-40
          transform transition-transform duration-300 lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="sidebar-logo shrink-0">
          <div className="sidebar-logo-icon">OR</div>
          <div>
            <p className="sidebar-logo-text leading-tight">Oracle RMS</p>
            <p className="text-[10px] text-indigo-400 leading-tight">London North</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {ALL_NAV.map((item, i) => {
            if (item.group) {
              const groupItems = item.items.filter((it) => it.roles.includes(user.role));
              if (!groupItems.length) return null;
              return (
                <div key={i}>
                  <p className="sidebar-section">{item.group}</p>
                  {groupItems.map((it) => (
                    <NavItem key={it.to} {...it} onClick={onClose} />
                  ))}
                </div>
              );
            }
            if (!item.roles.includes(user.role)) return null;
            return <NavItem key={item.to} {...item} onClick={onClose} />;
          })}
        </nav>

        <div className="sidebar-footer">v1.2.0</div>
      </aside>
    </>
  );
}

function NavItem({ to, label, icon: Icon, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard' || to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}
