import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import api from '../services/api.js';
import { Card, Spinner, EmptyState, Pagination, Modal } from '../components/ui.jsx';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page:1,pages:1,total:0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [userFilter, setUserFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs', { params: { page, limit:30, userId:userFilter||undefined, method:methodFilter||undefined } });
      setLogs(res.data.data); setPagination(res.data.pagination);
    } catch {} finally { setLoading(false); }
  }, [page, userFilter, methodFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Audit Logs</h1>
        <button onClick={fetchLogs} className="btn-outline"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>
      <Card>
        <div className="p-4 flex gap-3 flex-wrap">
          <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }} className="input w-auto">
            <option value="">All Methods</option>
            {['GET','POST','PUT','PATCH','DELETE'].map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        {loading ? <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div> : logs.length===0 ? (
          <EmptyState icon={Shield} title="No audit logs found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Method</th><th>Path</th><th>Action</th><th>User</th><th>Role</th><th>Status</th><th>Duration</th><th>Date</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50 cursor-pointer text-xs" onClick={() => setSelected(l)}>
                    <td><span className={`font-mono font-semibold ${l.method==='DELETE'?'text-red-600':l.method==='POST'?'text-emerald-600':l.method==='PUT'||l.method==='PATCH'?'text-amber-600':'text-slate-600'}`}>{l.method}</span></td>
                    <td className="font-mono max-w-[200px] truncate">{l.path}</td>
                    <td>{l.action}</td>
                    <td>{l.userId ? `${l.userId.firstName} ${l.userId.lastName}` : l.userEmail || '—'}</td>
                    <td className="capitalize">{l.userRole}</td>
                    <td><span className={`font-semibold ${l.statusCode>=400?'text-red-600':'text-emerald-600'}`}>{l.statusCode}</span></td>
                    <td>{l.durationMs}ms</td>
                    <td>{new Date(l.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onChange={setPage} />
          </div>
        )}
      </Card>
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Audit Log Detail" size="lg">
        {selected && (
          <dl className="space-y-2 text-sm">
            {[['Method',selected.method],['Path',selected.path],['Action',selected.action],['User',selected.userId?`${selected.userId.firstName} ${selected.userId.lastName}`:selected.userEmail||'—'],['Role',selected.userRole],['Status',selected.statusCode],['IP',selected.ip],['Duration',`${selected.durationMs}ms`],['Date',new Date(selected.createdAt).toLocaleString()],['Error',selected.error||'—']].map(([l,v]) => (
              <div key={l} className="flex gap-3"><dt className="text-slate-500 w-24 shrink-0">{l}</dt><dd className="text-slate-800 break-all font-mono text-xs">{v}</dd></div>
            ))}
            {selected.requestBody && Object.keys(selected.requestBody).length > 0 && (
              <div><dt className="text-slate-500 mb-1">Request Body</dt><dd><pre className="bg-slate-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(selected.requestBody, null, 2)}</pre></dd></div>
            )}
          </dl>
        )}
      </Modal>
    </div>
  );
}
