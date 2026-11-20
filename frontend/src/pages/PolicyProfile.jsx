import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Edit2, RefreshCw, Save } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, StatusBadge, Spinner, Modal, Input, Select } from '../components/ui.jsx';

const POLICY_STATUSES = ['Draft','Policy Issuance Pending','Active','Expiring Soon','Renewal Pending','Cancelled','Expired','Not Taken Up'];
const BILL_TYPES = ['Direct Bill', 'Agency Bill'];

export default function PolicyProfile() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('Details');
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving]   = useState(false);

  const fetchData = () => {
    setLoading(true);
    api.get(`/policies/${id}`)
      .then((r) => {
        setData(r.data);
        const p = r.data.policy;
        setEditForm({
          policyNumber:         p.policyNumber         || '',
          applicationReference: p.applicationReference || '',
          insuranceCategory:    p.insuranceCategory    || '',
          billType:             p.billType             || 'Direct Bill',
          effectiveDate:        p.effectiveDate ? p.effectiveDate.substring(0,10) : '',
          expiryDate:           p.expiryDate    ? p.expiryDate.substring(0,10)    : '',
          issueDate:            p.issueDate     ? p.issueDate.substring(0,10)     : '',
          policyStatus:         p.policyStatus  || 'Policy Issuance Pending',
          notes:                p.notes         || '',
        });
      })
      .catch(() => navigate('/policies'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleIssue = async () => {
    if (!data.policy.policyNumber) return alert('Policy number is required before issuing.');
    if (!window.confirm('Issue this policy and mark as Active?')) return;
    try { await api.post(`/policies/${id}/issue`); fetchData(); } catch (err) { alert(err.response?.data?.message); }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Cancellation reason:');
    if (reason === null) return;
    try { await api.post(`/policies/${id}/cancel`, { cancellationReason: reason }); fetchData(); } catch (err) { alert(err.response?.data?.message); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put(`/policies/${id}`, editForm);
      fetchData(); setShowEdit(false);
    } catch (err) { alert(err.response?.data?.message || 'Update failed'); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>;
  if (!data)   return null;

  const { policy, renewals } = data;
  const canEdit = ['admin','manager','producer'].includes(user?.role);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/policies')} className="btn-outline p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {policy.policyNumber || policy.policyId}
          </h1>
          <div className="flex gap-2 mt-0.5">
            <StatusBadge status={policy.policyStatus} />
            {policy.billType && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {policy.billType}
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          {user?.role === 'manager' && (
            <button onClick={() => setShowEdit(true)} className="btn-outline">
              <Edit2 className="w-4 h-4" /> Edit
            </button>
          )}
          {policy.policyStatus === 'Policy Issuance Pending' && user?.role === 'manager' && (
            <button onClick={handleIssue} className="btn-success">
              <CheckCircle className="w-4 h-4" /> Issue Policy
            </button>
          )}
          {['Active','Policy Issuance Pending','Draft'].includes(policy.policyStatus) && user?.role === 'manager' && (
            <button onClick={handleCancel} className="btn-danger">
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {['Details', 'Renewals'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${tab===t ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </nav>
      </div>

      <Card>
        <div className="p-5">

          {tab === 'Details' && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[
                ['Policy ID',           policy.policyId],
                ['Policy Number',        policy.policyNumber       || '—'],
                ['Acturis Contact Ref',  policy.applicationReference || '—'],
                ['Client',               policy.clientId ? `${policy.clientId.firstName}${policy.clientId.lastName && policy.clientId.lastName !== '.' ? ' ' + policy.clientId.lastName : ''}` : '—'],
                ['Insurer',              policy.insurerId?.companyName || '—'],
                ['Insurance Type',       policy.insuranceCategory  || '—'],
                ['Bill Type',            policy.billType           || '—'],
                ['Total Premium',        policy.totalPremium       ? `${policy.currency || 'CAD'} ${Number(policy.totalPremium).toLocaleString()}` : '—'],
                ['Commission %',         policy.commissionPercent  ? `${policy.commissionPercent}%` : '—'],
                ['Commission Amount',    policy.commissionAmount   ? `${policy.currency || 'CAD'} ${Number(policy.commissionAmount).toFixed(2)}` : '—'],
                ['Broker Fee',           policy.brokerFee          ? `${policy.currency || 'CAD'} ${Number(policy.brokerFee).toFixed(2)}` : '—'],
                ['Effective Date',       policy.effectiveDate ? new Date(policy.effectiveDate).toLocaleDateString() : '—'],
                ['End Date',             policy.expiryDate    ? new Date(policy.expiryDate).toLocaleDateString()    : '—'],
                ['Issue Date',           policy.issueDate     ? new Date(policy.issueDate).toLocaleDateString()     : '—'],
                ['Status',               policy.policyStatus],
                ['Created',              new Date(policy.createdAt).toLocaleDateString()],
              ].map(([label, val]) => (
                <div key={label}>
                  <dt className="text-gray-400 font-medium">{label}</dt>
                  <dd className="text-gray-900 mt-0.5 font-medium">{val}</dd>
                </div>
              ))}
              {policy.notes && (
                <div className="col-span-2">
                  <dt className="text-gray-400 font-medium">Notes</dt>
                  <dd className="text-gray-700 mt-0.5 whitespace-pre-line">{policy.notes}</dd>
                </div>
              )}
            </dl>
          )}

          {tab === 'Renewals' && (
            renewals?.length ? (
              <table className="table-base">
                <thead><tr><th>Renewal #</th><th>Expiry</th><th>Status</th><th>Reminders</th></tr></thead>
                <tbody>
                  {renewals.map((r) => {
                    const daysLeft = Math.ceil((new Date(r.expiryDate) - new Date()) / (1000*60*60*24));
                    return (
                      <tr key={r._id} className={daysLeft <= 30 && r.status==='Pending' ? 'bg-amber-50' : ''}>
                        <td className="font-mono text-xs">{r.renewalNumber}</td>
                        <td>{new Date(r.expiryDate).toLocaleDateString()}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td className="text-xs text-gray-500">
                          {r.reminders ? `${r.reminders.filter(x=>x.sent).length}/${r.reminders.length} sent` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <p className="text-gray-400 text-sm">No renewals yet.</p>
          )}
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Policy" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Policy Number"      value={editForm.policyNumber}         onChange={(e) => setEditForm({...editForm, policyNumber: e.target.value})} />
            <Input label="Acturis Contact Ref"value={editForm.applicationReference} onChange={(e) => setEditForm({...editForm, applicationReference: e.target.value})} />
          </div>
          <Input label="Insurance Type" value={editForm.insuranceCategory} onChange={(e) => setEditForm({...editForm, insuranceCategory: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Effective Date" type="date" value={editForm.effectiveDate} onChange={(e) => setEditForm({...editForm, effectiveDate: e.target.value})} />
            <Input label="End Date"       type="date" value={editForm.expiryDate}    onChange={(e) => setEditForm({...editForm, expiryDate: e.target.value})} />
          </div>
          <Input label="Issue Date" type="date" value={editForm.issueDate} onChange={(e) => setEditForm({...editForm, issueDate: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Policy Status" value={editForm.policyStatus} onChange={(e) => setEditForm({...editForm, policyStatus: e.target.value})}>
              {POLICY_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
            <Select label="Bill Type" value={editForm.billType} onChange={(e) => setEditForm({...editForm, billType: e.target.value})}>
              {BILL_TYPES.map((b) => <option key={b}>{b}</option>)}
            </Select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={editForm.notes} onChange={(e) => setEditForm({...editForm, notes: e.target.value})} className="input resize-none" rows={3} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
