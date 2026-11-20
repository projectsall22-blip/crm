import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../services/api.js';
import { Card, StatusBadge, Spinner, EmptyState, Pagination } from '../components/ui.jsx';

const STATUSES = ['Pending','In Progress','Renewed','Lapsed','Cancelled'];

export default function Renewals() {
  const [renewals, setRenewals] = useState([]);
  const [pagination, setPagination] = useState({ page:1,pages:1,total:0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRenewals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/renewals', { params: { page, limit:20, status: statusFilter||undefined } });
      setRenewals(res.data.data);
      setPagination(res.data.pagination);
    } catch {} finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchRenewals(); }, [fetchRenewals]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Renewals</h1>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-auto">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div>
        ) : renewals.length === 0 ? (
          <EmptyState icon={RefreshCw} title="No renewals found" message="Renewals are created automatically 90 days before policy expiry." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Renewal #</th><th>Original Policy</th><th>Client</th><th>Producer</th><th>Expiry Date</th><th>Days Left</th><th>Status</th><th>Reminders</th></tr>
              </thead>
              <tbody>
                {renewals.map((r) => {
                  const daysLeft = Math.ceil((new Date(r.expiryDate) - new Date()) / (1000*60*60*24));
                  const urgent = daysLeft <= 30;
                  return (
                    <tr key={r._id} className={`hover:bg-slate-50 ${urgent && r.status==='Pending' ? 'bg-amber-50' : ''}`}>
                      <td className="font-mono text-xs">{r.renewalNumber}</td>
                      <td className="text-xs">{r.originalPolicyId?.policyNumber || r.originalPolicyId?.policyId || '—'}</td>
                      <td>{r.clientId ? `${r.clientId.firstName} ${r.clientId.lastName}` : '—'}</td>
                      <td>{r.producerId ? `${r.producerId.firstName} ${r.producerId.lastName}` : '—'}</td>
                      <td className="text-xs">{new Date(r.expiryDate).toLocaleDateString()}</td>
                      <td className={`font-semibold text-sm ${urgent ? 'text-red-600' : 'text-slate-700'}`}>{daysLeft > 0 ? `${daysLeft}d` : 'Expired'}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="text-xs">{r.reminders ? `${r.reminders.filter((x) => x.sent).length}/${r.reminders.length} sent` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
