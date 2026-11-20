import { useState, useEffect, useCallback } from 'react';
import { Plus, UserCog, Edit2, Eye, EyeOff } from 'lucide-react';
import api from '../services/api.js';
import { Card, Spinner, EmptyState, Pagination, Modal, Input, Select } from '../components/ui.jsx';

const ROLES = ['admin','manager','producer'];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page:1,pages:1,total:0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ firstName:'',lastName:'',email:'',password:'',role:'producer',phone:'',country:'',isActive:true });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', { params: { page, limit:20, role:roleFilter||undefined, search:search||undefined } });
      setUsers(res.data.data); setPagination(res.data.pagination);
    } catch {} finally { setLoading(false); }
  }, [page, roleFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => { setEditing(null); setForm({ firstName:'',lastName:'',email:'',password:'',role:'producer',phone:'',country:'',isActive:true }); setShowModal(true); };
  const openEdit = (u) => { setEditing(u); setForm({ firstName:u.firstName,lastName:u.lastName,email:u.email,password:'',role:u.role,phone:u.phone||'',country:u.country||'',isActive:u.isActive }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      editing ? await api.put(`/users/${editing._id}`, payload) : await api.post('/users', payload);
      setShowModal(false); fetchUsers();
    } catch (err) { alert(err.response?.data?.message||'Error'); } finally { setSaving(false); }
  };

  const handleDeactivate = async (u) => {
    if (!window.confirm(`Deactivate ${u.firstName} ${u.lastName}?`)) return;
    try { await api.delete(`/users/${u._id}`); fetchUsers(); } catch (err) { alert(err.response?.data?.message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Users</h1>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> New User</button>
      </div>
      <Card>
        <div className="p-4 flex gap-3 flex-wrap">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search users…" className="input flex-1 min-w-[180px]" />
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="input w-auto">
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} className="capitalize">{r}</option>)}
          </select>
        </div>
        {loading ? <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div> : users.length===0 ? (
          <EmptyState icon={UserCog} title="No users found" action={<button onClick={openCreate} className="btn-primary">New User</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="font-medium">{u.firstName} {u.lastName}</td>
                    <td>{u.email}</td>
                    <td><span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded ${u.role==='admin'?'bg-navy-100 text-navy-700':u.role==='manager'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
                    <td>{u.phone||'—'}</td>
                    <td><span className={`text-xs font-medium ${u.isActive?'text-emerald-600':'text-red-500'}`}>{u.isActive?'Active':'Inactive'}</span></td>
                    <td className="text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} className="btn-outline py-1 px-2 text-xs"><Edit2 className="w-3.5 h-3.5" /></button>
                        {u.isActive && <button onClick={() => handleDeactivate(u)} className="btn-danger py-1 px-2 text-xs">Deactivate</button>}
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`${editing?'Edit':'New'} User`}>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name *" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName:e.target.value })} />
            <Input label="Last Name *" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName:e.target.value })} />
          </div>
          <Input label="Email *" type="email" required={!editing} value={form.email} onChange={(e) => setForm({ ...form, email:e.target.value })} />
          <div className="relative">
            <Input label={editing?'New Password (leave blank to keep)':'Password *'} type={showPass?'text':'password'} required={!editing} value={form.password} onChange={(e) => setForm({ ...form, password:e.target.value })} />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-7 text-slate-400">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Role *" value={form.role} onChange={(e) => setForm({ ...form, role:e.target.value })}>
              {ROLES.map((r) => <option key={r} className="capitalize">{r}</option>)}
            </Select>
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone:e.target.value })} />
          </div>
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country:e.target.value })} />
          {editing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive:e.target.checked })} className="rounded" /> Active</label>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
