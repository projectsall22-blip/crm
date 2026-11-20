import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, CheckCircle, XCircle, FileText } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, StatusBadge, Spinner, EmptyState, Pagination } from '../components/ui.jsx';

const POLICY_STATUSES = [
  'Draft','Policy Issuance Pending','Active','Expiring Soon',
  'Renewal Pending','Cancelled','Expired','Not Taken Up',
];

// Hide "." placeholder last name generated from single-word auto-created clients
function formatClientName(firstName, lastName) {
  const last = (lastName || '').trim();
  if (!last || last === '.') return (firstName || '').trim();
  return `${(firstName || '').trim()} ${last}`.trim();
}

export default function Policies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [policies, setPolicies]     = useState([]);
  const [pagination, setPagination] = useState({ page:1, pages:1, total:0 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]             = useState(1);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/policies', {
        params: { page, limit:20, search: search||undefined, policyStatus: statusFilter||undefined },
      });
      setPolicies(res.data.data);
      setPagination(res.data.pagination);
    } catch {} finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  const handleIssue = async (p) => {
    if (!p.policyNumber) return alert('Add a policy number before issuing.');
    if (!window.confirm(`Issue policy ${p.policyNumber}?`)) return;
    try { await api.post(`/policies/${p._id}/issue`); fetchPolicies(); }
    catch (err) { alert(err.response?.data?.message); }
  };

  const handleCancel = async (p) => {
    const reason = window.prompt('Cancellation reason:');
    if (reason === null) return;
    try { await api.post(`/policies/${p._id}/cancel`, { cancellationReason: reason }); fetchPolicies(); }
    catch (err) { alert(err.response?.data?.message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Policies</h1>
        {user?.role === 'manager' && (
          <button onClick={() => navigate('/policies/register')} className="btn-primary">
            <Plus className="w-4 h-4" /> Register Policy
          </button>
        )}
      </div>

      <Card>
        <div className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search policy number, reference…"
              className="input pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input w-auto"
          >
            <option value="">All Statuses</option>
            {POLICY_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div>
        ) : policies.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No policies found"
            action={<button onClick={() => navigate('/policies/register')} className="btn-primary">Register Policy</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Policy #</th>
                  <th>Acturis Ref</th>
                  <th>Client</th>
                  <th>Insurer</th>
                  <th>Insurance Type</th>
                  <th>Bill Type</th>
                  <th>Status</th>
                  <th>Effective</th>
                  <th>Expiry</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p._id} className="hover:bg-indigo-50">
                    <td>
                      <span className="font-mono text-xs font-semibold text-gray-700">
                        {p.policyNumber || <span className="text-gray-400 font-normal">{p.policyId}</span>}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{p.applicationReference || '—'}</td>
                    <td className="font-medium">{p.clientId ? formatClientName(p.clientId.firstName, p.clientId.lastName) : '—'}</td>
                    <td>{p.insurerId?.companyName || '—'}</td>
                    <td className="text-xs">{p.insuranceCategory || '—'}</td>
                    <td>
                      {p.billType ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${p.billType === 'Direct Bill' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {p.billType}
                        </span>
                      ) : '—'}
                    </td>
                    <td><StatusBadge status={p.policyStatus} /></td>
                    <td className="text-xs">{p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString() : '—'}</td>
                    <td className="text-xs">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(`/policies/${p._id}`)}
                          className="btn-outline py-1 px-2 text-xs" title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {p.policyStatus === 'Policy Issuance Pending' && user?.role === 'manager' && (
                          <button onClick={() => handleIssue(p)} className="btn-success py-1 px-2 text-xs" title="Issue">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {['Active','Policy Issuance Pending','Draft'].includes(p.policyStatus) && user?.role === 'manager' && (
                          <button onClick={() => handleCancel(p)} className="btn-danger py-1 px-2 text-xs" title="Cancel">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              onChange={setPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
