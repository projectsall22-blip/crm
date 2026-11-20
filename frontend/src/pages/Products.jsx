import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Edit2 } from 'lucide-react';
import api from '../services/api.js';
import { Card, Spinner, EmptyState, Pagination, Modal, Input, Select } from '../components/ui.jsx';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page:1,pages:1,total:0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [insurers, setInsurers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ productName:'', insurerId:'', insuranceCategory:'', description:'', isActive:true });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', { params: { page, limit:20 } });
      setProducts(res.data.data); setPagination(res.data.pagination);
    } catch {} finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { api.get('/insurers', { params: { limit:100, status:'Active' } }).then((r) => setInsurers(r.data.data||[])); }, []);

  const openCreate = () => { setEditing(null); setForm({ productName:'',insurerId:'',insuranceCategory:'',description:'',isActive:true }); setShowModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ productName:p.productName, insurerId:p.insurerId?._id||p.insurerId||'', insuranceCategory:p.insuranceCategory, description:p.description, isActive:p.isActive }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      editing ? await api.put(`/products/${editing._id}`, form) : await api.post('/products', form);
      setShowModal(false); fetchProducts();
    } catch (err) { alert(err.response?.data?.message||'Error'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Products</h1>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Product</button>
      </div>
      <Card>
        {loading ? <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div> : products.length===0 ? (
          <EmptyState icon={FileText} title="No products found" action={<button onClick={openCreate} className="btn-primary">Add Product</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Product Name</th><th>Insurer</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="font-medium">{p.productName}</td>
                    <td>{p.insurerId?.companyName||'—'}</td>
                    <td>{p.insuranceCategory||'—'}</td>
                    <td><span className={`text-xs font-medium ${p.isActive?'text-emerald-600':'text-slate-400'}`}>{p.isActive?'Active':'Inactive'}</span></td>
                    <td><button onClick={() => openEdit(p)} className="btn-outline py-1 px-2 text-xs"><Edit2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onChange={setPage} />
          </div>
        )}
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`${editing?'Edit':'Add'} Product`}>
        <form onSubmit={handleSave} className="space-y-3">
          <Input label="Product Name *" required value={form.productName} onChange={(e) => setForm({ ...form, productName:e.target.value })} />
          <Select label="Insurance Company *" required value={form.insurerId} onChange={(e) => setForm({ ...form, insurerId:e.target.value })}>
            <option value="">Select insurer</option>
            {insurers.map((i) => <option key={i._id} value={i._id}>{i.companyName}</option>)}
          </Select>
          <Input label="Insurance Category" value={form.insuranceCategory} onChange={(e) => setForm({ ...form, insuranceCategory:e.target.value })} placeholder="e.g. Motor, Life, Health" />
          <div><label className="label">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description:e.target.value })} className="input" rows={3} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive:e.target.checked })} className="rounded" /> Active</label>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving…':'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
