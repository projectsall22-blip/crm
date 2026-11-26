import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Trophy, ThumbsDown, Columns, Target } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, StatusBadge, Spinner, EmptyState, Pagination } from '../components/ui.jsx';
import NewLeadDrawer from '../components/NewLeadDrawer.jsx';

const STATUSES = ['New','Contacted','Follow-up','Interested','In Progress','Won','Lost','On Hold'];
const PRIORITIES = ['Low','Medium','High','Urgent'];
const INSURANCE_TYPES = ['Motor','Life','Health','Property','Liability','Marine','Travel','Commercial','Other'];
const LEAD_SOURCES = ['Website','Referral','Social Media','Cold Call','Walk-in','Email Campaign','Other'];
const CURRENCY_OPTIONS = ['USD','EUR','GBP','AED','CAD','AUD','SGD','INR','OTHER'];

const AVAILABLE_EMAIL_FIELDS = [
  { key: 'clientName', label: 'Client Name' },
  { key: 'clientEmail', label: 'Client Email' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'insuranceType', label: 'Insurance Type' },
  { key: 'leadSource', label: 'Lead Source' },
  { key: 'expectedPremium', label: 'Expected Premium' },
  { key: 'currency', label: 'Currency' },
  { key: 'producerName', label: 'Producer Name' },
  { key: 'leadStatus', label: 'Lead Status' },
  { key: 'notes', label: 'Additional Notes' },
  { key: 'nextFollowUpDate', label: 'Follow-up Date' },
];

export default function Leads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showQuickLead, setShowQuickLead] = useState(false);
  const [wonNotice, setWonNotice] = useState({ show: false, clientName: '', clientId: '', leadId: '' });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, search: search || undefined, leadStatus: statusFilter || undefined };
      const res = await api.get('/leads', { params });
      setLeads(res.data.data);
      setPagination(res.data.pagination);
    } catch { } finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleMarkWon = async (lead) => {
    try {
      const res = await api.post(`/leads/${lead._id}/won`);
      // Show auto-client creation notification
      if (res.data.clientCreated) {
        setWonNotice({
          show: true,
          clientName: res.data.client?.firstName + ' ' + res.data.client?.lastName,
          clientId: res.data.client?._id,
          leadId: lead._id,
        });
      } else {
        navigate(`/policies/register/${lead._id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark Won');
    }
  };

  const handleMarkLost = async (lead) => {
    if (!window.confirm(`Mark lead for ${lead.clientName} as Lost?`)) return;
    try {
      await api.post(`/leads/${lead._id}/lost`);
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark Lost');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Leads</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/leads/kanban')} className="btn-outline"><Columns className="w-4 h-4" /> Pipeline</button>
          <button onClick={() => setShowQuickLead(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Lead</button>
        </div>
      </div>

      <Card>
        <div className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search leads…" className="input pl-9" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-auto">
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div>
        ) : leads.length === 0 ? (
          <EmptyState icon={Target} title="No leads found" message="Start by creating a new lead." action={<button onClick={() => setShowCreate(true)} className="btn-primary">New Lead</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Lead ID</th><th>Client</th><th>Insurance Type</th><th>Source</th><th>Premium</th><th>Priority</th><th>Status</th><th>Producer</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50">
                    <td><span className="font-mono text-xs text-slate-500">{l.leadId}</span></td>
                    <td><span className="font-medium">{l.clientName}</span></td>
                    <td>{l.insuranceType || '—'}</td>
                    <td>{l.leadSource || '—'}</td>
                    <td>{l.expectedPremium ? `${l.currency} ${l.expectedPremium.toLocaleString()}` : '—'}</td>
                    <td><PriorityBadge p={l.priority} /></td>
                    <td><StatusBadge status={l.leadStatus} /></td>
                    <td>{l.assignedProducer ? `${l.assignedProducer.firstName} ${l.assignedProducer.lastName}` : '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/leads/${l._id}`)} className="btn-outline py-1 px-2 text-xs" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        {l.leadStatus !== 'Won' && l.leadStatus !== 'Lost' && (
                          <>
                            <button onClick={() => handleMarkWon(l)} className="btn-success py-1 px-2 text-xs" title="Mark Won"><Trophy className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleMarkLost(l)} className="btn-danger py-1 px-2 text-xs" title="Mark Lost"><ThumbsDown className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onChange={setPage} />
          </div>
        )}
      </Card>

      {/* New Lead Drawer — multi-step intake form, role-aware */}
      <NewLeadDrawer
        open={showQuickLead}
        onClose={() => { setShowQuickLead(false); fetchLeads(); }}
        loggedInUser={user}
      />

      {/* Won — Client Auto-Created Notice */}
      {wonNotice.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Green header */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 text-white text-center">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Lead Marked Won!</h3>
              <p className="text-emerald-100 text-sm mt-1">Client automatically added to CRM</p>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 mb-5">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {wonNotice.clientName?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{wonNotice.clientName}</p>
                  <p className="text-xs text-emerald-700">New client record created automatically</p>
                </div>
              </div>

              <p className="text-sm text-gray-500 text-center mb-5">
                What would you like to do next?
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setWonNotice({ show: false });
                    navigate(`/policies/register/${wonNotice.leadId}`);
                  }}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
                >
                  Register Policy
                </button>
                <button
                  onClick={() => {
                    setWonNotice({ show: false });
                    navigate(`/clients/${wonNotice.clientId}`);
                  }}
                  className="w-full py-3 rounded-xl border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold text-sm transition-colors"
                >
                  View Client Profile
                </button>
                <button
                  onClick={() => { setWonNotice({ show: false }); fetchLeads(); }}
                  className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ p }) {
  const c = { Low: 'bg-slate-100 text-slate-600', Medium: 'bg-blue-100 text-blue-700', High: 'bg-amber-100 text-amber-700', Urgent: 'bg-red-100 text-red-700' };
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${c[p] || c.Medium}`}>{p}</span>;
}
