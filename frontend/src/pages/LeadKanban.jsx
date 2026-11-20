import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ThumbsDown, Eye, RefreshCw } from 'lucide-react';
import api from '../services/api.js';
import { StatusBadge, Spinner } from '../components/ui.jsx';

const STATUS_COLORS = {
  New: 'border-blue-400', Contacted: 'border-slate-400', 'Follow-up': 'border-amber-400',
  Interested: 'border-purple-400', 'In Progress': 'border-indigo-400',
  Won: 'border-emerald-400', Lost: 'border-red-400', 'On Hold': 'border-slate-400',
};
const COLUMN_BG = {
  New: 'bg-blue-50', Contacted: 'bg-slate-50', 'Follow-up': 'bg-amber-50',
  Interested: 'bg-purple-50', 'In Progress': 'bg-indigo-50',
  Won: 'bg-emerald-50', Lost: 'bg-red-50', 'On Hold': 'bg-slate-50',
};

export default function LeadKanban() {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchKanban = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leads/kanban');
      setPipeline(res.data.pipeline || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchKanban(); }, []);

  const handleMarkWon = async (lead) => {
    try {
      const res = await api.post(`/leads/${lead._id}/won`);
      if (res.data.clientCreated) {
        // Show a brief toast then redirect to policy registration
        const clientName = `${res.data.client?.firstName} ${res.data.client?.lastName}`;
        const msg = `✅ Lead Won!\n\nClient "${clientName}" has been automatically added to the CRM.\n\nProceed to register policy?`;
        if (window.confirm(msg)) {
          navigate(`/policies/register/${lead._id}`);
        } else {
          fetchKanban();
        }
      } else {
        navigate(`/policies/register/${lead._id}`);
      }
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleMarkLost = async (lead) => {
    if (!window.confirm(`Mark ${lead.clientName} as Lost?`)) return;
    try {
      await api.post(`/leads/${lead._id}/lost`);
      fetchKanban();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Lead Pipeline</h1>
        <div className="flex gap-2">
          <button onClick={fetchKanban} className="btn-outline"><RefreshCw className="w-4 h-4" /> Refresh</button>
          <button onClick={() => navigate('/leads')} className="btn-outline">List View</button>
          <button onClick={() => navigate('/leads')} className="btn-primary">+ New Lead</button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipeline.map(({ status, leads, count }) => (
          <div key={status} className="flex-shrink-0 w-72">
            <div className={`rounded-t-lg px-3 py-2 flex items-center justify-between border-t-2 ${STATUS_COLORS[status]} bg-white`}>
              <span className="text-sm font-semibold text-slate-700">{status}</span>
              <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">{count}</span>
            </div>
            <div className={`space-y-2 p-2 rounded-b-lg min-h-[200px] ${COLUMN_BG[status]}`}>
              {leads.length === 0 && (
                <div className="text-xs text-slate-400 text-center py-4">No leads</div>
              )}
              {leads.map((l) => (
                <div key={l._id} className="bg-white rounded-md border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                  <p className="font-semibold text-sm text-slate-800 truncate">{l.clientName}</p>
                  {l.insuranceType && <p className="text-xs text-slate-500 mt-0.5">{l.insuranceType}</p>}
                  {l.expectedPremium > 0 && (
                    <p className="text-xs text-emerald-700 font-medium mt-1">{l.currency} {l.expectedPremium.toLocaleString()}</p>
                  )}
                  {l.assignedProducer && (
                    <p className="text-xs text-slate-400 mt-1">Producer: {l.assignedProducer.firstName} {l.assignedProducer.lastName}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    <button onClick={() => navigate(`/leads/${l._id}`)} className="btn-outline py-0.5 px-2 text-xs flex-1 justify-center">
                      <Eye className="w-3 h-3" />
                    </button>
                    {status !== 'Won' && status !== 'Lost' && (
                      <>
                        <button onClick={() => handleMarkWon(l)} className="btn-success py-0.5 px-2 text-xs" title="Won">
                          <Trophy className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleMarkLost(l)} className="btn-danger py-0.5 px-2 text-xs" title="Lost">
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
