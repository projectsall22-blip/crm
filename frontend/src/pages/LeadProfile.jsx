import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, ThumbsDown, Edit2, MessageSquare, Mail, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../services/api.js';
import { Card, StatusBadge, Spinner, Modal, Input, Select, Textarea } from '../components/ui.jsx';

const STATUSES = ['New','Contacted','Follow-up','Interested','In Progress','Won','Lost','On Hold'];
const AVAILABLE_EMAIL_FIELDS = [
  { key: 'clientName', label: 'Client Name' }, { key: 'insuranceType', label: 'Insurance Type' },
  { key: 'leadSource', label: 'Lead Source' }, { key: 'expectedPremium', label: 'Expected Premium' },
  { key: 'currency', label: 'Currency' }, { key: 'producerName', label: 'Producer Name' },
  { key: 'leadStatus', label: 'Lead Status' }, { key: 'notes', label: 'Notes' },
  { key: 'nextFollowUpDate', label: 'Follow-up Date' },
];

export default function LeadProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Details');
  const [showEdit, setShowEdit] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [form, setForm] = useState({});
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [emailNotif, setEmailNotif] = useState({ recipients: ['manager'], selectedFields: ['clientName','insuranceType','leadSource','producerName'], customEmail: '' });
  const [emailRecipients, setEmailRecipients] = useState([]);

  const fetchData = () => {
    setLoading(true);
    api.get(`/leads/${id}`).then((r) => {
      setData(r.data);
      const l = r.data.lead;
      setForm({ clientName: l.clientName, email: l.email, phone: l.phone, insuranceType: l.insuranceType, leadSource: l.leadSource, expectedPremium: l.expectedPremium, currency: l.currency, priority: l.priority, leadStatus: l.leadStatus, nextFollowUpDate: l.nextFollowUpDate ? l.nextFollowUpDate.substring(0,10) : '', notes: l.notes });
    }).catch(() => navigate('/leads')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);
  useEffect(() => { api.get('/email/recipients', { params: { limit: 100 } }).then((r) => setEmailRecipients(r.data.data || [])); }, []);

  const handleUpdate = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.put(`/leads/${id}`, form); fetchData(); setShowEdit(false); } catch { } finally { setSaving(false); }
  };

  const [wonNotice, setWonNotice] = useState({ show: false, clientName: '', clientId: '' });

  const handleMarkWon = async () => {
    try {
      const res = await api.post(`/leads/${id}/won`);
      if (res.data.clientCreated) {
        setWonNotice({
          show: true,
          clientName: `${res.data.client?.firstName} ${res.data.client?.lastName}`,
          clientId: res.data.client?._id,
        });
        fetchData(); // refresh lead data to show updated clientId
      } else {
        navigate(`/policies/register/${id}`);
      }
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleMarkLost = async () => {
    if (!window.confirm('Mark this lead as Lost?')) return;
    try { await api.post(`/leads/${id}/lost`); fetchData(); } catch { }
  };

  const handleFollowUp = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post(`/leads/${id}/followup`, { note: followUpNote, nextFollowUpDate: followUpDate || undefined }); fetchData(); setShowFollowUp(false); setFollowUpNote(''); setFollowUpDate(''); } catch { } finally { setSaving(false); }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const recipients = [...emailNotif.recipients];
      if (emailNotif.customEmail) recipients.push(emailNotif.customEmail);
      await api.post(`/leads/${id}/send-email`, { recipients, selectedFields: emailNotif.selectedFields });
      fetchData(); setShowEmail(false);
    } catch (err) { alert(err.response?.data?.message || 'Email send failed'); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>;
  if (!data) return null;

  const { lead, emailLogs } = data;
  const isWon = lead.leadStatus === 'Won';
  const isLost = lead.leadStatus === 'Lost';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/leads')} className="btn-outline p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{lead.clientName}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs text-slate-500">{lead.leadId}</span>
            <StatusBadge status={lead.leadStatus} />
          </div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          <button onClick={() => setShowEmail(true)} className="btn-outline"><Mail className="w-4 h-4" /> Send Email</button>
          <button onClick={() => setShowFollowUp(true)} className="btn-outline"><MessageSquare className="w-4 h-4" /> Follow-up</button>
          <button onClick={() => setShowEdit(true)} className="btn-outline"><Edit2 className="w-4 h-4" /> Edit</button>
          {!isWon && !isLost && <>
            <button onClick={handleMarkWon} className="btn-success"><Trophy className="w-4 h-4" /> Mark Won</button>
            <button onClick={handleMarkLost} className="btn-danger"><ThumbsDown className="w-4 h-4" /> Mark Lost</button>
          </>}
          {isWon && !lead.policyRegistered && (
            <button onClick={() => navigate(`/policies/register/${id}`)} className="btn-primary"><RefreshCw className="w-4 h-4" /> Register Policy</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {['Details','Activities','Email History'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab===t ? 'border-navy-600 text-navy-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t}</button>
          ))}
        </nav>
      </div>

      <Card>
        <div className="p-5">
          {tab === 'Details' && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Lead ID', lead.leadId], ['Client Name', lead.clientName], ['Email', lead.email || '—'],
                ['Phone', lead.phone || '—'], ['Insurance Type', lead.insuranceType || '—'],
                ['Lead Source', lead.leadSource || '—'], ['Expected Premium', lead.expectedPremium ? `${lead.currency} ${lead.expectedPremium.toLocaleString()}` : '—'],
                ['Priority', lead.priority], ['Status', lead.leadStatus],
                ['Follow-up Date', lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString() : '—'],
                ['Assigned Producer', lead.assignedProducer ? `${lead.assignedProducer.firstName} ${lead.assignedProducer.lastName}` : '—'],
                ['Created', new Date(lead.createdAt).toLocaleDateString()],
                ...(lead.wonAt ? [['Won At', new Date(lead.wonAt).toLocaleDateString()]] : []),
                ...(lead.lostAt ? [['Lost At', new Date(lead.lostAt).toLocaleDateString()]] : []),
              ].map(([label, val]) => (
                <div key={label}><dt className="text-slate-500 font-medium">{label}</dt><dd className="text-slate-800 mt-0.5">{val}</dd></div>
              ))}
              {lead.notes && <div className="col-span-2"><dt className="text-slate-500 font-medium">Notes</dt><dd className="text-slate-800 mt-0.5 whitespace-pre-line">{lead.notes}</dd></div>}
            </dl>
          )}

          {tab === 'Activities' && (
            lead.activities?.length ? (
              <ul className="space-y-3">
                {[...lead.activities].reverse().map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm border-l-2 border-slate-200 pl-3">
                    <div>
                      <p className="text-slate-700 font-medium capitalize">{a.type.replace('_', ' ')}</p>
                      {a.note && <p className="text-slate-500">{a.note}</p>}
                      <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-slate-400 text-sm">No activities yet.</p>
          )}

          {tab === 'Email History' && (
            emailLogs?.length ? (
              <table className="table-base">
                <thead><tr><th>Subject</th><th>Recipients</th><th>Fields Sent</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {emailLogs.map((e) => (
                    <tr key={e._id} className="hover:bg-slate-50">
                      <td>{e.subject}</td>
                      <td className="text-xs">{(e.recipients||[]).join(', ')}</td>
                      <td className="text-xs text-slate-500">{(e.selectedFields||[]).join(', ')}</td>
                      <td><StatusBadge status={e.status} /></td>
                      <td className="text-xs">{new Date(e.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-slate-400 text-sm">No email history.</p>
          )}
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Lead" size="lg">
        <form onSubmit={handleUpdate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Client Name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Insurance Type" value={form.insuranceType} onChange={(e) => setForm({ ...form, insuranceType: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Expected Premium" type="number" value={form.expectedPremium} onChange={(e) => setForm({ ...form, expectedPremium: e.target.value })} />
            <Input label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            <Select label="Status" value={form.leadStatus} onChange={(e) => setForm({ ...form, leadStatus: e.target.value })}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <Input label="Next Follow-up Date" type="date" value={form.nextFollowUpDate} onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })} />
          <div><label className="label">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={3} /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Follow-up Modal */}
      <Modal open={showFollowUp} onClose={() => setShowFollowUp(false)} title="Add Follow-up">
        <form onSubmit={handleFollowUp} className="space-y-3">
          <div><label className="label">Note</label><textarea value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} className="input" rows={3} placeholder="Follow-up details…" /></div>
          <Input label="Next Follow-up Date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowFollowUp(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Add Follow-up'}</button>
          </div>
        </form>
      </Modal>

      {/* Send Email Modal */}
      <Modal open={showEmail} onClose={() => setShowEmail(false)} title="Send Lead Email" size="lg">
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Recipients</p>
            <div className="flex flex-wrap gap-3">
              {['manager','admin','producer'].map((r) => (
                <label key={r} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={emailNotif.recipients.includes(r)} onChange={() => setEmailNotif((n) => ({ ...n, recipients: n.recipients.includes(r) ? n.recipients.filter((x) => x !== r) : [...n.recipients, r] }))} className="rounded" />
                  <span className="capitalize">{r}</span>
                </label>
              ))}
              {emailRecipients.map((r) => (
                <label key={r._id} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={emailNotif.recipients.includes(r._id)} onChange={() => setEmailNotif((n) => ({ ...n, recipients: n.recipients.includes(r._id) ? n.recipients.filter((x) => x !== r._id) : [...n.recipients, r._id] }))} className="rounded" />
                  <span>{r.name}</span>
                </label>
              ))}
            </div>
          </div>
          <Input label="Custom Email (optional)" type="email" value={emailNotif.customEmail} onChange={(e) => setEmailNotif({ ...emailNotif, customEmail: e.target.value })} placeholder="custom@example.com" />
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Select Fields to Send <span className="text-slate-400 font-normal">(only selected fields will be in the email)</span></p>
            <div className="grid grid-cols-2 gap-1.5">
              {AVAILABLE_EMAIL_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={emailNotif.selectedFields.includes(f.key)} onChange={() => setEmailNotif((n) => ({ ...n, selectedFields: n.selectedFields.includes(f.key) ? n.selectedFields.filter((x) => x !== f.key) : [...n.selectedFields, f.key] }))} className="rounded" />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowEmail(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary"><Mail className="w-4 h-4" />{saving ? 'Sending…' : 'Send Email'}</button>
          </div>
        </form>
      </Modal>

      {/* Won — Client Auto-Created Notice */}
      {wonNotice.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 text-white text-center">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Lead Marked Won!</h3>
              <p className="text-emerald-100 text-sm mt-1">Client automatically added to CRM</p>
            </div>
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
              <p className="text-sm text-gray-500 text-center mb-5">What would you like to do next?</p>
              <div className="space-y-2">
                <button
                  onClick={() => { setWonNotice({ show: false }); navigate(`/policies/register/${id}`); }}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
                >
                  Register Policy
                </button>
                <button
                  onClick={() => { setWonNotice({ show: false }); navigate(`/clients/${wonNotice.clientId}`); }}
                  className="w-full py-3 rounded-xl border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold text-sm transition-colors"
                >
                  View Client Profile
                </button>
                <button
                  onClick={() => setWonNotice({ show: false })}
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
