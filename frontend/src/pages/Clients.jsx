import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit2, UserPlus, AlertCircle, Users } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Badge, Spinner, EmptyState, Pagination, Modal, Input, Select } from '../components/ui.jsx';
import CanadaAddressFields, { formatAddressString } from '../components/CanadaAddressFields.jsx';

const LEAD_SOURCES = ['Website', 'Referral', 'Social Media', 'Cold Call', 'Walk-in', 'Email Campaign', 'Other'];

export default function Clients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [producers, setProducers] = useState([]);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: { street: '', city: '', province: '', postalCode: '' },
    leadSource: '', notes: '',
  });
  const [assignProducerId, setAssignProducerId] = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/clients', { params: { page, limit: 20, search: search || undefined } });
      setClients(res.data.data);
      setPagination(res.data.pagination);
    } catch { } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => {
    if (user.role === 'admin') {
      api.get('/users', { params: { role: 'producer', limit: 100 } }).then((r) => setProducers(r.data.data || []));
    }
  }, [user.role]);

  // Check for duplicates when email/phone changes
  const checkDuplicates = async (email, phone) => {
    if (!email && !phone) { setDuplicates([]); return; }
    try {
      const res = await api.get('/clients/duplicates/check', { params: { email: email || undefined, phone: phone || undefined } });
      setDuplicates(res.data.duplicates || []);
    } catch { }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/clients', {
        ...form,
        street:     form.address.street,
        city:       form.address.city,
        province:   form.address.province,
        postalCode: form.address.postalCode,
      });
      setShowCreate(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '', address: { street:'', city:'', province:'', postalCode:'' }, leadSource: '', notes: '' });
      setDuplicates([]);
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create client');
    } finally { setSaving(false); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignProducerId || !selectedClient) return;
    setSaving(true);
    try {
      await api.post(`/clients/${selectedClient._id}/assign`, { ownerProducerId: assignProducerId });
      setShowAssign(false);
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.message || 'Assignment failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Clients</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Client</button>
      </div>

      <Card>
        <div className="p-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, email, phone…"
              className="input pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div>
        ) : clients.length === 0 ? (
          <EmptyState icon={Users} title="No clients found" message="Create your first client to get started."
            action={<button onClick={() => setShowCreate(true)} className="btn-primary">New Client</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Client ID</th><th>Name</th><th>Email</th><th>Phone</th>
                  <th>Lead Source</th><th>Assigned Producer</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50">
                    <td><span className="font-mono text-xs text-slate-500">{c.clientId}</span></td>
                    <td><span className="font-medium text-slate-800">{formatClientName(c.firstName, c.lastName)}</span></td>
                    <td>{c.email || <span className="text-slate-400">—</span>}</td>
                    <td>{c.phone || <span className="text-slate-400">—</span>}</td>
                    <td>{c.leadSource || <span className="text-slate-400">—</span>}</td>
                    <td>
                      {c.ownerProducerId
                        ? <span className="text-sm">{c.ownerProducerId.firstName} {c.ownerProducerId.lastName}</span>
                        : <span className="text-slate-400 text-sm">Unassigned</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/clients/${c._id}`)}
                          className="btn-outline py-1 px-2 text-xs"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {/* Only Manager can register a policy */}
                        {user.role === 'manager' && (
                          <button
                            onClick={() => navigate(`/policies/register?clientId=${c._id}`)}
                            title="Register Policy"
                            style={{ background: '#4F46E5', color: '#fff', border: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            + Policy
                          </button>
                        )}
                        {user.role === 'admin' && (
                          <button
                            onClick={() => { setSelectedClient(c); setShowAssign(true); }}
                            className="btn-outline py-1 px-2 text-xs"
                            title="Assign Producer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
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

      {/* Create Client Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setDuplicates([]); setError(''); setForm({ firstName:'', lastName:'', email:'', phone:'', address:{ street:'', city:'', province:'', postalCode:'' }, leadSource:'', notes:'' }); }} title="New Client" size="lg">
        {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>}
        {duplicates.length > 0 && (
          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
            <div className="flex items-center gap-1 text-amber-700 font-medium"><AlertCircle className="w-4 h-4" /> Possible duplicates found:</div>
            {duplicates.map((d, i) => <p key={i} className="text-amber-600 text-xs mt-0.5">Same {d.field}: {d.existingName}</p>)}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name *" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); checkDuplicates(e.target.value, form.phone); }} />
            <Input label="Phone" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); checkDuplicates(form.email, e.target.value); }} />
          </div>
          <div>
            <label className="label">Address</label>
            <CanadaAddressFields
              value={form.address}
              onChange={(addr) => setForm({ ...form, address: addr })}
            />
          </div>
          <Select label="Lead Source" value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })}>
            <option value="">Select source</option>
            {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
          </Select>
          {user.role === 'admin' && (
            <Select label="Assign to Producer" value={form.ownerProducerId || ''} onChange={(e) => setForm({ ...form, ownerProducerId: e.target.value })}>
              <option value="">No assignment</option>
              {producers.map((p) => <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>)}
            </Select>
          )}
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={3} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create Client'}</button>
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title={`Assign: ${selectedClient?.firstName} ${selectedClient?.lastName}`}>
        <form onSubmit={handleAssign} className="space-y-3">
          <Select label="Assign to Producer" required value={assignProducerId} onChange={(e) => setAssignProducerId(e.target.value)}>
            <option value="">Select producer</option>
            {producers.map((p) => <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>)}
          </Select>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowAssign(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Assigning…' : 'Assign'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Helper: clean client name — hide "." placeholder last name from auto-creation
function formatClientName(firstName, lastName) {
  const last = (lastName || '').trim();
  if (!last || last === '.') return (firstName || '').trim();
  return `${(firstName || '').trim()} ${last}`.trim();
}
