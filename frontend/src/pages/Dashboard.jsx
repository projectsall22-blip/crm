import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Target, FileText, RefreshCw, CheckSquare,
  TrendingUp, AlertTriangle, Mail, BarChart3, Trophy,
  Clock, Zap, ArrowRight, ChevronRight, TrendingDown,
  Activity, Shield, Building2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { Card, Spinner } from '../components/ui.jsx';

/* ── Color palette ──────────────────────────────────────────── */
const CHART_COLORS = ['#4F46E5','#7C3AED','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899'];
const MONTH_NAMES  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── KPI card gradient configs ──────────────────────────────── */
const KPI_THEMES = {
  blue:   { from:'#3B82F6', to:'#1D4ED8', light:'#EFF6FF', text:'#1D4ED8', icon:'#BFDBFE' },
  purple: { from:'#8B5CF6', to:'#6D28D9', light:'#F5F3FF', text:'#6D28D9', icon:'#DDD6FE' },
  green:  { from:'#10B981', to:'#059669', light:'#ECFDF5', text:'#059669', icon:'#A7F3D0' },
  indigo: { from:'#4F46E5', to:'#3730A3', light:'#EEF2FF', text:'#3730A3', icon:'#C7D2FE' },
  yellow: { from:'#F59E0B', to:'#D97706', light:'#FFFBEB', text:'#B45309', icon:'#FDE68A' },
  red:    { from:'#EF4444', to:'#B91C1C', light:'#FEF2F2', text:'#B91C1C', icon:'#FECACA' },
  slate:  { from:'#64748B', to:'#334155', light:'#F8FAFC', text:'#334155', icon:'#CBD5E1' },
  teal:   { from:'#14B8A6', to:'#0F766E', light:'#F0FDFA', text:'#0F766E', icon:'#99F6E4' },
};

/* ══════════════════════════════════════════════════════════════
   ANIMATED COUNTER
══════════════════════════════════════════════════════════════ */
function AnimatedCounter({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (value == null || isNaN(Number(value))) return;
    const target = Number(value);
    const start  = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <span>{display.toLocaleString()}</span>;
}

/* ══════════════════════════════════════════════════════════════
   KPI CARD — gradient version
══════════════════════════════════════════════════════════════ */
function KpiCard({ icon: Icon, label, value, sub, color = 'indigo', onClick, trend, urgent }) {
  const theme = KPI_THEMES[color] || KPI_THEMES.indigo;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden rounded-2xl text-left w-full transition-all duration-300 group"
      style={{
        background: hovered
          ? `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)`
          : '#fff',
        boxShadow: hovered
          ? `0 8px 32px rgba(${hexToRgb(theme.from)}, 0.35)`
          : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        border: `1px solid ${hovered ? 'transparent' : '#F1F5F9'}`,
      }}
    >
      {/* Background decoration blob */}
      <div
        className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 transition-opacity duration-300"
        style={{ background: hovered ? '#fff' : theme.from, opacity: hovered ? 0.15 : 0.08 }}
      />

      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-xs font-semibold uppercase tracking-widest transition-colors duration-300 ${
              hovered ? 'text-white/70' : 'text-gray-500'
            }`}>
              {label}
            </p>
            <p className={`text-3xl font-bold mt-1.5 transition-colors duration-300 ${
              hovered ? 'text-white' : 'text-gray-900'
            }`}>
              {value != null ? <AnimatedCounter value={value} /> : '—'}
            </p>
            {sub && (
              <p className={`text-xs mt-1 transition-colors duration-300 ${
                hovered ? 'text-white/70' : 'text-gray-400'
              }`}>
                {sub}
              </p>
            )}
          </div>

          {/* Icon box */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
            style={{
              background: hovered ? 'rgba(255,255,255,0.2)' : theme.light,
            }}
          >
            <Icon className={`w-5 h-5 transition-colors duration-300 ${
              hovered ? 'text-white' : ''
            }`} style={{ color: hovered ? '#fff' : theme.text }} />
          </div>
        </div>

        {/* Trend indicator */}
        {trend != null && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
            trend >= 0
              ? (hovered ? 'text-green-200' : 'text-emerald-600')
              : (hovered ? 'text-red-200'   : 'text-red-500')
          }`}>
            {trend >= 0
              ? <TrendingUp  className="w-3.5 h-3.5" />
              : <TrendingDown className="w-3.5 h-3.5" />
            }
            <span>{trend >= 0 ? '+' : ''}{trend}% vs last month</span>
          </div>
        )}

        {/* Urgent badge */}
        {urgent && value > 0 && (
          <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${
            hovered ? 'text-yellow-200' : 'text-red-600'
          }`}>
            <Zap className="w-3 h-3" /> Needs attention
          </div>
        )}

        {/* Arrow on hover */}
        <div className={`absolute right-4 bottom-4 transition-all duration-300 ${
          hovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
        }`}>
          <ChevronRight className="w-4 h-4 text-white/70" />
        </div>
      </div>
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   URGENCY ALERT BANNER
══════════════════════════════════════════════════════════════ */
function UrgencyBanner({ summary, onNavigate }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const alerts = [];
  if (summary?.overdueTasks > 0)
    alerts.push({ icon: CheckSquare, msg: `${summary.overdueTasks} overdue task${summary.overdueTasks > 1 ? 's' : ''}`, path: '/tasks?overdue=true', color: 'text-red-700' });
  if (summary?.expiringPolicies > 0)
    alerts.push({ icon: AlertTriangle, msg: `${summary.expiringPolicies} polic${summary.expiringPolicies > 1 ? 'ies' : 'y'} expiring within 14 days`, path: '/policies', color: 'text-orange-700' });
  if (summary?.upcomingRenewals > 0)
    alerts.push({ icon: RefreshCw, msg: `${summary.upcomingRenewals} renewal${summary.upcomingRenewals > 1 ? 's' : ''} due within 30 days`, path: '/renewals', color: 'text-amber-700' });
  if (summary?.pendingIssuance > 0)
    alerts.push({ icon: Clock, msg: `${summary.pendingIssuance} polic${summary.pendingIssuance > 1 ? 'ies' : 'y'} awaiting issuance`, path: '/policies?policyStatus=Policy+Issuance+Pending', color: 'text-blue-700' });

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-3.5 animate-slide-down">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Action Required</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {alerts.map((a, i) => (
              <button
                key={i}
                onClick={() => onNavigate(a.path)}
                className={`flex items-center gap-1.5 text-sm font-medium hover:underline ${a.color}`}
              >
                <a.icon className="w-3.5 h-3.5" />
                {a.msg}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 transition-colors shrink-0 text-lg leading-none"
        >×</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CUSTOM CHART TOOLTIP
══════════════════════════════════════════════════════════════ */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2.5 text-xs">
      {label && <p className="font-semibold text-gray-700 mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   QUICK ACTION CARD
══════════════════════════════════════════════════════════════ */
function QuickActionCard({ label, desc, icon: Icon, onClick, colorClass, iconBg }) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 p-4 rounded-xl border border-transparent
        hover:border-indigo-200 hover:bg-indigo-50/60 transition-all duration-200 text-left w-full`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5 truncate">{desc}</p>}
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500
        group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   ACTIVITY FEED ICONS
══════════════════════════════════════════════════════════════ */
const ACTIVITY_ICON_MAP = {
  create:            { icon: Activity,  bg: 'bg-indigo-100', color: 'text-indigo-600' },
  update:            { icon: Activity,  bg: 'bg-blue-100',   color: 'text-blue-600'   },
  status_change:     { icon: RefreshCw, bg: 'bg-purple-100', color: 'text-purple-600' },
  won:               { icon: Trophy,    bg: 'bg-emerald-100',color: 'text-emerald-600'},
  lost:              { icon: TrendingDown, bg: 'bg-red-100', color: 'text-red-500'    },
  policy_registered: { icon: FileText,  bg: 'bg-indigo-100', color: 'text-indigo-600' },
  renewal:           { icon: RefreshCw, bg: 'bg-amber-100',  color: 'text-amber-600'  },
  assignment:        { icon: Users,     bg: 'bg-blue-100',   color: 'text-blue-600'   },
  note:              { icon: Activity,  bg: 'bg-gray-100',   color: 'text-gray-500'   },
  call:              { icon: Activity,  bg: 'bg-teal-100',   color: 'text-teal-600'   },
  email:             { icon: Mail,      bg: 'bg-sky-100',    color: 'text-sky-600'    },
  follow_up:         { icon: Clock,     bg: 'bg-amber-100',  color: 'text-amber-600'  },
  login:             { icon: Shield,    bg: 'bg-gray-100',   color: 'text-gray-500'   },
  payment:           { icon: TrendingUp,bg: 'bg-emerald-100',color: 'text-emerald-600'},
};
const DEFAULT_ACTIVITY = { icon: Activity, bg: 'bg-gray-100', color: 'text-gray-500' };

/* ══════════════════════════════════════════════════════════════
   EMAIL PROGRESS BAR
══════════════════════════════════════════════════════════════ */
function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HELPER: hex → rgb for box-shadow
══════════════════════════════════════════════════════════════ */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function EmptyChart() {
  return (
    <div className="h-[220px] flex flex-col items-center justify-center text-gray-300 gap-2">
      <BarChart3 className="w-8 h-8" />
      <span className="text-xs">No data yet</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { summary: notifSummary } = useNotifications();

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [taskStats, setTaskStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ovRes, taskRes] = await Promise.all([
          api.get('/reports/overview'),
          api.get('/tasks/stats'),
        ]);
        setData(ovRes.data);
        setTaskStats(taskRes.data);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-indigo-100 border-t-indigo-600 animate-spin"
          style={{ borderWidth: 3 }} />
        <p className="text-sm text-gray-400">Loading dashboard…</p>
      </div>
    );
  }
  if (!data) return (
    <div className="text-gray-400 p-8 text-center">Failed to load dashboard data.</div>
  );

  const { leads, policies, clients, producers, email, recentActivities } = data;
  const isAdmin   = user.role === 'admin';
  const isManager = user.role === 'manager';
  const isProducer= user.role === 'producer';

  /* Chart data */
  const monthlyTrend = (leads.monthlyTrend || []).map((m) => ({
    name: `${MONTH_NAMES[m._id.month - 1]} '${String(m._id.year).slice(2)}`,
    Leads: m.count,
  }));

  const leadStatusPie = (leads.statusDistribution || [])
    .map((s) => ({ name: s._id, value: s.count }))
    .filter((s) => s.value > 0);

  const policyStatusBar = (policies.statusDistribution || [])
    .map((s) => ({ name: s._id, count: s.count }))
    .filter((s) => s.count > 0);

  /* Email totals */
  const emailTotal = Object.values(email?.stats || {}).reduce((a, b) => a + b, 0);

  /* Urgency summary merged from notifSummary + local data */
  const urgencySummary = {
    overdueTasks:     taskStats?.overdue || 0,
    expiringPolicies: notifSummary?.expiringPolicies || 0,
    upcomingRenewals: policies?.upcomingRenewals || 0,
    pendingIssuance:  policies?.pendingIssuance || 0,
  };

  /* ── Render ── */
  return (
    <div className="space-y-6 pb-6">

      {/* ── Hero Header ──────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl px-6 py-5"
        style={{
          background: 'linear-gradient(135deg, #2E2A7E 0%, #4F46E5 60%, #7C3AED 100%)',
          boxShadow: '0 4px 24px rgba(79,70,229,0.25)',
        }}>
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        {/* Decorative blobs */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white opacity-5" />
        <div className="absolute right-20 -bottom-6 w-24 h-24 rounded-full bg-purple-300 opacity-10" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-indigo-200 text-sm font-medium">
              {new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
            <h1 className="text-2xl font-bold text-white mt-0.5">
              Good {getTimeOfDay()}, {user.firstName} 👋
            </h1>
            <p className="text-indigo-200 text-sm mt-1">
              {isAdmin   && 'Full system overview — all agents & data visible.'}
              {isManager && 'Team performance & pipeline at a glance.'}
              {isProducer && `You have ${taskStats?.pending || 0} pending task${taskStats?.pending !== 1 ? 's' : ''} today.`}
            </p>
          </div>
          {(isAdmin || isManager) && (
            <button
              onClick={() => navigate('/reports')}
              className="shrink-0 flex items-center gap-2 bg-white/15 hover:bg-white/25
                text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors backdrop-blur-sm"
            >
              <BarChart3 className="w-4 h-4" /> Full Reports
            </button>
          )}
        </div>
      </div>

      {/* ── Urgency Banner ───────────────────────────────────── */}
      <UrgencyBanner summary={urgencySummary} onNavigate={navigate} />

      {/* ── KPI Row ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isAdmin && (
            <KpiCard icon={Users}         label="Total Clients"       value={clients?.total}            color="blue"
              onClick={() => navigate('/clients')} />
          )}
          <KpiCard   icon={Target}        label="Total Leads"         value={leads.total}               color="purple"
            onClick={() => navigate('/leads')} />
          <KpiCard   icon={Trophy}        label="Won Leads"           value={leads.won}                 color="green"
            sub={`${leads.conversionRate}% conversion rate`}
            onClick={() => navigate('/leads?leadStatus=Won')} />
          <KpiCard   icon={FileText}      label="Active Policies"     value={policies.active}           color="indigo"
            onClick={() => navigate('/policies?policyStatus=Active')} />
          {isAdmin && (
            <KpiCard icon={Users}         label="Producers"           value={producers?.total}          color="slate"
              onClick={() => navigate('/users?role=producer')} />
          )}
          <KpiCard   icon={Clock}         label="Pending Issuance"    value={policies.pendingIssuance}  color="yellow"
            urgent={policies.pendingIssuance > 0}
            onClick={() => navigate('/policies?policyStatus=Policy+Issuance+Pending')} />
          <KpiCard   icon={RefreshCw}     label="Upcoming Renewals"   value={policies.upcomingRenewals} color="teal"
            sub="Next 90 days"
            onClick={() => navigate('/renewals')} />
          <KpiCard   icon={CheckSquare}   label="Overdue Tasks"       value={taskStats?.overdue || 0}   color="red"
            urgent={(taskStats?.overdue || 0) > 0}
            onClick={() => navigate('/tasks?overdue=true')} />
        </div>
      </div>

      {/* ── Charts Row ───────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Monthly Lead Trend */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Lead Trend</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5" />
                {leads.total} total
              </div>
            </div>
            <div className="p-5 pt-3">
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="Leads" stroke="#4F46E5" strokeWidth={2.5}
                      fill="url(#leadGrad)" dot={{ r: 3, fill: '#4F46E5' }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </div>
          </div>

          {/* Lead Status Pie */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Lead Pipeline</h3>
                <p className="text-xs text-gray-400 mt-0.5">Status distribution</p>
              </div>
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
                {leadStatusPie.length} stages
              </span>
            </div>
            <div className="p-5 pt-3">
              {leadStatusPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={leadStatusPie}
                      cx="50%" cy="45%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {leadStatusPie.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="circle" iconSize={8}
                      formatter={(v) => <span className="text-xs text-gray-600">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </div>
          </div>

          {/* Policy Status Bar */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Policy Overview</h3>
                <p className="text-xs text-gray-400 mt-0.5">By status</p>
              </div>
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {policies.active} active
              </span>
            </div>
            <div className="p-5 pt-3">
              {policyStatusBar.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={policyStatusBar} margin={{ top: 5, right: 10, left: -20, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }}
                      angle={-35} textAnchor="end" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {policyStatusBar.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </div>
          </div>

          {/* Email Summary with progress bars */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Email Summary</h3>
                <p className="text-xs text-gray-400 mt-0.5">{emailTotal} emails total</p>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                Number(email?.deliveryRate) >= 80
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                <Mail className="w-3.5 h-3.5" />
                {email?.deliveryRate || 0}% delivery
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Delivery Rate big bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-gray-600">Delivery Rate</span>
                  <span className="font-bold text-emerald-600">{email?.deliveryRate || 0}%</span>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000"
                    style={{ width: `${email?.deliveryRate || 0}%` }}
                  />
                </div>
              </div>

              {/* Individual stats */}
              {[
                { label: 'Sent',    value: email?.stats?.Sent    || 0, color: 'bg-indigo-500',  textColor: 'text-indigo-600'  },
                { label: 'Pending', value: email?.stats?.Pending || 0, color: 'bg-amber-400',   textColor: 'text-amber-600'   },
                { label: 'Failed',  value: email?.stats?.Failed  || 0, color: 'bg-red-400',     textColor: 'text-red-600'     },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{s.label}</span>
                    <span className={`font-semibold ${s.textColor}`}>{s.value.toLocaleString()}</span>
                  </div>
                  <ProgressBar value={s.value} max={emailTotal || 1} color={s.color} />
                </div>
              ))}

              <button
                onClick={() => navigate('/email/logs')}
                className="w-full flex items-center justify-center gap-2 mt-2 py-2 rounded-xl
                  bg-indigo-50 text-indigo-600 text-sm font-semibold
                  hover:bg-indigo-100 transition-colors"
              >
                <Mail className="w-4 h-4" /> View Email Logs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Activity + Quick Actions ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Activities */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Recent Activity</h3>
              <p className="text-xs text-gray-400 mt-0.5">Latest actions across the system</p>
            </div>
          </div>
          {recentActivities?.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {recentActivities.map((a, i) => {
                const cfg  = ACTIVITY_ICON_MAP[a.type] || DEFAULT_ACTIVITY;
                const Icon = cfg.icon;
                return (
                  <li key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50/60 transition-colors">
                    {/* Activity type icon */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug line-clamp-2">{a.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center
                          justify-center text-[9px] font-bold shrink-0">
                          {a.performedBy?.firstName?.[0] || '?'}
                        </div>
                        <p className="text-xs text-gray-400">
                          {a.performedBy?.firstName} {a.performedBy?.lastName} · {timeAgo(a.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-8 text-center">
              <Activity className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No recent activities.</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Quick Actions</h3>
            <p className="text-xs text-gray-400 mt-0.5">Common tasks at a click</p>
          </div>
          <div className="p-3 space-y-1">
            <QuickActionCard label="New Client"       desc="Add a new client to the system"
              icon={Users}       iconBg="bg-blue-100"    colorClass="text-blue-600"
              onClick={() => navigate('/clients')} />
            <QuickActionCard label="New Lead"         desc="Create and assign a lead"
              icon={Target}      iconBg="bg-purple-100"  colorClass="text-purple-600"
              onClick={() => navigate('/leads')} />
            {(isAdmin || isManager) && (
              <QuickActionCard label="Register Policy" desc="Issue a new policy from a lead"
                icon={FileText}  iconBg="bg-indigo-100"  colorClass="text-indigo-600"
                onClick={() => navigate('/policies/register')} />
            )}
            <QuickActionCard label="View Renewals"    desc="Upcoming policy renewals"
              icon={RefreshCw}   iconBg="bg-teal-100"    colorClass="text-teal-600"
              onClick={() => navigate('/renewals')} />
            <QuickActionCard label="My Tasks"         desc="View & manage your tasks"
              icon={CheckSquare} iconBg="bg-rose-100"    colorClass="text-rose-600"
              onClick={() => navigate('/tasks')} />
            {(isAdmin || isManager) && (
              <QuickActionCard label="Reports"        desc="Analytics & performance"
                icon={BarChart3} iconBg="bg-amber-100"   colorClass="text-amber-600"
                onClick={() => navigate('/reports')} />
            )}
            {(isAdmin || isManager) && (
              <QuickActionCard label="Email Logs"     desc="Delivery & email tracking"
                icon={Mail}      iconBg="bg-sky-100"     colorClass="text-sky-600"
                onClick={() => navigate('/email/logs')} />
            )}
          </div>
        </div>
      </div>

      {/* ── Producer My Pipeline (producer role only) ─────────── */}
      {isProducer && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">My Pipeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PipelineCard
              label="New Leads"
              value={leads.new || 0}
              icon={Target}
              gradient="from-purple-500 to-indigo-600"
              desc="Leads awaiting contact"
              onClick={() => navigate('/leads?leadStatus=New')}
            />
            <PipelineCard
              label="In Progress"
              value={leads.inProgress || 0}
              icon={Activity}
              gradient="from-blue-500 to-cyan-600"
              desc="Active negotiations"
              onClick={() => navigate('/leads?leadStatus=In+Progress')}
            />
            <PipelineCard
              label="Won This Period"
              value={leads.won || 0}
              icon={Trophy}
              gradient="from-emerald-500 to-teal-600"
              desc={`${leads.conversionRate}% conversion rate`}
              onClick={() => navigate('/leads?leadStatus=Won')}
            />
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Producer Pipeline Card ──────────────────────────────────── */
function PipelineCard({ label, value, icon: Icon, gradient, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl p-5 text-left w-full group transition-all duration-300
        hover:-translate-y-1"
      style={{ background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))` }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-100 rounded-2xl`} />
      <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white opacity-10" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">{label}</p>
            <p className="text-4xl font-bold text-white mt-1">
              <AnimatedCounter value={value} />
            </p>
            <p className="text-white/60 text-xs mt-1">{desc}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3 text-white/70 text-xs group-hover:text-white transition-colors">
          View details <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </button>
  );
}
