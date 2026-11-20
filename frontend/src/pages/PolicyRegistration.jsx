import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, FileText, Building2, Calendar, CreditCard } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Input, Select, Spinner } from '../components/ui.jsx';

// Insurance / policy types
const POLICY_TYPES = [
  'Auto Insurance',
  'Home Insurance',
  'Commercial Insurance',
  'Life Insurance',
  'Travel Insurance',
  'Health Insurance',
  'Liability Insurance',
  'Marine Insurance',
  'Other',
];

export default function PolicyRegistration() {
  const { leadId } = useParams();
  const [searchParams] = useSearchParams();
  const urlClientId = searchParams.get('clientId'); // ?clientId=xxx
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lead, setLead] = useState(null);
  const [client, setClient] = useState(null);
  const [insurers, setInsurers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [newPolicyId, setNewPolicyId] = useState(null);

  const [form, setForm] = useState({
    clientId:        '',
    policyType:      '',      // maps to insuranceCategory
    insurerId:       '',
    effectiveDate:   '',
    expiryDate:      '',
    billType:        'Direct Bill',
    policyNumber:    '',
    applicationReference: '',
    totalPremium:    '',
    commissionPercent: '',
    brokerFee:       '',
    currency:        'CAD',
    notes:           '',
  });

  /* ── Load data ─────────────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      try {
        // Always load active insurers
        const iRes = await api.get('/insurers', { params: { limit: 200, status: 'Active' } });
        setInsurers(iRes.data.data || []);

        if (leadId) {
          // ── Coming from Lead Won flow ──────────────────────
          const lRes = await api.get(`/leads/${leadId}`);
          const l = lRes.data.lead;
          setLead(l);

          // clientId can be populated object OR plain ObjectId string
          const rawClientId = l.clientId?._id || l.clientId || null;

          setForm((f) => ({
            ...f,
            clientId:   rawClientId || '',
            policyType: l.insuranceType || '',
          }));

          if (rawClientId) {
            try {
              const cRes = await api.get(`/clients/${rawClientId}`);
              setClient(cRes.data.client);
            } catch {
              // Client fetch failed — build a fallback from lead data
              setClient({
                _id:       rawClientId,
                firstName: l.clientName?.split(' ')[0] || l.clientName || 'Client',
                lastName:  l.clientName?.split(' ').slice(1).join(' ') || '',
                email:     l.email || '',
                phone:     l.phone || '',
              });
            }
          } else {
            // No clientId on lead — build client from lead data
            setClient({
              _id:       null,
              firstName: l.clientName?.split(' ')[0] || l.clientName || 'Client',
              lastName:  l.clientName?.split(' ').slice(1).join(' ') || '',
              email:     l.email || '',
              phone:     l.phone || '',
            });
          }

        } else if (urlClientId) {
          // ── Coming from Client Profile button ──────────────
          try {
            const cRes = await api.get(`/clients/${urlClientId}`);
            setClient(cRes.data.client);
            setForm((f) => ({ ...f, clientId: urlClientId }));
          } catch {
            setError('Could not load client details. Please go back and try again.');
          }
        }
      } catch (e) {
        console.error('[PolicyRegistration] init error:', e);
        setError('Failed to load data. Please go back and try again.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [leadId, urlClientId]);

  /* ── Submit ─────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientId)      return setError('Client is required.');
    if (!form.policyType)    return setError('Policy type is required.');
    if (!form.insurerId)     return setError('Please select an insurer.');
    if (!form.effectiveDate) return setError('Effective date is required.');
    if (!form.expiryDate)    return setError('End date is required.');

    setSaving(true);
    setError('');
    try {
      const payload = {
        clientId:          form.clientId,
        leadId:            leadId || undefined,
        insurerId:         form.insurerId,
        insuranceCategory: form.policyType,
        policyNumber:      form.policyNumber || '',
        applicationReference: form.applicationReference || '',
        effectiveDate:     form.effectiveDate,
        expiryDate:        form.expiryDate,
        billType:          form.billType,
        totalPremium:      form.totalPremium      ? Number(form.totalPremium)      : 0,
        brokerFee:         form.brokerFee         ? Number(form.brokerFee)         : 0,
        commissionPercent: form.commissionPercent ? Number(form.commissionPercent) : 0,
        currency:          form.currency          || 'CAD',
        notes:             form.notes || undefined,
        policyStatus:      'Policy Issuance Pending',
        paymentStatus:     'Unpaid',
        currency:          'CAD',
        basePremium:       0,
      };
      const res = await api.post('/policies', payload);
      setNewPolicyId(res.data.policy._id);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register policy. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Helpers ─────────────────────────────────────────────── */
  // Build display name from whatever data we have
  const clientDisplayName = (() => {
    if (client) {
      const name = `${client.firstName || ''} ${client.lastName || ''}`.trim();
      return name || client.clientName || lead?.clientName || 'Unknown Client';
    }
    if (lead?.clientName) return lead.clientName;
    return 'Loading…';
  })();

  /* ── States ─────────────────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-8 h-8" />
    </div>
  );

  if (success) return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-emerald-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Policy Registered!</h2>
        <p className="text-gray-500 text-sm mt-1">
          Policy saved as <strong>Issuance Pending</strong>.<br />
          Add more details from the policy profile.
        </p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => navigate(`/policies/${newPolicyId}`)} className="btn-primary">
          View Policy Details
        </button>
        {(form.clientId || urlClientId) && (
          <button
            onClick={() => navigate(`/clients/${form.clientId || urlClientId}`)}
            className="btn-outline"
          >
            Back to Client
          </button>
        )}
      </div>
    </div>
  );

  /* ── Form ────────────────────────────────────────────────── */
  return (
    <div className="max-w-xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-outline p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Register Policy</h1>
          <p className="text-sm text-gray-500">
            {lead ? `Won lead — ${lead.clientName}` : `Client — ${clientDisplayName}`}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Client info strip */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
          {clientDisplayName && clientDisplayName !== 'Loading…'
            ? clientDisplayName.charAt(0).toUpperCase()
            : '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{clientDisplayName}</p>
          {client?.email && <p className="text-xs text-gray-500">{client.email}</p>}
          {client?.phone && <p className="text-xs text-gray-500">{client.phone}</p>}
        </div>
        <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
          Client
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Policy Type */}
        <Card>
          <div className="p-5 space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">Policy Type</h3>
            </div>
            <label className="label">Insurance / Policy Type *</label>
            <select
              required
              value={form.policyType}
              onChange={(e) => setForm({ ...form, policyType: e.target.value })}
              className="input"
            >
              <option value="">— Select policy type —</option>
              {POLICY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Insurer */}
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Insurance Company</h3>
                {insurers.length === 0 && (
                  <p className="text-xs text-amber-600">
                    No insurers found. Ask an Admin to add insurers first.
                  </p>
                )}
              </div>
            </div>
            <label className="label">Insurer Name *</label>
            <select
              required
              value={form.insurerId}
              onChange={(e) => setForm({ ...form, insurerId: e.target.value })}
              className="input"
            >
              <option value="">— Select insurer —</option>
              {insurers.map((ins) => (
                <option key={ins._id} value={ins._id}>{ins.companyName}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Policy Numbers */}
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-sky-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">Reference Numbers</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Policy Number</label>
                <input
                  type="text"
                  value={form.policyNumber}
                  onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
                  className="input"
                  placeholder="e.g. POL-2024-001"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank if not issued yet</p>
              </div>
              <div>
                <label className="label">Acturis Contact Ref No.</label>
                <input
                  type="text"
                  value={form.applicationReference}
                  onChange={(e) => setForm({ ...form, applicationReference: e.target.value })}
                  className="input"
                  placeholder="e.g. ACT-20241234"
                />
                <p className="text-xs text-gray-400 mt-1">Contact reference from Acturis system</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Dates */}
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">Policy Period</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Effective Date *</label>
                <input
                  type="date"
                  required
                  value={form.effectiveDate}
                  onChange={(e) => {
                    const eff = e.target.value;
                    setForm((f) => {
                      // Auto-set end date to 1 year later if not set
                      let expiry = f.expiryDate;
                      if (!expiry && eff) {
                        const d = new Date(eff);
                        d.setFullYear(d.getFullYear() + 1);
                        expiry = d.toISOString().split('T')[0];
                      }
                      return { ...f, effectiveDate: eff, expiryDate: expiry };
                    });
                  }}
                  className="input"
                />
              </div>
              <div>
                <label className="label">End Date *</label>
                <input
                  type="date"
                  required
                  value={form.expiryDate}
                  min={form.effectiveDate || undefined}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            {/* Duration display */}
            {form.effectiveDate && form.expiryDate && (
              <p className="text-xs text-gray-400 mt-2">
                Duration:{' '}
                <span className="font-medium text-indigo-600">
                  {Math.round(
                    (new Date(form.expiryDate) - new Date(form.effectiveDate)) / (1000 * 60 * 60 * 24)
                  )}{' '}days
                </span>
                {' '}— Renewal will be tracked automatically
              </p>
            )}
          </div>
        </Card>

        {/* Bill Type */}
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">Bill Type</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['Direct Bill', 'Agency Bill'].map((bt) => (
                <button
                  key={bt}
                  type="button"
                  onClick={() => setForm({ ...form, billType: bt })}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all
                    ${form.billType === bt
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-200'}`}
                >
                  {bt}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {form.billType === 'Direct Bill'
                ? 'Client pays the insurer directly.'
                : 'Client pays through the agency/broker.'}
            </p>
          </div>
        </Card>

        {/* Financial Details */}
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">Financial Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Currency */}
              <div>
                <label className="label">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="input"
                >
                  {['CAD','USD','EUR','GBP','AED','AUD','INR'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              {/* Total Premium */}
              <div>
                <label className="label">Total Premium</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    {form.currency}
                  </span>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.totalPremium}
                    onChange={(e) => setForm({ ...form, totalPremium: e.target.value })}
                    className="input pl-12"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {/* Commission % */}
              <div>
                <label className="label">Commission %</label>
                <div className="relative">
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={form.commissionPercent}
                    onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })}
                    className="input pr-8"
                    placeholder="e.g. 10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                {/* Auto-calculated commission amount */}
                {form.totalPremium && form.commissionPercent ? (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    = {form.currency} {((Number(form.totalPremium) * Number(form.commissionPercent)) / 100).toFixed(2)}
                  </p>
                ) : null}
              </div>
              {/* Broker Fee */}
              <div>
                <label className="label">Broker Fee</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    {form.currency}
                  </span>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.brokerFee}
                    onChange={(e) => setForm({ ...form, brokerFee: e.target.value })}
                    className="input pl-12"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            {/* Total summary */}
            {(form.totalPremium || form.brokerFee) ? (
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-500">Total (Premium + Broker Fee)</span>
                <span className="text-base font-bold text-indigo-700">
                  {form.currency}{' '}
                  {(Number(form.totalPremium || 0) + Number(form.brokerFee || 0)).toFixed(2)}
                </span>
              </div>
            ) : null}
          </div>
        </Card>

        {/* Notes (optional) */}
        <Card>
          <div className="p-5">
            <label className="label">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input resize-none"
              rows={3}
              placeholder="Any additional details about this policy…"
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end pb-4">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Registering…
              </span>
            ) : 'Register Policy'}
          </button>
        </div>
      </form>
    </div>
  );
}
