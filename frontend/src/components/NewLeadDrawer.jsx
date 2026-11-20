/**
 * NewLeadDrawer — Two-section public lead intake form
 *
 * Section 1 (Saves to DB):
 *   Producer selection → Client Name / Address / Mobile / Email / Insurance Type
 *
 * Section 2 (Email ONLY — never stored in DB):
 *   Policy subtype selector → dynamic questionnaire → email sent to producer
 */
import { useState, useEffect, useRef } from 'react';
import {
  X, ChevronRight, ChevronLeft, User, Phone, Mail,
  Shield, Send, CheckCircle2, ChevronDown,
} from 'lucide-react';
import api from '../services/api.js';
import CanadaAddressFields, { formatAddressString } from './CanadaAddressFields.jsx';

// ─── constants ──────────────────────────────────────────────
const STEPS = ['Producer', 'Client Details', 'Insurance Type', 'Questionnaire', 'Review & Submit'];

export default function NewLeadDrawer({ open, onClose }) {
  const [step, setStep] = useState(0);
  const [producers, setProducers] = useState([]);
  const [policyTypes, setPolicyTypes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedTo, setSubmittedTo] = useState([]);
  const [error, setError] = useState('');
  const bodyRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    producerId: '',
    producerName: '',
    producerEmail: '',
    clientName: '',
    email: '',
    phone: '',
    address: { street: '', city: '', province: '', postalCode: '' },
    leadSource: 'Website',
    notes: '',
  });

  // Section 2 state
  const [insuranceType, setInsuranceType] = useState('');
  const [subType, setSubType] = useState('');
  const [questionnaire, setQuestionnaire] = useState({});
  const [sendEmail, setSendEmail] = useState(true);

  // Email recipients state
  const [availableRecipients, setAvailableRecipients] = useState({ managers: [], admins: [] });
  const [selectedRecipients, setSelectedRecipients] = useState(new Set()); // set of email strings
  const [customEmail, setCustomEmail] = useState('');
  const [customEmailError, setCustomEmailError] = useState('');

  // Fetch producers + policy types + email recipients on open
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSubmitted(false);
    setSubmittedTo([]);
    setError('');
    setQuestionnaire({});
    setInsuranceType('');
    setSubType('');
    setSelectedRecipients(new Set());
    setCustomEmail('');
    setCustomEmailError('');

    api.get('/public/lead/producers').then((r) => setProducers(r.data.producers || [])).catch(() => {});
    api.get('/public/lead/policy-types').then((r) => setPolicyTypes(r.data.policyTypes || [])).catch(() => {});
    api.get('/public/lead/email-recipients').then((r) => setAvailableRecipients(r.data)).catch(() => {});
  }, [open]);

  // Fetch questions when insurance type changes
  useEffect(() => {
    if (!insuranceType) return;
    setLoading(true);
    setQuestionnaire({});
    setSubType('');
    api.get('/public/lead/questions', { params: { policyType: insuranceType } })
      .then((r) => {
        setQuestions(r.data.questions || []);
        // Group by section
        const g = {};
        (r.data.questions || []).forEach((q) => {
          if (!g[q.section]) g[q.section] = [];
          g[q.section].push(q);
        });
        setGrouped(g);
      })
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [insuranceType]);

  // Scroll to top on step change
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const selectedPolicy = policyTypes.find((p) => p.type === insuranceType);

  const setQ = (key, val) => setQuestionnaire((prev) => ({ ...prev, [key]: val }));

  const canNext = () => {
    if (step === 0) return !!form.producerId;
    if (step === 1) return !!form.clientName.trim();
    if (step === 2) return !!insuranceType;
    if (step === 3) return true; // questionnaire is optional
    return true;
  };

  const handleNext = () => {
    if (!canNext()) { setError('Please fill in the required fields.'); return; }
    setError('');
    setStep((s) => s + 1);
  };

  const handleBack = () => { setError(''); setStep((s) => s - 1); };

  const handleSubmit = async () => {
    if (!form.producerId || !form.clientName || !insuranceType) {
      setError('Please complete all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/public/lead/submit', {
        producerId: form.producerId,
        clientName: form.clientName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: formatAddressString(form.address) || undefined,
        street:     form.address?.street     || undefined,
        city:       form.address?.city       || undefined,
        province:   form.address?.province   || undefined,
        postalCode: form.address?.postalCode || undefined,
        leadSource: form.leadSource,
        notes: form.notes || undefined,
        insuranceType,
        subType: subType || undefined,
        questionnaire: Object.keys(questionnaire).length > 0 ? questionnaire : undefined,
        sendQuestionnaireEmail: sendEmail && Object.keys(questionnaire).length > 0,
        additionalRecipients: sendEmail ? [...selectedRecipients] : [],
      });
      setSubmittedTo(res.data.emailsSentTo || []);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setForm({ producerId: '', producerName: '', producerEmail: '', clientName: '', email: '', phone: '', address: { street: '', city: '', province: '', postalCode: '' }, leadSource: 'Website', notes: '' });
    setInsuranceType(''); setSubType(''); setQuestionnaire({});
    setSelectedRecipients(new Set()); setCustomEmail(''); setCustomEmailError('');
    setStep(0); setSubmitted(false); setSubmittedTo([]); setError('');
    onClose();
  };

  const addCustomEmail = () => {
    const val = customEmail.trim().toLowerCase();
    if (!val) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setCustomEmailError('Please enter a valid email address');
      return;
    }
    setSelectedRecipients((prev) => new Set([...prev, val]));
    setCustomEmail('');
    setCustomEmailError('');
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={resetAndClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full z-50 w-full sm:w-[520px] lg:w-[560px]
                      flex flex-col bg-white shadow-2xl
                      animate-[slideInRight_.25s_ease-out]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4
                        bg-gradient-to-r from-indigo-700 to-indigo-500 text-white shrink-0">
          <div>
            <h2 className="text-lg font-bold">New Insurance Lead</h2>
            <p className="text-indigo-200 text-xs mt-0.5">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
          </div>
          <button onClick={resetAndClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-indigo-100 shrink-0">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step pills */}
        <div className="flex items-center px-6 py-3 gap-1 overflow-x-auto shrink-0 bg-gray-50 border-b border-gray-200">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                ${i === step ? 'bg-indigo-600 text-white' : i < step ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                {i < step ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-4 text-center">{i + 1}</span>}
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-5">
          {submitted ? (
            <SuccessView onClose={resetAndClose} sentTo={submittedTo} />
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* ── STEP 0: Producer Selection ── */}
              {step === 0 && (
                <div className="space-y-4">
                  <SectionHeader
                    icon={<Shield className="w-5 h-5 text-indigo-600" />}
                    title="Select Producer"
                    subtitle="Choose the producer who will manage this lead"
                  />
                  <div className="space-y-2">
                    {producers.length === 0 && (
                      <p className="text-sm text-gray-400 py-4 text-center">Loading producers…</p>
                    )}
                    {producers.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => {
                          setForm({ ...form, producerId: p._id, producerName: `${p.firstName} ${p.lastName}`, producerEmail: p.email });
                          // Auto-select producer email as default recipient
                          setSelectedRecipients(new Set([p.email]));
                        }}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                          ${form.producerId === p._id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50'}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-gray-500">{p.email}</p>
                        </div>
                        {form.producerId === p._id && (
                          <CheckCircle2 className="w-5 h-5 text-indigo-600 ml-auto shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── STEP 1: Client Details (saves to DB) ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <SectionHeader
                    icon={<User className="w-5 h-5 text-indigo-600" />}
                    title="Client Information"
                    subtitle="This information will be saved to the CRM database"
                    tag="Saves to Database"
                    tagColor="indigo"
                  />
                  <FieldRow label="Full Name *">
                    <InputWithIcon icon={<User className="w-4 h-4 text-gray-400" />}
                      type="text" placeholder="John Smith" value={form.clientName}
                      onChange={(v) => setForm({ ...form, clientName: v })} />
                  </FieldRow>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldRow label="Mobile Number">
                      <InputWithIcon icon={<Phone className="w-4 h-4 text-gray-400" />}
                        type="tel" placeholder="+1 (555) 000-0000" value={form.phone}
                        onChange={(v) => setForm({ ...form, phone: v })} />
                    </FieldRow>
                    <FieldRow label="Email Address">
                      <InputWithIcon icon={<Mail className="w-4 h-4 text-gray-400" />}
                        type="email" placeholder="john@email.com" value={form.email}
                        onChange={(v) => setForm({ ...form, email: v })} />
                    </FieldRow>
                  </div>
                  <div>
                    <label className="label">Address</label>
                    <CanadaAddressFields
                      value={form.address}
                      onChange={(addr) => setForm({ ...form, address: addr })}
                    />
                  </div>
                  <FieldRow label="How did they find us?">
                    <select value={form.leadSource}
                      onChange={(e) => setForm({ ...form, leadSource: e.target.value })}
                      className="input">
                      {['Website','Referral','Social Media','Cold Call','Walk-in','Email Campaign','Other'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </FieldRow>
                  <FieldRow label="Initial Notes">
                    <textarea value={form.notes} rows={3}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="input resize-none" placeholder="Briefly describe client's requirements…" />
                  </FieldRow>
                </div>
              )}

              {/* ── STEP 2: Insurance Type ── */}
              {step === 2 && (
                <div className="space-y-4">
                  <SectionHeader
                    icon={<Shield className="w-5 h-5 text-indigo-600" />}
                    title="Insurance Type"
                    subtitle="Select the type of insurance the client needs"
                    tag="Saves to Database"
                    tagColor="indigo"
                  />
                  <div className="grid grid-cols-1 gap-3">
                    {policyTypes.map((pt) => (
                      <button
                        key={pt.type}
                        onClick={() => setInsuranceType(pt.type)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all
                          ${insuranceType === pt.type
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 bg-white hover:border-indigo-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg
                            ${insuranceType === pt.type ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {typeEmoji(pt.type)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{pt.type}</p>
                            <p className="text-xs text-gray-500">{pt.subtypes.join(' · ')}</p>
                          </div>
                        </div>
                        {insuranceType === pt.type && (
                          <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── STEP 3: Questionnaire (email only) ── */}
              {step === 3 && (
                <div className="space-y-5">
                  <SectionHeader
                    icon={<Mail className="w-5 h-5 text-amber-600" />}
                    title="Policy Questionnaire"
                    subtitle="These details are sent directly via email and are NOT stored in the CRM database"
                    tag="Email Only — Not Saved"
                    tagColor="amber"
                  />

                  {/* ── EMAIL RECIPIENTS SELECTOR ── */}
                  <div className="rounded-xl border-2 border-indigo-100 bg-indigo-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-indigo-100">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-indigo-700" />
                        <span className="text-sm font-bold text-indigo-800">Send Questionnaire To</span>
                      </div>
                      <span className="text-xs text-indigo-600 bg-indigo-200 px-2 py-0.5 rounded-full font-medium">
                        {selectedRecipients.size} selected
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Send toggle */}
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${sendEmail ? 'bg-indigo-600' : 'bg-gray-300'}`}
                             onClick={() => setSendEmail(!sendEmail)}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendEmail ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                        <span className={`text-sm font-semibold ${sendEmail ? 'text-indigo-800' : 'text-gray-500'}`}>
                          {sendEmail ? 'Email will be sent' : 'Email disabled'}
                        </span>
                      </label>

                      {sendEmail && (
                        <>
                          {/* Producer — always included, cannot be unchecked */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned Producer</p>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border-2 border-indigo-300">
                              <input
                                type="checkbox"
                                checked={true}
                                readOnly
                                disabled
                                className="rounded border-indigo-400 text-indigo-600 w-4 h-4 cursor-not-allowed opacity-70"
                              />
                              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {form.producerName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{form.producerName}</p>
                                <p className="text-xs text-gray-500">{form.producerEmail}</p>
                              </div>
                              <span className="ml-auto text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">Always included</span>
                            </div>
                          </div>

                          {/* Managers */}
                          {availableRecipients.managers?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Managers</p>
                              <div className="space-y-2">
                                {availableRecipients.managers.map((m) => (
                                  <label key={m._id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-indigo-300 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={selectedRecipients.has(m.email)}
                                      onChange={(e) => {
                                        const next = new Set(selectedRecipients);
                                        e.target.checked ? next.add(m.email) : next.delete(m.email);
                                        setSelectedRecipients(next);
                                      }}
                                      className="rounded border-gray-300 text-indigo-600 w-4 h-4"
                                    />
                                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                      {m.firstName[0]}{m.lastName[0]}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-800">{m.firstName} {m.lastName}</p>
                                      <p className="text-xs text-gray-500">{m.email}</p>
                                    </div>
                                    <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Manager</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Admins */}
                          {availableRecipients.admins?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Admins</p>
                              <div className="space-y-2">
                                {availableRecipients.admins.map((a) => (
                                  <label key={a._id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-indigo-300 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={selectedRecipients.has(a.email)}
                                      onChange={(e) => {
                                        const next = new Set(selectedRecipients);
                                        e.target.checked ? next.add(a.email) : next.delete(a.email);
                                        setSelectedRecipients(next);
                                      }}
                                      className="rounded border-gray-300 text-indigo-600 w-4 h-4"
                                    />
                                    <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                      {a.firstName[0]}{a.lastName[0]}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-800">{a.firstName} {a.lastName}</p>
                                      <p className="text-xs text-gray-500">{a.email}</p>
                                    </div>
                                    <span className="ml-auto text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">Admin</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Custom email */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add Custom Email</p>
                            <div className="flex gap-2">
                              <input
                                type="email"
                                value={customEmail}
                                onChange={(e) => { setCustomEmail(e.target.value); setCustomEmailError(''); }}
                                placeholder="other@example.com"
                                className="input flex-1 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); addCustomEmail(); }
                                }}
                              />
                              <button
                                type="button"
                                onClick={addCustomEmail}
                                className="btn-primary btn-sm px-3 shrink-0"
                              >
                                Add
                              </button>
                            </div>
                            {customEmailError && <p className="text-xs text-red-600 mt-1">{customEmailError}</p>}
                          </div>

                          {/* Custom emails added */}
                          {[...selectedRecipients].filter((e) =>
                            e !== form.producerEmail &&
                            !availableRecipients.managers?.find((m) => m.email === e) &&
                            !availableRecipients.admins?.find((a) => a.email === e)
                          ).map((e) => (
                            <div key={e} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-dashed border-gray-300">
                              <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                @
                              </div>
                              <p className="text-sm text-gray-700 flex-1 truncate">{e}</p>
                              <button
                                type="button"
                                onClick={() => { const n = new Set(selectedRecipients); n.delete(e); setSelectedRecipients(n); }}
                                className="text-red-400 hover:text-red-600 text-lg leading-none"
                              >×</button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Subtype selector */}
                  {selectedPolicy?.subtypes?.length > 0 && (
                    <div>
                      <label className="label">Select Policy Subtype</label>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedPolicy.subtypes.map((st) => (
                          <button key={st} onClick={() => setSubType(st)}
                            className={`p-3 rounded-lg border-2 text-sm font-medium text-left transition-all
                              ${subType === st ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-indigo-200 text-gray-700'}`}>
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Questions */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
                    </div>
                  ) : (
                    Object.entries(grouped).map(([sectionName, sectionQs]) => (
                      <div key={sectionName}>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700
                                       bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-3">
                          {sectionName}
                        </h4>
                        <div className="space-y-3">
                          {sectionQs.map((q) => (
                            <QuestionField key={q.key} question={q}
                              value={questionnaire[q.key] || ''}
                              onChange={(v) => setQ(q.key, v)} />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── STEP 4: Review & Submit ── */}
              {step === 4 && (
                <div className="space-y-5">
                  <SectionHeader
                    icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    title="Review & Submit"
                    subtitle="Please confirm the details before submitting"
                  />

                  {/* Section 1 review */}
                  <ReviewCard title="Saved to Database" color="indigo">
                    <ReviewRow label="Producer" value={form.producerName} />
                    <ReviewRow label="Client Name" value={form.clientName} />
                    <ReviewRow label="Phone" value={form.phone || '—'} />
                    <ReviewRow label="Email" value={form.email || '—'} />
                    <ReviewRow label="Address" value={formatAddressString(form.address) || '—'} />
                    <ReviewRow label="Insurance Type" value={`${insuranceType}${subType ? ` — ${subType}` : ''}`} />
                    <ReviewRow label="Lead Source" value={form.leadSource} />
                    {form.notes && <ReviewRow label="Notes" value={form.notes} />}
                  </ReviewCard>

                  {/* Section 2 review */}
                  {Object.keys(questionnaire).filter((k) => questionnaire[k]).length > 0 && (
                    <ReviewCard title={`Email Only — Questionnaire (${sendEmail ? `Will be sent to ${selectedRecipients.size} recipient(s)` : 'Email disabled'})`} color="amber">
                      {/* Show who will receive the email */}
                      {sendEmail && selectedRecipients.size > 0 && (
                        <div className="px-4 py-3 bg-amber-50/50">
                          <p className="text-xs font-semibold text-amber-700 mb-1">Will be emailed to:</p>
                          {[...selectedRecipients].map((e) => (
                            <span key={e} className="inline-flex items-center gap-1 mr-1.5 mb-1 px-2 py-0.5 rounded-full bg-white border border-amber-200 text-xs text-amber-800">
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                      {Object.entries(questionnaire).map(([k, v]) => v ? (
                        <ReviewRow key={k}
                          label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                          value={String(v)} />
                      ) : null)}
                    </ReviewCard>
                  )}

                  <p className="text-xs text-gray-400 text-center">
                    By submitting, you confirm the information is accurate.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between gap-3">
            {step > 0 ? (
              <button onClick={handleBack} className="btn-outline flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-3">
              <button onClick={resetAndClose} className="btn-secondary">Cancel</button>
              {step < STEPS.length - 1 ? (
                <button onClick={handleNext} disabled={!canNext()}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="btn-primary flex items-center gap-2 disabled:opacity-60">
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting…' : 'Submit Lead'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function SectionHeader({ icon, title, subtitle, tag, tagColor }) {
  const tagColors = {
    indigo: 'bg-indigo-100 text-indigo-700',
    amber:  'bg-amber-100 text-amber-700',
    green:  'bg-emerald-100 text-emerald-700',
  };
  return (
    <div className="flex items-start gap-3 pb-2 mb-2 border-b border-gray-100">
      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-gray-900">{title}</h3>
          {tag && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tagColors[tagColor] || tagColors.indigo}`}>
              {tag}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function InputWithIcon({ icon, onChange, ...props }) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>
      <input {...props} className="input pl-9"
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function QuestionField({ question: q, value, onChange }) {
  if (q.type === 'select') {
    return (
      <div>
        <label className="label text-gray-600">{q.label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
          <option value="">— Select —</option>
          {q.options.map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (q.type === 'textarea') {
    return (
      <div>
        <label className="label text-gray-600">{q.label}</label>
        <textarea value={value} onChange={(e) => onChange(e.target.value)}
          className="input resize-none" rows={3} placeholder={q.label} />
      </div>
    );
  }
  return (
    <div>
      <label className="label text-gray-600">{q.label}</label>
      <input type={q.type} value={value} onChange={(e) => onChange(e.target.value)}
        className="input" placeholder={q.label} />
    </div>
  );
}

function ReviewCard({ title, color, children }) {
  const colors = {
    indigo: 'border-indigo-200 bg-indigo-50',
    amber:  'border-amber-200 bg-amber-50',
  };
  const headerColors = {
    indigo: 'bg-indigo-100 text-indigo-800',
    amber:  'bg-amber-100 text-amber-800',
  };
  return (
    <div className={`rounded-xl border overflow-hidden ${colors[color]}`}>
      <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${headerColors[color]}`}>
        {title}
      </div>
      <div className="divide-y divide-gray-100">
        {children}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span className="text-xs text-gray-500 w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-800 break-words flex-1">{value}</span>
    </div>
  );
}

function SuccessView({ onClose, sentTo = [] }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-9 h-9 text-emerald-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900">Lead Submitted!</h3>
      <p className="text-sm text-gray-500 max-w-xs">
        Client details saved to the CRM database.
      </p>
      {sentTo.length > 0 && (
        <div className="w-full max-w-xs bg-indigo-50 rounded-xl border border-indigo-100 p-4 text-left">
          <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-2">
            Questionnaire emailed to:
          </p>
          {sentTo.map((e) => (
            <div key={e} className="flex items-center gap-2 py-1">
              <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                <Mail className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs text-indigo-800 font-medium break-all">{e}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={onClose} className="btn-primary mt-2 px-8">
        Done
      </button>
    </div>
  );
}

function typeEmoji(type) {
  const map = {
    'Auto Insurance': '🚗',
    'Home Insurance': '🏠',
    'Commercial Insurance': '🏢',
    'Life Insurance': '❤️',
    'Travel Insurance': '✈️',
  };
  return map[type] || '📋';
}
