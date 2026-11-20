import { useState, useEffect, useCallback } from 'react';
import { Plus, CheckSquare, AlertTriangle } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, StatusBadge, Spinner, EmptyState, Pagination, Modal, Input, Select } from '../components/ui.jsx';

const STATUSES = ['Pending','In Progress','Completed','Cancelled'];
const PRIORITIES = ['Low','Medium','High','Urgent'];

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page:1,pages:1,total:0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [producers, setProducers] = useState([]);
  const [form, setForm] = useState({ title:'', description:'', assignedTo:'', dueDate:'', priority:'Medium', status:'Pending', taskType:'Follow-up', notes:'' });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks', { params: { page, limit:20, status: statusFilter||undefined, overdue: overdueOnly||undefined } });
      setTasks(res.data.data);
      setPagination(res.data.pagination);
    } catch {} finally { setLoading(false); }
  }, [page, statusFilter, overdueOnly]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    if (['admin','manager'].includes(user.role)) {
      api.get('/users', { params: { role:'producer', limit:100 } }).then((r) => setProducers(r.data.data||[]));
    }
  }, [user.role]);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/tasks', { ...form, dueDate: form.dueDate || undefined });
      setShowCreate(false);
      setForm({ title:'',description:'',assignedTo:'',dueDate:'',priority:'Medium',status:'Pending',taskType:'Follow-up',notes:'' });
      fetchTasks();
    } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  const handleComplete = async (task) => {
    try { await api.put(`/tasks/${task._id}`, { status:'Completed' }); fetchTasks(); } catch {}
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Tasks</h1>
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => { setOverdueOnly(e.target.checked); setPage(1); }} className="rounded" />
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Overdue
          </label>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Task</button>
        </div>
      </div>

      <Card>
        <div className="p-4">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-auto">
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div>
        ) : tasks.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No tasks found"
            action={<button onClick={() => setShowCreate(true)} className="btn-primary">New Task</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Title</th><th>Assigned To</th><th>Due Date</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed';
                  return (
                    <tr key={t._id} className={`hover:bg-slate-50 ${overdue ? 'bg-red-50' : ''}`}>
                      <td className="font-medium">{t.title}{overdue && <span className="ml-1 text-xs text-red-500">Overdue</span>}</td>
                      <td>{t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : '—'}</td>
                      <td className="text-xs">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
                      <td><PriorityBadge p={t.priority} /></td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>
                        {t.status !== 'Completed' && (
                          <button onClick={() => handleComplete(t)} className="btn-success py-1 px-2 text-xs">Complete</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onChange={setPage} />
          </div>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Task">
        <form onSubmit={handleCreate} className="space-y-3">
          <Input label="Title *" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </Select>
            <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          {['admin','manager'].includes(user.role) && (
            <Select label="Assign To" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">Assign to myself</option>
              {producers.map((p) => <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>)}
            </Select>
          )}
          <Input label="Task Type" value={form.taskType} onChange={(e) => setForm({ ...form, taskType: e.target.value })} placeholder="e.g. Follow-up, Call, Document" />
          <div><label className="label">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={3} /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Create Task'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function PriorityBadge({ p }) {
  const c = { Low:'bg-slate-100 text-slate-600', Medium:'bg-blue-100 text-blue-700', High:'bg-amber-100 text-amber-700', Urgent:'bg-red-100 text-red-700' };
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${c[p]||c.Medium}`}>{p}</span>;
}
