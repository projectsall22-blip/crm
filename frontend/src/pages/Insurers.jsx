import { useState, useEffect, useCallback } from 'react';
import { Plus, Building2, Edit2, Search } from 'lucide-react';
import api from '../services/api.js';
import { Card, Spinner, EmptyState, Pagination, Modal, Input, Select } from '../components/ui.jsx';

export default function Insurers() {
  const [insurers, setInsurers] = useState([]);
  const [pagination, setPagination] = useState({ page:1,pages:1,total:0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ companyName:'', country:'', website:'', contactEmail:'', contactPhone:'', status:'Active', notes:'' });

  const fetchInsurers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/insurers', { params: { page, limit:20, search:search||undefined } });
      setInsurers(res.data.data); setPagination(res.data.pagination);
    } catch {} finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchInsurers(); }, [fetchInsurers]);

  const openCreate = () => { setEditing(null); setForm({ companyName:'',country:'',website:'',contactEmail:'',contactPhone:'',status:'Active',notes:'' }); setShowModal(true); };
  const openEdit = (ins) => { setEditing(ins); setForm({ companyName:ins.companyName, country:ins.country, website:ins.website, contactEmail:ins.contactEmail, contactPhone:ins.contactPhone, status:ins.status, notes:ins.notes }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      editing ? await api.put(`/insurers/${editing._id}`, form) : await api.post('/insurers', form);
      setShowModal(false); fetchInsurers();
    } catch (err) { alert(err.response?.data?.message||'Error'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Insurance Companies</h1>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Insurer</button>
      </div>
      <Card>
        <div className="p-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search insurers…" className="input pl-9" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div>
        ) : insurers.length===0 ? (
          <EmptyState icon={Building2} title="No insurers found" action={<button onClick={openCreate} className="btn-primary">Add Insurer</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Company</th><th>Country</th><th>Contact Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {insurers.map((ins) => (
                  <tr key={ins._id} className="hover:bg-slate-50">
                    <td className="font-medium">{ins.companyName}</td><td>{ins.country||'—'}</td>
                    <td>{ins.contactEmail||'—'}</td><td>{ins.contactPhone||'—'}</td>
                    <td><span className={`text-xs font-medium ${ins.status==='Active'?'text-emerald-600':'text-slate-400'}`}>{ins.status}</span></td>
                    <td><button onClick={() => openEdit(ins)} className="btn-outline py-1 px-2 text-xs"><Edit2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onChange={setPage} />
          </div>
        )}
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`${editing?'Edit':'Add'} Insurance Company`}>
        <form onSubmit={handleSave} className="space-y-3">
          <Input label="Company Name *" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName:e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country:e.target.value })} />
            <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website:e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact Email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail:e.target.value })} />
            <Input label="Contact Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone:e.target.value })} />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status:e.target.value })}>
            <option>Active</option><option>Inactive</option>
          </Select>
          <div><label className="label">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes:e.target.value })} className="input" rows={2} /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
