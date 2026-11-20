import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Trophy, ThumbsDown, Columns, AlertCircle, Target } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, StatusBadge, Spinner, EmptyState, Pagination, Modal, Input, Select, Textarea } from '../components/ui.jsx';
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
  const [showCreate, setShowCreate] = useState(false);
  const [showQuickLead, setShowQuickLead] = useState(false);
  const [wonNotice, setWonNotice] = useState({ show: false, clientName: '', clientId: '', leadId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState([]);
  const [producers, setProducers] = useState([]);
  const [emailRecipients, setEmailRecipients] = useState([]);
  const [form, setForm] = useState({
    clientId: '', clientName: '', email: '', phone: '', insuranceType: '', leadSource: '',
    expectedPremium: '', currency: 'USD', priority: 'Medium', leadStatus: 'New',
    assignedProducer: '', nextFollowUpDate: '', notes: '',
  });
  const [emailNotif, setEmailNotif] = useState({
    sendNow: false, recipients: [], selectedFields: ['clientName', 'insuranceType', 'leadSource', 'producerName'], customEmail: '',
  });

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

  useEffect(() => {
    api.get('/clients', { params: { limit: 200 } }).then((r) => setClients(r.data.data || []));
    api.get('/email/recipients', { params: { limit: 100 } }).then((r) => setEmailRecipients(r.data.data || []));
    if (user.role === 'admin') {
      api.get('/users', { params: { role: 'producer', limit: 100 } }).then((r) => setProducers(r.data.data || []));
    }
  }, [user.role]);

  const handleClientChange = (clientId) => {
    const c = clients.find((cl) => cl._id === clientId);
    setForm((f) => ({ ...f, clientId, clientName: c ? `${c.firstName} ${c.lastName}` : f.clientName, email: c?.email || f.email, phone: c?.phone || f.phone }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        expectedPremium: form.expectedPremium ? Number(form.expectedPremium) : undefined,
        emailNotification: emailNotif.sendNow
          ? { sendNow: true, recipients: buildRecipients(), selectedFields: emailNotif.selectedFields }
          : undefined,
      };
      await api.post('/leads', payload);
      setShowCreate(false);
      resetForm();
      fetchLeads();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create lead');
    } finally { setSaving(false); }
  };

  const buildRecipients = () => {
    const list = [...emailNotif.recipients];
    if (emailNotif.customEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNotif.customEmail)) {
      list.push(emailNotif.customEmail);
    }
    return list;
  };

  const resetForm = () => {
    setForm({ clientId: '', clientName: '', email: '', phone: '', insuranceType: '', leadSource: '', expectedPremium: '', currency: 'USD', priority: 'Medium', leadStatus: 'New', assignedProducer: '', nextFollowUpDate: '', notes: '' });
    setEmailNotif({ sendNow: false, recipients: [], selectedFields: ['clientName', 'insuranceType', 'leadSource', 'producerName'], customEmail: '' });
    setError('');
  };

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

  const toggleEmailField = (key) => {
    setEmailNotif((n) => ({
      ...n,
      selectedFields: n.selectedFields.includes(key)
        ? n.selectedFields.filter((f) => f !== key)
        : [...n.selectedFields, key],
    }));
  };

  const toggleEmailRecipient = (val) => {
    setEmailNotif((n) => ({
      ...n,
      recipients: n.recipients.includes(val) ? n.recipients.filter((r) => r !== val) : [...n.recipients, val],
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Leads</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/leads/kanban')} className="btn-outline"><Columns className="w-4 h-4" /> Pipeline</button>
          <button onClick={() => setShowQuickLead(true)} className="btn-outline"><Plus className="w-4 h-4" /> Quick Lead</button>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Lead</button>
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

      {/* Create Lead Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="New Lead" size="xl">
        {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Linked Client" value={form.clientId} onChange={(e) => handleClientChange(e.target.value)}>
              <option value="">Select client (optional)</option>
              {clients.map((c) => <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>)}
            </Select>
            <Input label="Client Name *" required value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Insurance Type" value={form.insuranceType} onChange={(e) => setForm({ ...form, insuranceType: e.target.value })}>
              <option value="">Select type</option>
              {INSURANCE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
            <Select label="Lead Source" value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })}>
              <option value="">Select source</option>
              {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Expected Premium" type="number" min="0" value={form.expectedPremium} onChange={(e) => setForm({ ...form, expectedPremium: e.target.value })} />
            <Select label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Status" value={form.leadStatus} onChange={(e) => setForm({ ...form, leadStatus: e.target.value })}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
            <Input label="Next Follow-up Date" type="date" value={form.nextFollowUpDate} onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })} />
          </div>
          {user.role === 'admin' && (
            <Select label="Assign to Producer" value={form.assignedProducer} onChange={(e) => setForm({ ...form, assignedProducer: e.target.value })}>
              <option value="">Select producer</option>
              {producers.map((p) => <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>)}
            </Select>
          )}
          <div><label className="label">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={3} /></div>

          {/* Email Notification Section */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="sendEmail" checked={emailNotif.sendNow} onChange={(e) => setEmailNotif({ ...emailNotif, sendNow: e.target.checked })} className="rounded" />
              <label htmlFor="sendEmail" className="text-sm font-medium text-slate-700">Send Email Notification</label>
            </div>
            {emailNotif.sendNow && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Recipients</p>
                  <div className="flex flex-wrap gap-2">
                    {['manager', 'admin', 'producer'].map((r) => (
                      <label key={r} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" checked={emailNotif.recipients.includes(r)} onChange={() => toggleEmailRecipient(r)} className="rounded" />
                        <span className="capitalize">{r} Email</span>
                      </label>
                    ))}
                    {emailRecipients.map((r) => (
                      <label key={r._id} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" checked={emailNotif.recipients.includes(r._id)} onChange={() => toggleEmailRecipient(r._id)} className="rounded" />
                        <span>{r.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Input label="Custom Email Address" type="email" placeholder="custom@example.com" value={emailNotif.customEmail} onChange={(e) => setEmailNotif({ ...emailNotif, customEmail: e.target.value })} />
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Select Fields to Include in Email</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {AVAILABLE_EMAIL_FIELDS.map((f) => (
                      <label key={f.key} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" checked={emailNotif.selectedFields.includes(f.key)} onChange={() => toggleEmailField(f.key)} className="rounded" />
                        <span>{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create Lead'}</button>
          </div>
        </form>
      </Modal>

      {/* Quick Lead Drawer — two-section intake form */}
      <NewLeadDrawer open={showQuickLead} onClose={() => { setShowQuickLead(false); fetchLeads(); }} />

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
