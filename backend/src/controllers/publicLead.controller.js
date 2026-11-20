import { body } from 'express-validator';
import Lead from '../models/Lead.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/errors.js';
import validate from '../middleware/validate.js';
import { ids } from '../utils/idGenerator.js';
import { sendRawEmail } from '../services/emailService.js';

/* ─────────────────────────────────────────────────────────────
   POLICY QUESTIONNAIRE DEFINITIONS
   Section 2 questions are NEVER stored in the database.
   They are rendered per insurance type and emailed directly.
───────────────────────────────────────────────────────────── */
export const POLICY_TYPES = {
  'Auto Insurance': {
    subtypes: ['Personal Auto', 'Commercial Auto'],
    questions: [
      // Driver 1
      { section: 'Driver 1', key: 'effectiveDate', label: 'Effective Date', type: 'date' },
      { section: 'Driver 1', key: 'coverageType', label: 'Coverage Type', type: 'select', options: ['Auto Only', 'Auto & Home'] },
      { section: 'Driver 1', key: 'consentMVR', label: 'Consent to pull Auto Plus / MVR', type: 'select', options: ['Yes', 'No'] },
      { section: 'Driver 1', key: 'dob', label: 'Date of Birth', type: 'date' },
      { section: 'Driver 1', key: 'vin', label: 'VIN Number', type: 'text' },
      { section: 'Driver 1', key: 'registeredOwner', label: 'Registered Owner of the Car', type: 'text' },
      { section: 'Driver 1', key: 'parkingType', label: 'Parking Type', type: 'select', options: ['Garage', 'Driveway', 'Parking Lot', 'Underground'] },
      { section: 'Driver 1', key: 'purchaseDate', label: 'Purchase Date', type: 'date' },
      { section: 'Driver 1', key: 'kmAtPurchase', label: 'KM at Purchase', type: 'number' },
      { section: 'Driver 1', key: 'financed', label: 'Vehicle Financed or Leased?', type: 'select', options: ['Financed', 'Leased', 'Owned'] },
      { section: 'Driver 1', key: 'liability', label: 'Liability', type: 'select', options: ['$1M', '$2M'] },
      { section: 'Driver 1', key: 'deductible', label: 'Deductible', type: 'text' },
      { section: 'Driver 1', key: 'annualKm', label: 'Annual KM', type: 'number' },
      { section: 'Driver 1', key: 'usage', label: 'Usage', type: 'select', options: ['Commute', 'Pleasure'] },
      { section: 'Driver 1', key: 'dailyKm', label: 'Daily KM (if commute)', type: 'number' },
      { section: 'Driver 1', key: 'businessUse', label: 'Business Use / UBER / Delivery?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Driver 1', key: 'winterTire', label: 'Winter Tires?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Driver 1', key: 'licenseNumber', label: 'Driver License Number', type: 'text' },
      { section: 'Driver 1', key: 'g1Date', label: 'G1 Date', type: 'date' },
      { section: 'Driver 1', key: 'g2Date', label: 'G2 Date', type: 'date' },
      { section: 'Driver 1', key: 'gDate', label: 'G Date', type: 'date' },
      { section: 'Driver 1', key: 'outOfProvince', label: 'Out of Province Experience?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Driver 1', key: 'licSuspension', label: 'Suspension of License?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Driver 1', key: 'firstInsuranceDate', label: 'First Insurance Date', type: 'date' },
      { section: 'Driver 1', key: 'currentInsuranceDate', label: 'Current Insurance Date', type: 'date' },
      { section: 'Driver 1', key: 'claims', label: 'Any Claims?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Driver 1', key: 'claimDate', label: 'Date of Claim', type: 'date' },
      { section: 'Driver 1', key: 'atFault', label: 'At Fault?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Driver 1', key: 'tickets', label: 'Tickets / Convictions', type: 'text' },
      { section: 'Driver 1', key: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
      { section: 'Driver 1', key: 'nonPaymentCancel', label: 'Any cancellations for non-payment?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Driver 1', key: 'insuranceGap', label: 'Any gap in insurance?', type: 'select', options: ['Yes', 'No'] },
      // Driver 2
      { section: 'Driver 2', key: 'd2Name', label: 'Driver 2 Name', type: 'text' },
      { section: 'Driver 2', key: 'd2Dob', label: 'Date of Birth', type: 'date' },
      { section: 'Driver 2', key: 'd2ConsentMVR', label: 'Consent to pull Auto Plus / MVR', type: 'select', options: ['Yes', 'No'] },
      { section: 'Driver 2', key: 'd2Vin', label: 'VIN Number (if 2nd car)', type: 'text' },
      { section: 'Driver 2', key: 'd2LicenseNumber', label: 'Driver License Number', type: 'text' },
      { section: 'Driver 2', key: 'd2LicClass', label: 'G1 / G2 / G Date', type: 'text' },
      { section: 'Driver 2', key: 'd2Claims', label: 'Any Claims?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Driver 2', key: 'd2MaritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
    ],
  },

  'Home Insurance': {
    subtypes: ['Homeowner', 'Tenant', 'Condo', 'Residential'],
    questions: [
      { section: 'General', key: 'dob', label: 'Date of Birth', type: 'date' },
      { section: 'General', key: 'smoker', label: 'Smoker?', type: 'select', options: ['Yes', 'No'] },
      { section: 'General', key: 'occupation', label: 'Occupation', type: 'text' },
      { section: 'General', key: 'altPhone', label: 'Alternate Phone', type: 'text' },
      { section: 'General', key: 'insuredLocation', label: 'Insured Location', type: 'text' },
      { section: 'General', key: 'postalCode', label: 'Postal Code', type: 'text' },
      { section: 'General', key: 'at5Years', label: 'Lived at current address less than 5 years?', type: 'select', options: ['Yes', 'No'] },
      { section: 'General', key: 'priorPostalCode', label: 'Prior Postal Code (if applicable)', type: 'text' },
      { section: 'General', key: 'previousInsurer', label: 'Previous Insurance Company', type: 'text' },
      { section: 'General', key: 'cancelledRefused', label: 'Insurance cancelled/refused in last 5 years?', type: 'select', options: ['Yes', 'No'] },
      { section: 'General', key: 'fraudConviction', label: 'Convicted of insurance fraud?', type: 'select', options: ['Yes', 'No'] },
      { section: 'General', key: 'losses5yr', label: 'Any losses in past 5 years?', type: 'select', options: ['Yes', 'No'] },
      { section: 'General', key: 'businessOnPremises', label: 'Business on premises?', type: 'select', options: ['Yes', 'No'] },
      { section: 'General', key: 'oilHeat', label: 'Oil Heat?', type: 'select', options: ['Yes', 'No'] },
      { section: 'General', key: 'policyType', label: 'Policy Type', type: 'select', options: ['Homeowner', 'Residential', 'Tenant', 'Condo'] },
      { section: 'General', key: 'coverage', label: 'Coverage', type: 'select', options: ['Classic', 'Classic Plus', 'Prestige', 'Prestige Plus'] },
      { section: 'General', key: 'renewalDate', label: 'Renewal / Closing Date', type: 'date' },
      { section: 'Building Details', key: 'yearBuilt', label: 'Year Built', type: 'number' },
      { section: 'Building Details', key: 'totalArea', label: 'Total Living Area (sq ft)', type: 'number' },
      { section: 'Building Details', key: 'style', label: 'Style', type: 'select', options: ['1 Story', 'Bi-level', '2 Story'] },
      { section: 'Building Details', key: 'detachedType', label: 'Detached / Semi / Town / Apartment', type: 'text' },
      { section: 'Building Details', key: 'basementFinished', label: 'Basement Finished (%)', type: 'number' },
      { section: 'Building Details', key: 'homeMaterial', label: 'Home Material', type: 'select', options: ['Brick', 'Vinyl', 'Wood'] },
      { section: 'Building Details', key: 'garage', label: 'Garage', type: 'select', options: ['None', '1 Car Built-in', '1 Car Attached', '1 Car Detached', '2 Car Built-in', '2 Car Attached', '2 Car Detached'] },
      { section: 'Building Details', key: 'electrical', label: 'Electrical (amps)', type: 'select', options: ['100 amp breaker', '200 amp breaker', '100 amp fuses', '200 amp fuses'] },
      { section: 'Building Details', key: 'bathrooms', label: '# of Bathrooms', type: 'number' },
      { section: 'Building Details', key: 'fireplaces', label: '# of Fireplaces', type: 'text' },
      { section: 'Building Details', key: 'roofUpdate', label: 'Roof Update Year', type: 'number' },
      { section: 'Building Details', key: 'electricalUpdate', label: 'Electrical Update Year', type: 'number' },
      { section: 'Building Details', key: 'plumbingUpdate', label: 'Plumbing Update Year', type: 'number' },
      { section: 'Building Details', key: 'heatingUpdate', label: 'Heating Update Year', type: 'number' },
      { section: 'Building Details', key: 'alarmSystem', label: 'Alarm System', type: 'text' },
      { section: 'Building Details', key: 'sumpPump', label: 'Sump Pump?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Building Details', key: 'mortgage', label: 'Mortgage on Home?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Building Details', key: 'mortgageHolder', label: 'Who holds mortgage?', type: 'text' },
    ],
  },

  'Commercial Insurance': {
    subtypes: ['General Liability', 'Property', 'Restaurant / Cafe', 'Snow Removal', 'Commercial General'],
    questions: [
      { section: 'General', key: 'businessName', label: 'Business / Applicant Name', type: 'text' },
      { section: 'General', key: 'mailingAddress', label: 'Mailing Address', type: 'text' },
      { section: 'General', key: 'effectiveDate', label: 'Effective Date', type: 'date' },
      { section: 'General', key: 'expiryDate', label: 'Expiry Date', type: 'date' },
      { section: 'General', key: 'inBusinessSince', label: 'In Business Since', type: 'date' },
      { section: 'General', key: 'annualRevenue', label: 'Annual Gross Revenue ($)', type: 'number' },
      { section: 'General', key: 'subContracted', label: 'Sub-contracted (%)', type: 'number' },
      { section: 'General', key: 'canadianPct', label: 'Canadian (%)', type: 'number' },
      { section: 'General', key: 'usPct', label: 'US (%)', type: 'number' },
      { section: 'General', key: 'foreignPct', label: 'Foreign (%)', type: 'number' },
      { section: 'General', key: 'internetPct', label: 'Internet (%)', type: 'number' },
      { section: 'General', key: 'cancelledBefore', label: 'Insurer cancelled/declined in past 5 years?', type: 'select', options: ['Yes', 'No'] },
      { section: 'General', key: 'losses5yr', label: 'Losses in last 5 years?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Operations', key: 'descriptionOfOps', label: 'Description of Operations', type: 'textarea' },
      { section: 'Operations', key: 'yearsInBusiness', label: 'Years in Business at this location', type: 'number' },
      { section: 'Operations', key: 'numEmployees', label: 'Number of Employees', type: 'number' },
      { section: 'Operations', key: 'hoursOfOps', label: 'Hours of Operations', type: 'text' },
      { section: 'Building', key: 'riskAddress', label: 'Risk / Location Address', type: 'text' },
      { section: 'Building', key: 'yearBuilt', label: 'Year Built', type: 'number' },
      { section: 'Building', key: 'totalArea', label: 'Total Area (sq ft)', type: 'number' },
      { section: 'Building', key: 'constructionWalls', label: 'Construction — Walls', type: 'text' },
      { section: 'Building', key: 'constructionRoof', label: 'Construction — Roof', type: 'text' },
      { section: 'Building', key: 'electricalSystem', label: 'Electrical System', type: 'text' },
      { section: 'Building', key: 'heating', label: 'Heating', type: 'text' },
      { section: 'Building', key: 'sprinkler', label: 'Sprinkler System?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Building', key: 'burglarAlarm', label: 'Burglar Alarm', type: 'select', options: ['Monitored', 'Local', 'None'] },
      { section: 'Coverage', key: 'liability', label: 'Commercial General Liability Limit', type: 'select', options: ['$1,000,000', '$2,000,000', '$3,000,000', '$5,000,000'] },
      { section: 'Coverage', key: 'propertyBuilding', label: 'Property — Building ($)', type: 'number' },
      { section: 'Coverage', key: 'propertyEquipment', label: 'Property — Equipment ($)', type: 'number' },
      { section: 'Coverage', key: 'propertyStock', label: 'Property — Stock ($)', type: 'number' },
    ],
  },

  'Life Insurance': {
    subtypes: ['Term Life', 'Whole Life', 'Universal Life', 'Critical Illness', 'Disability'],
    questions: [
      { section: 'Personal', key: 'dob', label: 'Date of Birth', type: 'date' },
      { section: 'Personal', key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
      { section: 'Personal', key: 'smoker', label: 'Smoker?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Personal', key: 'occupation', label: 'Occupation', type: 'text' },
      { section: 'Personal', key: 'healthConditions', label: 'Any pre-existing health conditions?', type: 'textarea' },
      { section: 'Coverage', key: 'coverageAmount', label: 'Coverage Amount Required ($)', type: 'number' },
      { section: 'Coverage', key: 'coverageTerm', label: 'Coverage Term (years)', type: 'number' },
      { section: 'Coverage', key: 'beneficiary', label: 'Beneficiary Name', type: 'text' },
    ],
  },

  'Travel Insurance': {
    subtypes: ['Single Trip', 'Multi-Trip Annual', 'Visitor to Canada', 'Super Visa'],
    questions: [
      { section: 'Travel', key: 'dob', label: 'Date of Birth', type: 'date' },
      { section: 'Travel', key: 'destination', label: 'Destination Country / Region', type: 'text' },
      { section: 'Travel', key: 'departureDate', label: 'Departure Date', type: 'date' },
      { section: 'Travel', key: 'returnDate', label: 'Return Date', type: 'date' },
      { section: 'Travel', key: 'tripCost', label: 'Total Trip Cost ($)', type: 'number' },
      { section: 'Travel', key: 'preExisting', label: 'Pre-existing medical conditions?', type: 'select', options: ['Yes', 'No'] },
      { section: 'Travel', key: 'travelPurpose', label: 'Purpose of Travel', type: 'select', options: ['Leisure', 'Business', 'Education', 'Medical', 'Visit Family'] },
    ],
  },
};

// GET /api/v1/public/lead/email-recipients
// Returns all users (managers + admins) who can receive the questionnaire email
export const getEmailRecipients = asyncHandler(async (req, res) => {
  const [managers, admins] = await Promise.all([
    User.find({ role: 'manager', isActive: true }).select('firstName lastName email role'),
    User.find({ role: 'admin',   isActive: true }).select('firstName lastName email role'),
  ]);
  res.json({ managers, admins });
});

// GET /api/v1/public/lead/policy-types
export const getPolicyTypes = asyncHandler(async (req, res) => {
  const summary = Object.entries(POLICY_TYPES).map(([type, cfg]) => ({
    type,
    subtypes: cfg.subtypes,
    questionCount: cfg.questions.length,
  }));
  res.json({ policyTypes: summary });
});

// GET /api/v1/public/lead/questions?policyType=Auto+Insurance
export const getQuestions = asyncHandler(async (req, res) => {
  const { policyType } = req.query;
  const cfg = POLICY_TYPES[policyType];
  if (!cfg) throw badRequest(`Unknown policy type: ${policyType}`);
  res.json({
    policyType,
    subtypes: cfg.subtypes,
    questions: cfg.questions,
  });
});

// GET /api/v1/public/lead/producers — list active producers for dropdown
export const getProducers = asyncHandler(async (req, res) => {
  const producers = await User.find({ role: 'producer', isActive: true })
    .select('firstName lastName email')
    .lean();
  res.json({ producers });
});

// POST /api/v1/public/lead/submit
// Section 1: saved to DB as a new Lead
// Section 2: emailed directly to selected recipients — NEVER stored
export const submitPublicLead = asyncHandler(async (req, res) => {
  const {
    // Section 1 — DB fields
    producerId,
    clientName,
    email,
    phone,
    address,
    insuranceType,
    subType,
    leadSource,
    notes,
    // Section 2 — email-only questionnaire
    questionnaire,            // object { key: value }
    sendQuestionnaireEmail,   // boolean
    additionalRecipients,     // array of email strings chosen by user
  } = req.body;

  if (!clientName) throw badRequest('Client name is required');
  if (!producerId) throw badRequest('Please select a producer');
  if (!insuranceType) throw badRequest('Insurance type is required');

  // Verify producer exists
  const producer = await User.findById(producerId).select('firstName lastName email');
  if (!producer) throw badRequest('Selected producer not found');

  // ── Section 1: Save lead to DB ──────────────────────────────
  const lead = await Lead.create({
    leadId: ids.lead(),
    clientName: clientName.trim(),
    email: email?.trim() || '',
    phone: phone?.trim() || '',
    insuranceType,
    leadSource: leadSource || 'Website',
    expectedPremium: 0,
    currency: 'CAD',
    priority: 'Medium',
    leadStatus: 'New',
    assignedProducer: producerId,
    createdBy: producerId,
    ownerProducerId: producerId,
    notes: notes || '',
    activities: [{
      type: 'created',
      note: `Public lead submitted — ${insuranceType}${subType ? ` / ${subType}` : ''}`,
      createdBy: producerId,
      createdAt: new Date(),
    }],
  });

  // ── Section 2: Send questionnaire email (NOT stored) ────────
  let emailSent = false;
  let emailError = null;
  let emailsSentTo = [];

  if (sendQuestionnaireEmail && questionnaire && Object.keys(questionnaire).length > 0) {
    // Build recipient list:
    // 1. Producer is always included if they have an email
    // 2. Any additional recipients selected by the user
    const toAddresses = new Set();
    if (producer.email) toAddresses.add(producer.email);
    if (Array.isArray(additionalRecipients)) {
      additionalRecipients.forEach((e) => {
        if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) toAddresses.add(e);
      });
    }
    const toList = [...toAddresses];

    if (toList.length > 0) {
      try {
        const rows = Object.entries(questionnaire)
          .map(([key, value]) => {
            if (!value) return null;
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
            return `<tr>
              <td style="padding:6px 14px;font-weight:600;color:#374151;background:#F9FAFB;border-bottom:1px solid #E5E7EB;width:40%;">${escHtml(label)}</td>
              <td style="padding:6px 14px;color:#111827;border-bottom:1px solid #E5E7EB;">${escHtml(String(value))}</td>
            </tr>`;
          })
          .filter(Boolean)
          .join('');

        const html = `
<div style="font-family:Inter,Arial,sans-serif;background:#F4F5FB;padding:28px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:linear-gradient(135deg,#2E2A7E,#1E1B4B);padding:22px 28px;">
      <p style="margin:0 0 2px;color:#A5B4FC;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;">Oracle RMS London North</p>
      <h2 style="margin:0;color:#fff;font-size:18px;">New Lead — Questionnaire Details</h2>
      <p style="margin:4px 0 0;color:#C7D2FE;font-size:13px;">
        These details are for quotation purposes only and are <strong>not stored</strong> in the CRM.
      </p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
        <tr style="background:#EEF2FF;"><td style="padding:8px 14px;font-weight:700;color:#374151;width:40%;border-bottom:1px solid #E5E7EB;">Client Name</td><td style="padding:8px 14px;border-bottom:1px solid #E5E7EB;font-weight:600;">${escHtml(clientName)}</td></tr>
        <tr style="background:#F9FAFB;"><td style="padding:8px 14px;font-weight:700;color:#374151;border-bottom:1px solid #E5E7EB;">Phone</td><td style="padding:8px 14px;border-bottom:1px solid #E5E7EB;">${escHtml(phone || '—')}</td></tr>
        <tr style="background:#EEF2FF;"><td style="padding:8px 14px;font-weight:700;color:#374151;border-bottom:1px solid #E5E7EB;">Email</td><td style="padding:8px 14px;border-bottom:1px solid #E5E7EB;">${escHtml(email || '—')}</td></tr>
        <tr style="background:#F9FAFB;"><td style="padding:8px 14px;font-weight:700;color:#374151;border-bottom:1px solid #E5E7EB;">Insurance Type</td><td style="padding:8px 14px;border-bottom:1px solid #E5E7EB;">${escHtml(insuranceType)}${subType ? ` — ${escHtml(subType)}` : ''}</td></tr>
        <tr style="background:#EEF2FF;"><td style="padding:8px 14px;font-weight:700;color:#374151;">Assigned Producer</td><td style="padding:8px 14px;">${escHtml(producer.firstName)} ${escHtml(producer.lastName)}</td></tr>
      </table>
      <h3 style="margin:0 0 10px;font-size:15px;color:#1E1B4B;font-weight:700;">Questionnaire Responses</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
        ${rows || '<tr><td colspan="2" style="padding:12px;color:#9CA3AF;text-align:center;">No questionnaire data provided.</td></tr>'}
      </table>
    </div>
    <div style="padding:14px 28px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-size:11px;color:#9CA3AF;">
      Lead ID: <strong>${lead.leadId}</strong> &nbsp;·&nbsp;
      Submitted: ${new Date().toLocaleString('en-CA')} &nbsp;·&nbsp;
      Sent to: ${toList.map((e) => escHtml(e)).join(', ')}
    </div>
  </div>
</div>`;

        await sendRawEmail({
          to: toList,
          subject: `New Lead Questionnaire — ${clientName} (${insuranceType})`,
          html,
        });

        emailSent = true;
        emailsSentTo = toList;
      } catch (err) {
        emailError = err.message;
        console.warn('[publicLead] Email failed:', err.message);
      }
    }
  }

  res.status(201).json({
    message: 'Lead submitted successfully.',
    leadId: lead.leadId,
    emailSent,
    emailsSentTo,
    emailError,
  });
});

function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
