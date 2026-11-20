import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Mail, Settings, CheckCircle2 } from 'lucide-react';
import api from '../services/api.js';
import { Card, StatusBadge, Spinner, Modal, Input, Select } from '../components/ui.jsx';

const RULE_TRIGGERS = ['producer_creates_lead','admin_creates_lead','lead_won','lead_lost','lead_assigned','lead_updated'];
const TEMPLATE_TRIGGERS = ['lead_created','lead_updated','lead_won','lead_lost','lead_assigned','renewal_reminder','custom'];
const EMAIL_FIELDS = [
  { key:'clientName', label:'Client Name' },{ key:'clientEmail', label:'Client Email' },
  { key:'phone', label:'Phone' },{ key:'insuranceType', label:'Insurance Type' },
  { key:'leadSource', label:'Lead Source' },{ key:'expectedPremium', label:'Expected Premium' },
  { key:'currency', label:'Currency' },{ key:'producerName', label:'Producer Name' },
  { key:'leadStatus', label:'Lead Status' },{ key:'notes', label:'Notes' },
  { key:'nextFollowUpDate', label:'Follow-up Date' },
];

export default function EmailManagement() {
  const [tab, setTab] = useState('Recipients');
  const [recipients, setRecipients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [recipientForm, setRecipientForm] = useState({ name:'', email:'', description:'', type:'preconfigured', isDefault:false });
  const [templateForm, setTemplateForm] = useState({ name:'', subject:'', bodyHtml:'', triggerType:'custom', allowedFields:[], isActive:true });
  const [ruleForm, setRuleForm] = useState({ name:'', trigger:'producer_creates_lead', isActive:true, recipients:{ manager:false, admin:false, producer:false, customEmails:[] }, selectedFields:['clientName','insuranceType'], templateId:'' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rRes, tRes, ruRes] = await Promise.all([
        api.get('/email/recipients', { params: { limit:100 } }),
        api.get('/email/templates'),
        api.get('/email/rules'),
      ]);
      setRecipients(rRes.data.data||[]);
      setTemplates(tRes.data.templates||[]);
      setRules(ruRes.data.rules||[]);
    } catch {} finally { setLoading(false); }
  };

  const checkSmtp = async () => {
    setSmtpStatus(null);
    try { const r = await api.get('/email/verify-smtp'); setSmtpStatus(r.data); } catch (e) { setSmtpStatus({ ok:false, message: e.message }); }
  };

  const openCreate = (type) => { setModalType(type); setEditing(null); setShowModal(true); };
  const openEdit = (type, item) => { setModalType(type); setEditing(item); setShowModal(true);
    if (type==='recipient') setRecipientForm({ name:item.name, email:item.email, description:item.description||'', type:item.type, isDefault:item.isDefault });
    if (type==='template') setTemplateForm({ name:item.name, subject:item.subject, bodyHtml:item.bodyHtml, triggerType:item.triggerType, allowedFields:item.allowedFields||[], isActive:item.isActive });
    if (type==='rule') setRuleForm({ name:item.name, trigger:item.trigger, isActive:item.isActive, recipients:item.recipients||{ manager:false,admin:false,producer:false,customEmails:[] }, selectedFields:item.selectedFields||[], templateId:item.templateId?._id||item.templateId||'' });
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modalType==='recipient') {
        editing ? await api.put(`/email/recipients/${editing._id}`, recipientForm) : await api.post('/email/recipients', recipientForm);
      }
      if (modalType==='template') {
        editing ? await api.put(`/email/templates/${editing._id}`, templateForm) : await api.post('/email/templates', templateForm);
      }
      if (modalType==='rule') {
        editing ? await api.put(`/email/rules/${editing._id}`, ruleForm) : await api.post('/email/rules', ruleForm);
      }
      setShowModal(false); fetchAll();
    } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      if (type==='recipient') await api.delete(`/email/recipients/${id}`);
      if (type==='template') await api.delete(`/email/templates/${id}`);
      if (type==='rule') await api.delete(`/email/rules/${id}`);
      fetchAll();
    } catch (err) { alert(err.response?.data?.message); }
  };

  const toggleRule = async (rule) => {
    try { await api.patch(`/email/rules/${rule._id}/toggle`); fetchAll(); } catch {}
  };

  const toggleAllowedField = (key, arr, setter, field) => {
    setter((f) => ({ ...f, [field]: f[field].includes(key) ? f[field].filter((x) => x!==key) : [...f[field], key] }));
  };

  const TABS = ['Recipients','Templates','Rules','SMTP Settings'];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Email Management</h1>

      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab===t ? 'border-navy-600 text-navy-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t}</button>
          ))}
        </nav>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div> : (
        <>
          {tab === 'Recipients' && (
            <Card>
              <div className="p-4 flex justify-end"><button onClick={() => openCreate('recipient')} className="btn-primary"><Plus className="w-4 h-4" /> Add Recipient</button></div>
              <table className="table-base">
                <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Groups</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {recipients.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50">
                      <td className="font-medium">{r.name}</td><td>{r.email}</td>
                      <td className="capitalize">{r.type}</td><td className="text-xs">{(r.groups||[]).join(', ')||'—'}</td>
                      <td><span className={`text-xs font-medium ${r.isActive?'text-emerald-600':'text-red-500'}`}>{r.isActive?'Active':'Inactive'}</span></td>
                      <td><div className="flex gap-1">
                        <button onClick={() => openEdit('recipient',r)} className="btn-outline py-1 px-2 text-xs"><Edit2 className="w-3 h-3" /></button>
                        <button onClick={() => handleDelete('recipient',r._id)} className="btn-danger py-1 px-2 text-xs"><Trash2 className="w-3 h-3" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {tab === 'Templates' && (
            <Card>
              <div className="p-4 flex justify-end"><button onClick={() => openCreate('template')} className="btn-primary"><Plus className="w-4 h-4" /> New Template</button></div>
              <table className="table-base">
                <thead><tr><th>Name</th><th>Subject</th><th>Trigger</th><th>Allowed Fields</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50">
                      <td className="font-medium">{t.name}</td><td className="text-sm max-w-[200px] truncate">{t.subject}</td>
                      <td className="text-xs capitalize">{t.triggerType?.replace('_',' ')}</td>
                      <td className="text-xs">{(t.allowedFields||[]).length} fields</td>
                      <td><span className={`text-xs font-medium ${t.isActive?'text-emerald-600':'text-slate-400'}`}>{t.isActive?'Active':'Inactive'}</span></td>
                      <td><div className="flex gap-1">
                        <button onClick={() => openEdit('template',t)} className="btn-outline py-1 px-2 text-xs"><Edit2 className="w-3 h-3" /></button>
                        <button onClick={() => handleDelete('template',t._id)} className="btn-danger py-1 px-2 text-xs"><Trash2 className="w-3 h-3" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {tab === 'Rules' && (
            <Card>
              <div className="p-4 flex justify-end"><button onClick={() => openCreate('rule')} className="btn-primary"><Plus className="w-4 h-4" /> New Rule</button></div>
              <table className="table-base">
                <thead><tr><th>Name</th><th>Trigger</th><th>Template</th><th>Fields</th><th>Enabled</th><th>Actions</th></tr></thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50">
                      <td className="font-medium">{r.name}</td>
                      <td className="text-xs capitalize">{r.trigger?.replace(/_/g,' ')}</td>
                      <td className="text-xs">{r.templateId?.name||'—'}</td>
                      <td className="text-xs">{(r.selectedFields||[]).length} fields</td>
                      <td>
                        <button onClick={() => toggleRule(r)} className={r.isActive ? 'text-emerald-600' : 'text-slate-400'}>
                          {r.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                      </td>
                      <td><div className="flex gap-1">
                        <button onClick={() => openEdit('rule',r)} className="btn-outline py-1 px-2 text-xs"><Edit2 className="w-3 h-3" /></button>
                        <button onClick={() => handleDelete('rule',r._id)} className="btn-danger py-1 px-2 text-xs"><Trash2 className="w-3 h-3" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {tab === 'SMTP Settings' && (
            <Card title="SMTP Configuration">
              <div className="p-5 space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  SMTP credentials are configured via backend environment variables (<code>.env</code>) and are never exposed in the frontend.
                </div>
                <button onClick={checkSmtp} className="btn-primary">Test SMTP Connection</button>
                {smtpStatus && (
                  <div className={`flex items-center gap-2 p-3 rounded border text-sm ${smtpStatus.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <CheckCircle2 className="w-4 h-4" /> {smtpStatus.message}
                  </div>
                )}
                <dl className="space-y-1 text-sm">
                  <p className="text-slate-500">Configure the following in <code>backend/.env</code>:</p>
                  {['SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASS','SMTP_FROM_NAME','SMTP_FROM_ADDRESS'].map((k) => (
                    <div key={k} className="font-mono text-slate-600 bg-slate-50 px-3 py-1 rounded">{k}</div>
                  ))}
                </dl>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`${editing?'Edit':'Add'} ${modalType}`} size="lg">
        <form onSubmit={handleSave} className="space-y-3">
          {modalType==='recipient' && (
            <>
              <Input label="Name *" required value={recipientForm.name} onChange={(e) => setRecipientForm({ ...recipientForm, name:e.target.value })} />
              <Input label="Email *" type="email" required value={recipientForm.email} onChange={(e) => setRecipientForm({ ...recipientForm, email:e.target.value })} />
              <Input label="Description" value={recipientForm.description} onChange={(e) => setRecipientForm({ ...recipientForm, description:e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Type" value={recipientForm.type} onChange={(e) => setRecipientForm({ ...recipientForm, type:e.target.value })}>
                  {['manager','admin','producer','preconfigured','custom'].map((t) => <option key={t}>{t}</option>)}
                </Select>
                <label className="flex items-center gap-2 mt-5 text-sm"><input type="checkbox" checked={recipientForm.isDefault} onChange={(e) => setRecipientForm({ ...recipientForm, isDefault:e.target.checked })} className="rounded" /> Default Recipient</label>
              </div>
            </>
          )}
          {modalType==='template' && (
            <>
              <Input label="Name *" required value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name:e.target.value })} />
              <Input label="Subject *" required value={templateForm.subject} onChange={(e) => setTemplateForm({ ...templateForm, subject:e.target.value })} placeholder="New Lead – {{clientName}}" />
              <Select label="Trigger Type" value={templateForm.triggerType} onChange={(e) => setTemplateForm({ ...templateForm, triggerType:e.target.value })}>
                {TEMPLATE_TRIGGERS.map((t) => <option key={t}>{t}</option>)}
              </Select>
              <div>
                <label className="label">Email Body (HTML)</label>
                <textarea value={templateForm.bodyHtml} onChange={(e) => setTemplateForm({ ...templateForm, bodyHtml:e.target.value })} className="input font-mono text-xs" rows={8} placeholder="<p>Hello,</p><p>Client: {{clientName}}</p>" />
              </div>
              <div>
                <p className="label">Allowed Fields (fields this template can use)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {EMAIL_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={templateForm.allowedFields.includes(f.key)} onChange={() => toggleAllowedField(f.key, templateForm.allowedFields, setTemplateForm, 'allowedFields')} className="rounded" />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
          {modalType==='rule' && (
            <>
              <Input label="Name *" required value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name:e.target.value })} />
              <Select label="Trigger *" value={ruleForm.trigger} onChange={(e) => setRuleForm({ ...ruleForm, trigger:e.target.value })}>
                {RULE_TRIGGERS.map((t) => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </Select>
              <Select label="Template (optional)" value={ruleForm.templateId} onChange={(e) => setRuleForm({ ...ruleForm, templateId:e.target.value })}>
                <option value="">No template</option>
                {templates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </Select>
              <div>
                <p className="label">Recipients</p>
                <div className="flex flex-wrap gap-3">
                  {['manager','admin','producer'].map((r) => (
                    <label key={r} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={!!ruleForm.recipients[r]} onChange={(e) => setRuleForm({ ...ruleForm, recipients: { ...ruleForm.recipients, [r]: e.target.checked } })} className="rounded" />
                      <span className="capitalize">{r}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="label">Selected Fields to Send</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {EMAIL_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={ruleForm.selectedFields.includes(f.key)} onChange={() => toggleAllowedField(f.key, ruleForm.selectedFields, setRuleForm, 'selectedFields')} className="rounded" />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ruleForm.isActive} onChange={(e) => setRuleForm({ ...ruleForm, isActive:e.target.checked })} className="rounded" /> Rule Active</label>
            </>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
