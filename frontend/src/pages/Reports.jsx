import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../services/api.js';
import { Card, Spinner } from '../components/ui.jsx';

const COLORS = ['#3a6291','#5780ad','#8babc9','#e95555','#f59e0b','#10b981','#6366f1','#ec4899'];

export default function Reports() {
  const [overview, setOverview] = useState(null);
  const [producerReports, setProducerReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [ovRes, prRes] = await Promise.all([
          api.get('/reports/overview'),
          api.get('/reports/producers'),
        ]);
        setOverview(ovRes.data);
        setProducerReports(prRes.data.reports || []);
      } catch {} finally { setLoading(false); }
    };
    fetchReports();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>;
  if (!overview) return null;

  const { leads, policies, commissions, clients } = overview;

  const producerBarData = producerReports.map((r) => ({
    name: `${r.producer.firstName} ${r.producer.lastName}`,
    Leads: r.leads, Won: r.wonLeads, Policies: r.activePolicies, Commission: r.totalCommission,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Reports & Analytics</h1>

      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {['Overview','Producer Performance','Lead Analysis','Policy Analysis'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab===t ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t}</button>
          ))}
        </nav>
      </div>

      {tab === 'Overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Total Clients', clients.total, 'text-blue-700'],
              ['Total Leads', leads.total, 'text-purple-700'],
              ['Won Leads', leads.won, 'text-emerald-700'],
              ['Conversion Rate', `${leads.conversionRate}%`, 'text-indigo-700'],
              ['Active Policies', policies.active, 'text-indigo-700'],
              ['Pending Issuance', policies.pendingIssuance, 'text-amber-700'],
              ['Upcoming Renewals', policies.upcomingRenewals, 'text-blue-700'],
              ['Overdue Payments', policies.overduePayments, 'text-red-700'],
            ].map(([l,v,c]) => (
              <div key={l} className="card card-body">
                <p className="text-xs text-slate-500">{l}</p>
                <p className={`text-2xl font-bold mt-1 ${c}`}>{v}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="card card-body">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Total Premium</h3>
              <p className="text-3xl font-bold text-indigo-700">{formatCurrency(policies.totalPremium)}</p>
            </div>
            <div className="card card-body">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Total Commission</h3>
              <p className="text-3xl font-bold text-emerald-700">{formatCurrency(commissions.total)}</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'Producer Performance' && (
        <div className="space-y-5">
          <Card title="Producer Performance Comparison">
            <div className="p-5">
              {producerBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={producerBarData} margin={{ top:10, right:10, left:-10, bottom:60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize:11 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize:11 }} />
                    <Tooltip />
                    <Bar dataKey="Leads" fill="#3a6291" radius={[4,4,0,0]} />
                    <Bar dataKey="Won" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="Policies" fill="#6366f1" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-400 text-sm">No producer data.</p>}
            </div>
          </Card>
          <Card>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr><th>Producer</th><th>Clients</th><th>Leads</th><th>Won</th><th>Rate</th><th>Active Policies</th></tr>
                </thead>
                <tbody>
                  {producerReports.map((r) => (
                    <tr key={r.producer._id} className="hover:bg-slate-50">
                      <td className="font-medium">{r.producer.firstName} {r.producer.lastName}</td>
                      <td>{r.clients}</td><td>{r.leads}</td><td>{r.wonLeads}</td>
                      <td><span className={`font-semibold ${Number(r.conversionRate)>=50?'text-emerald-600':'text-amber-600'}`}>{r.conversionRate}%</span></td>
                      <td>{r.activePolicies}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'Lead Analysis' && (
        <div className="space-y-5">
          <Card title="Lead Status Distribution">
            <div className="p-5">
              {leads.statusDistribution?.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={leads.statusDistribution.map((s) => ({ name:s._id, count:s.count }))} margin={{ top:10,right:10,left:-10,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize:11 }} />
                    <YAxis tick={{ fontSize:11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4,4,0,0]}>
                      {leads.statusDistribution.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-400 text-sm">No data.</p>}
            </div>
          </Card>
        </div>
      )}

      {tab === 'Policy Analysis' && (
        <div className="space-y-5">
          <Card title="Policy Status Distribution">
            <div className="p-5">
              {policies.statusDistribution?.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={policies.statusDistribution.map((s) => ({ name:s._id, count:s.count }))} margin={{ top:10,right:10,left:-10,bottom:60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize:10 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize:11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4,4,0,0]}>
                      {policies.statusDistribution.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-400 text-sm">No data.</p>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function formatCurrency(val) {
  if (!val && val!==0) return '—';
  return new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD', maximumFractionDigits:0 }).format(val);
}
