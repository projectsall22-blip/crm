import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Target, FileText, RefreshCw,
  CheckSquare, TrendingUp, AlertTriangle, Mail,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Spinner } from '../components/ui.jsx';

const COLORS = ['#4F46E5','#7C3AED','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Dashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
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

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8" /></div>;
  if (!data)   return <div className="text-gray-400 p-8 text-center">Failed to load dashboard data.</div>;

  const { leads, policies, clients, producers, email, recentActivities } = data;
  const isAdmin   = user.role === 'admin';
  const isManager = user.role === 'manager';

  const monthlyTrend = (leads.monthlyTrend || []).map((m) => ({
    name: `${MONTH_NAMES[m._id.month - 1]} ${String(m._id.year).slice(2)}`,
    Leads: m.count,
  }));

  const leadStatusPie = (leads.statusDistribution || [])
    .map((s) => ({ name: s._id, value: s.count }))
    .filter((s) => s.value > 0);

  const policyStatusBar = (policies.statusDistribution || [])
    .map((s) => ({ name: s._id, count: s.count }))
    .filter((s) => s.count > 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {getTimeOfDay()}, {user.firstName}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </p>
        </div>
        {(isAdmin || isManager) && (
          <button onClick={() => navigate('/reports')} className="btn-outline gap-2">
            <BarChart3 className="w-4 h-4" /> Full Reports
          </button>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isAdmin && <KpiCard icon={Users}         label="Total Clients"      value={clients?.total}          color="blue"   onClick={() => navigate('/clients')} />}
        <KpiCard icon={Target}       label="Total Leads"        value={leads.total}             color="purple" onClick={() => navigate('/leads')} />
        <KpiCard icon={TrendingUp}   label="Won Leads"          value={leads.won}               color="green"  onClick={() => navigate('/leads?leadStatus=Won')} sub={`${leads.conversionRate}% rate`} />
        <KpiCard icon={FileText}     label="Active Policies"    value={policies.active}         color="indigo" onClick={() => navigate('/policies?policyStatus=Active')} />
        {isAdmin && <KpiCard icon={Users} label="Producers" value={producers?.total} color="slate" onClick={() => navigate('/users?role=producer')} />}
        <KpiCard icon={AlertTriangle} label="Pending Issuance"  value={policies.pendingIssuance} color="yellow" onClick={() => navigate('/policies?policyStatus=Policy+Issuance+Pending')} />
        <KpiCard icon={RefreshCw}    label="Upcoming Renewals"  value={policies.upcomingRenewals} color="blue" onClick={() => navigate('/renewals')} sub="Next 90 days" />
        <KpiCard icon={CheckSquare}  label="Overdue Tasks"      value={taskStats?.overdue || 0} color="red"    onClick={() => navigate('/tasks?overdue=true')} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Lead Trend */}
        <Card title="Lead Trend (Last 6 Months)">
          <div className="p-5 pt-2">
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyTrend} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Leads" stroke="#4F46E5" strokeWidth={2} fill="url(#leadGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </Card>

        {/* Lead Status Pie */}
        <Card title="Lead Pipeline Status">
          <div className="p-5 pt-2">
            {leadStatusPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={leadStatusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                    labelLine={false}>
                    {leadStatusPie.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </Card>

        {/* Policy Status Bar */}
        <Card title="Policy Status Overview">
          <div className="p-5 pt-2">
            {policyStatusBar.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={policyStatusBar} margin={{ top:5, right:10, left:-20, bottom:40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize:10 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize:11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {policyStatusBar.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </Card>

        {/* Email Stats */}
        <Card title="Email Summary">
          <div className="p-5 pt-2 space-y-3">
            <SummaryRow label="Delivery Rate"  value={`${email?.deliveryRate || 0}%`}       color="text-emerald-600" />
            <SummaryRow label="Emails Sent"    value={email?.stats?.Sent    || 0}            color="text-indigo-600" />
            <SummaryRow label="Pending"        value={email?.stats?.Pending || 0}            color="text-amber-600" />
            <SummaryRow label="Failed"         value={email?.stats?.Failed  || 0}            color="text-red-600" />
            <div className="pt-2">
              <button onClick={() => navigate('/email/logs')} className="btn-outline btn-sm w-full justify-center">
                <Mail className="w-4 h-4" /> View Email Logs
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activities & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card title="Recent Activities">
          {recentActivities?.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {recentActivities.map((a, i) => (
                <li key={i} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {a.performedBy?.firstName?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{a.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.performedBy?.firstName} {a.performedBy?.lastName} · {timeAgo(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5 text-sm text-gray-400 text-center">No recent activities.</div>
          )}
        </Card>

        <Card title="Quick Actions">
          <div className="p-5 grid grid-cols-2 gap-3">
            <QuickAction label="New Client"       icon={Users}      color="bg-blue-50 text-blue-700"   onClick={() => navigate('/clients')} />
            <QuickAction label="New Lead"         icon={Target}     color="bg-purple-50 text-purple-700" onClick={() => navigate('/leads')} />
            <QuickAction label="Register Policy"  icon={FileText}   color="bg-indigo-50 text-indigo-700" onClick={() => navigate('/policies/register')} />
            <QuickAction label="View Renewals"    icon={RefreshCw}  color="bg-amber-50 text-amber-700"  onClick={() => navigate('/renewals')} />
            <QuickAction label="My Tasks"         icon={CheckSquare}color="bg-rose-50 text-rose-700"    onClick={() => navigate('/tasks')} />
            {(isAdmin || isManager) && (
              <QuickAction label="Email Logs"     icon={Mail}       color="bg-sky-50 text-sky-700"      onClick={() => navigate('/email/logs')} />
            )}
            {(isAdmin || isManager) && (
              <QuickAction label="Reports"        icon={BarChart3}  color="bg-teal-50 text-teal-700"    onClick={() => navigate('/reports')} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, color, onClick }) {
  const bg = {
    blue:'bg-blue-50 text-blue-600', purple:'bg-purple-50 text-purple-600',
    green:'bg-emerald-50 text-emerald-600', indigo:'bg-indigo-50 text-indigo-600',
    yellow:'bg-amber-50 text-amber-600', red:'bg-red-50 text-red-600',
    slate:'bg-gray-100 text-gray-600',
  };
  return (
    <button onClick={onClick} className="card card-body text-left hover:shadow-md transition-shadow w-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg[color] || bg.slate}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </button>
  );
}

function QuickAction({ label, icon: Icon, onClick, color }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-sm font-semibold transition-colors hover:opacity-80 ${color}`}>
      <Icon className="w-5 h-5" />
      <span className="text-xs">{label}</span>
    </button>
  );
}

function SummaryRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function EmptyChart() {
  return <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">No data yet</div>;
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
