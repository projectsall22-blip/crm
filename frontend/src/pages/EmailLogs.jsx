import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Mail } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, StatusBadge, Spinner, EmptyState, Pagination, Modal } from '../components/ui.jsx';

const STATUSES = ['Pending', 'Sent', 'Failed', 'Retrying'];

const COLOR_MAP = {
  green: 'text-emerald-600',
  red:   'text-red-600',
  yellow:'text-amber-600',
  blue:  'text-blue-600',
  slate: 'text-gray-800',
};

export default function EmailLogs() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [logs, setLogs]           = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected]   = useState(null);
  const [stats, setStats]         = useState({});

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [logRes, statRes] = await Promise.all([
        api.get('/email/logs', {
          params: { page, limit: 20, status: statusFilter || undefined },
        }),
        api.get('/email/logs/stats'),
      ]);
      setLogs(logRes.data.data || []);
      setPagination(logRes.data.pagination);
      setStats(statRes.data.stats || {});
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleRetry = async (log, e) => {
    e.stopPropagation();
    try {
      await api.post(`/email/logs/${log._id}/retry`);
      fetchLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Retry failed');
    }
  };

  const STAT_CARDS = [
    { label: 'Total',    value: stats.total        || 0, color: 'slate' },
    { label: 'Sent',     value: stats.Sent         || 0, color: 'green' },
    { label: 'Pending',  value: stats.Pending      || 0, color: 'yellow' },
    { label: 'Failed',   value: stats.Failed       || 0, color: 'red' },
    { label: 'Delivery', value: `${stats.deliveryRate || 0}%`, color: 'blue' },
  ];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Email Logs</h1>
          {/* Role-based subtitle */}
          <p className="text-xs text-gray-400 mt-0.5">
            {isAdminOrManager
              ? 'All system email logs'
              : 'Your sent email logs'}
          </p>
        </div>
        <button onClick={fetchLogs} className="btn-outline gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STAT_CARDS.map(({ label, value, color }) => (
          <div key={label} className="card card-body text-center py-4">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${COLOR_MAP[color]}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card>
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-gray-100">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input w-auto text-sm"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          {isAdminOrManager && (
            <span className="text-xs text-gray-400 ml-auto">
              Showing logs from all producers
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="w-7 h-7" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No email logs found"
            message={isAdminOrManager ? 'No emails have been sent yet.' : 'You have not sent any emails yet.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Subject</th>
                  <th>Recipients</th>
                  {/* Sent By column — admin/manager only */}
                  {isAdminOrManager && <th>Sent By</th>}
                  <th>Trigger</th>
                  <th>Status</th>
                  <th>Retries</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr
                    key={l._id}
                    className="hover:bg-indigo-50 cursor-pointer"
                    onClick={() => setSelected(l)}
                  >
                    <td className="font-mono text-xs text-gray-500">{l.logId}</td>
                    <td className="max-w-[180px] truncate font-medium text-gray-800">{l.subject}</td>
                    <td className="text-xs text-gray-500 max-w-[160px] truncate">
                      {(l.recipients || []).join(', ') || '—'}
                    </td>
                    {/* Sent By — admin/manager only */}
                    {isAdminOrManager && (
                      <td className="text-xs text-gray-600">
                        {l.initiatedBy
                          ? `${l.initiatedBy.firstName} ${l.initiatedBy.lastName}`
                          : <span className="text-gray-400">System</span>}
                        {l.initiatedBy?.role && (
                          <span className="ml-1 text-[10px] text-gray-400 capitalize">
                            ({l.initiatedBy.role})
                          </span>
                        )}
                      </td>
                    )}
                    <td className="text-xs capitalize text-gray-500">
                      {l.triggerType?.replace(/_/g, ' ') || '—'}
                    </td>
                    <td><StatusBadge status={l.status} /></td>
                    <td className="text-xs text-gray-500">{l.retryCount}</td>
                    <td className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td>
                      {['Failed', 'Retrying'].includes(l.status) && (
                        <button
                          onClick={(e) => handleRetry(l, e)}
                          className="btn-outline btn-sm"
                        >
                          Retry
                        </button>
                      )}
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

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Email Log Details"
        size="lg"
      >
        {selected && (
          <div className="space-y-3 text-sm">
            {[
              ['Log ID',      selected.logId],
              ['Subject',     selected.subject],
              ['From',        selected.sender || '—'],
              ['To',          (selected.recipients || []).join(', ') || '—'],
              ['CC',          (selected.cc || []).join(', ') || '—'],
              ['Status',      <StatusBadge key="s" status={selected.status} />],
              ['Trigger',     selected.triggerType?.replace(/_/g, ' ') || '—'],
              ['Fields Sent', (selected.selectedFields || []).join(', ') || '—'],
              ['Retries',     selected.retryCount],
              ['Sent At',     selected.sentDate ? new Date(selected.sentDate).toLocaleString() : '—'],
              ['Error',       selected.errorMessage || '—'],
              // Show Sent By only for admin/manager
              ...(isAdminOrManager && selected.initiatedBy
                ? [['Sent By', `${selected.initiatedBy.firstName} ${selected.initiatedBy.lastName} (${selected.initiatedBy.role})`]]
                : []),
            ].map(([label, val]) => (
              <div key={label} className="flex gap-3 py-1.5 border-b border-gray-100 last:border-0">
                <dt className="text-gray-400 font-medium w-28 shrink-0">{label}</dt>
                <dd className="text-gray-800 break-all flex-1">{val}</dd>
              </div>
            ))}
          </div>
        )}
      </Modal>

    </div>
  );
}
