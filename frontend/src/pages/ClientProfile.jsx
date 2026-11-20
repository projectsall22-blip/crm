import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Target, FileText, FolderOpen, Activity, Mail, Edit2, Plus } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Badge, StatusBadge, Spinner, Modal, Input, Select } from '../components/ui.jsx';
import CanadaAddressFields, { formatAddressString, parseAddressString } from '../components/CanadaAddressFields.jsx';

const TABS = ['Details', 'Leads', 'Policies', 'Renewals', 'Documents', 'Activities', 'Email History'];

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Details');
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/clients/${id}`).then((r) => {
      setData(r.data);
      const c = r.data.client;
      setForm({
        firstName: c.firstName, lastName: c.lastName,
        email: c.email, phone: c.phone,
        address: {
          street:     c.street     || '',
          city:       c.city       || '',
          province:   c.province   || '',
          postalCode: c.postalCode || '',
        },
        leadSource: c.leadSource, notes: c.notes,
      });
    }).catch(() => navigate('/clients')).finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/clients/${id}`, {
        ...form,
        street:     form.address?.street     || '',
        city:       form.address?.city       || '',
        province:   form.address?.province   || '',
        postalCode: form.address?.postalCode || '',
      });
      const r = await api.get(`/clients/${id}`);
      setData(r.data);
      setShowEdit(false);
    } catch { } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>;
  if (!data) return null;

  const { client, related } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/clients')} className="btn-outline p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {client.firstName} {client.lastName && client.lastName !== '.' ? client.lastName : ''}
          </h1>
          <p className="text-xs text-slate-500 font-mono">{client.clientId}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Register Policy — visible to Manager only */}
          {user?.role === 'manager' && (
            <button
              onClick={() => navigate(`/policies/register?clientId=${id}`)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Register Policy
            </button>
          )}
          <button onClick={() => setShowEdit(true)} className="btn-outline">
            <Edit2 className="w-4 h-4" /> Edit
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Leads',    value: related.leads.length,     icon: Target,     color: 'bg-purple-50 text-purple-700' },
          { label: 'Policies', value: related.policies.length,  icon: FileText,   color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Documents',value: related.documents.length, icon: FolderOpen, color: 'bg-amber-50 text-amber-700'   },
        ].map((s) => (
          <div key={s.label} className="card card-body flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
            <div><p className="text-xs text-slate-500">{s.label}</p><p className="font-bold text-lg text-slate-800">{s.value}</p></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-navy-600 text-navy-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <Card>
        <div className="p-5">
          {tab === 'Details' && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Client ID', client.clientId], ['First Name', client.firstName], ['Last Name', client.lastName],
                ['Email', client.email || '—'], ['Phone', client.phone || '—'],
                ['Street', client.street || '—'],
                ['City', client.city || '—'],
                ['Province', client.province || '—'],
                ['Postal Code', client.postalCode || '—'],
                ['Country', 'Canada'], ['Lead Source', client.leadSource || '—'],
                ['Created By', client.createdBy ? `${client.createdBy.firstName} ${client.createdBy.lastName}` : '—'],
                ['Assigned Producer', client.ownerProducerId ? `${client.ownerProducerId.firstName} ${client.ownerProducerId.lastName}` : 'Unassigned'],
                ['Created', new Date(client.createdAt).toLocaleDateString()],
              ].map(([label, val]) => (
                <div key={label}>
                  <dt className="text-slate-500 font-medium">{label}</dt>
                  <dd className="text-slate-800 mt-0.5">{val}</dd>
                </div>
              ))}
              {client.notes && <div className="col-span-2"><dt className="text-slate-500 font-medium">Notes</dt><dd className="text-slate-800 mt-0.5 whitespace-pre-line">{client.notes}</dd></div>}
            </dl>
          )}

          {tab === 'Leads' && (
            related.leads.length ? (
              <table className="table-base">
                <thead><tr><th>Lead ID</th><th>Insurance Type</th><th>Status</th><th>Premium</th><th>Created</th><th></th></tr></thead>
                <tbody>
                  {related.leads.map((l) => (
                    <tr key={l._id} className="hover:bg-slate-50">
                      <td className="font-mono text-xs">{l.leadId}</td>
                      <td>{l.insuranceType || '—'}</td>
                      <td><StatusBadge status={l.leadStatus} /></td>
                      <td>{l.expectedPremium ? `${l.currency} ${l.expectedPremium.toLocaleString()}` : '—'}</td>
                      <td className="text-slate-400 text-xs">{new Date(l.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/leads/${l._id}`)} className="btn-outline py-1 px-2 text-xs">View</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-slate-400 text-sm">No leads yet.</p>
          )}

          {tab === 'Policies' && (
            <div>
              {/* Register New Policy — Manager only */}
              {user?.role === 'manager' && (
                <div className="mb-4">
                  <button
                    onClick={() => navigate(`/policies/register?clientId=${id}`)}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4" /> Register New Policy
                  </button>
                </div>
              )}
              {related.policies.length ? (
                <table className="table-base">
                  <thead><tr><th>Policy #</th><th>Insurer</th><th>Type</th><th>Bill</th><th>Status</th><th>Effective</th><th>Expiry</th><th></th></tr></thead>
                  <tbody>
                    {related.policies.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50">
                        <td className="font-mono text-xs">{p.policyNumber || p.policyId}</td>
                        <td>{p.insurerId?.companyName || '—'}</td>
                        <td className="text-xs">{p.insuranceCategory || '—'}</td>
                        <td className="text-xs">{p.billType || '—'}</td>
                        <td><StatusBadge status={p.policyStatus} /></td>
                        <td className="text-xs">{p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString() : '—'}</td>
                        <td className="text-xs">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '—'}</td>
                        <td><button onClick={() => navigate(`/policies/${p._id}`)} className="btn-outline py-1 px-2 text-xs">View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-slate-400 text-sm">No policies yet.</p>
              )}
            </div>
          )}

          {tab === 'Renewals' && (
            related.renewals.length ? (
              <table className="table-base">
                <thead><tr><th>Renewal #</th><th>Expiry Date</th><th>Status</th></tr></thead>
                <tbody>
                  {related.renewals.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50">
                      <td className="font-mono text-xs">{r.renewalNumber}</td>
                      <td>{new Date(r.expiryDate).toLocaleDateString()}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-slate-400 text-sm">No renewals yet.</p>
          )}

          {tab === 'Documents' && (
            related.documents.length ? (
              <table className="table-base">
                <thead><tr><th>Name</th><th>Type</th><th>Uploaded</th></tr></thead>
                <tbody>
                  {related.documents.map((d) => (
                    <tr key={d._id} className="hover:bg-slate-50">
                      <td>{d.name}</td><td>{d.type}</td>
                      <td className="text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-slate-400 text-sm">No documents yet.</p>
          )}

          {tab === 'Activities' && (
            related.activities.length ? (
              <ul className="space-y-3">
                {related.activities.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {a.performedBy?.firstName?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-slate-700">{a.description}</p>
                      <p className="text-xs text-slate-400">{a.performedBy?.firstName} {a.performedBy?.lastName} · {new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-slate-400 text-sm">No activities yet.</p>
          )}

          {tab === 'Email History' && (
            related.emailLogs.length ? (
              <table className="table-base">
                <thead><tr><th>Subject</th><th>Recipients</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {related.emailLogs.map((e) => (
                    <tr key={e._id} className="hover:bg-slate-50">
                      <td>{e.subject}</td>
                      <td className="text-xs">{(e.recipients || []).join(', ')}</td>
                      <td><StatusBadge status={e.status} /></td>
                      <td className="text-xs">{new Date(e.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-slate-400 text-sm">No email history.</p>
          )}
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Client" size="lg">
        <form onSubmit={handleUpdate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Address</label>
            <CanadaAddressFields
              value={form.address || {}}
              onChange={(addr) => setForm({ ...form, address: addr })}
            />
          </div>
          <Input label="Lead Source" value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })} />          <div><label className="label">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={3} /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
