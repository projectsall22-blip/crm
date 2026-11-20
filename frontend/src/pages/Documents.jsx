import { useState, useEffect, useCallback } from 'react';
import { Plus, Download, Trash2, FolderOpen } from 'lucide-react';
import api from '../services/api.js';
import { Card, Spinner, EmptyState, Pagination, Modal, Input, Select } from '../components/ui.jsx';

const DOC_TYPES = ['Insurance Application','Signed Application','Policy Document','Invoice','Receipt','Supporting Document','Other'];

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page:1,pages:1,total:0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ name:'', type:'Other', relatedType:'client' });

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents', { params: { page, limit:20 } });
      setDocuments(res.data.data);
      setPagination(res.data.pagination);
    } catch {} finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Select a file first');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', form.name || file.name);
      fd.append('type', form.type);
      fd.append('relatedType', form.relatedType);
      await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUpload(false);
      setFile(null);
      setForm({ name:'', type:'Other', relatedType:'client' });
      fetchDocs();
    } catch (err) { alert(err.response?.data?.message || 'Upload failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try { await api.delete(`/documents/${id}`); fetchDocs(); } catch (err) { alert(err.response?.data?.message); }
  };

  const handleDownload = (docId, name) => {
    const token = localStorage.getItem('crm_access_token');
    const url = `/api/v1/documents/${docId}/download`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/(1024*1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Documents</h1>
        <button onClick={() => setShowUpload(true)} className="btn-primary"><Plus className="w-4 h-4" /> Upload Document</button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div>
        ) : documents.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No documents found"
            action={<button onClick={() => setShowUpload(true)} className="btn-primary">Upload Document</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Name</th><th>Type</th><th>Related To</th><th>Size</th><th>Uploaded By</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50">
                    <td className="font-medium">{d.name}</td>
                    <td>{d.type}</td>
                    <td className="capitalize text-xs">{d.relatedType}</td>
                    <td className="text-xs">{formatSize(d.sizeBytes)}</td>
                    <td className="text-xs">{d.uploadedBy ? `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}` : '—'}</td>
                    <td className="text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => handleDownload(d._id, d.name)} className="btn-outline py-1 px-2 text-xs" title="Download"><Download className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(d._id)} className="btn-danger py-1 px-2 text-xs" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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

      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Document">
        <form onSubmit={handleUpload} className="space-y-3">
          <div>
            <label className="label">File *</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="input py-1.5" required />
            <p className="text-xs text-slate-400 mt-1">Max {15} MB. Allowed: PDF, DOC, DOCX, JPG, PNG, XLS, XLSX, TXT, ZIP</p>
          </div>
          <Input label="Display Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Leave blank to use filename" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Document Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
            <Select label="Related To" value={form.relatedType} onChange={(e) => setForm({ ...form, relatedType: e.target.value })}>
              <option value="client">Client</option>
              <option value="lead">Lead</option>
              <option value="policy">Policy</option>
            </Select>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Uploading…' : 'Upload'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
