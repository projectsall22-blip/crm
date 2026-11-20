import User from '../models/User.js';
import { htmlToText } from './emailService.js';

/**
 * Master list of all lead fields that *can* be included in an email.
 * Sensitive information and documents are never auto-included — they must
 * be explicitly selected (and authorized).
 */
export const AVAILABLE_LEAD_FIELDS = [
  'clientName',
  'clientEmail',
  'phone',
  'insuranceType',
  'leadSource',
  'expectedPremium',
  'currency',
  'producerName',
  'leadStatus',
  'notes',
  'nextFollowUpDate',
  'documents',
];

/**
 * Maps a lead (with populated producer) into a flat object of all available fields.
 */
export async function buildLeadFieldMap(lead) {
  const producer = lead.assignedProducer || lead.ownerProducerId;
  let producerName = '';
  if (producer) {
    const u = await User.findById(producer).select('firstName lastName email');
    if (u) producerName = `${u.firstName} ${u.lastName}`;
  }
  return {
    clientName: lead.clientName || '',
    clientEmail: lead.email || '',
    phone: lead.phone || '',
    insuranceType: lead.insuranceType || '',
    leadSource: lead.leadSource || '',
    expectedPremium: lead.expectedPremium != null ? String(lead.expectedPremium) : '',
    currency: lead.currency || '',
    producerName,
    leadStatus: lead.leadStatus || '',
    notes: lead.notes || '',
    nextFollowUpDate: lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toDateString() : '',
    documents: '', // documents are handled separately and require explicit authorization
  };
}

/**
 * Extracts ONLY the selected fields from the field map.
 * Unselected fields are never included — this is the selective routing guarantee.
 *
 * @param {object} fieldMap - full field map from buildLeadFieldMap
 * @param {string[]} selectedFields - field keys to include
 * @returns {object} filtered map containing only selected fields
 */
export function selectFields(fieldMap, selectedFields = []) {
  const selected = (selectedFields || []).filter((f) => AVAILABLE_LEAD_FIELDS.includes(f));
  const result = {};
  for (const key of selected) {
    // Only include fields that the sender explicitly selected.
    // Unselected fields are never placed in the email payload.
    result[key] = fieldMap[key] != null ? String(fieldMap[key]) : '';
  }
  return result;
}

/**
 * Renders an HTML email template with selected fields only.
 * Replaces {{fieldName}} placeholders with the value (empty string if not selected).
 *
 * @param {string} templateHtml - template body with {{placeholders}}
 * @param {string} subjectTemplate - subject with {{placeholders}}
 * @param {object} selectedFieldMap - the filtered (selected only) field map
 * @param {object} extraVars - additional non-lead vars (e.g. companyName)
 * @returns {{subject:string, html:string, text:string}}
 */
export function renderTemplate(templateHtml, subjectTemplate, selectedFieldMap, extraVars = {}) {
  const allVars = { ...selectedFieldMap, ...extraVars };

  const replace = (str) =>
    str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in allVars) return String(allVars[key] ?? '');
      return match; // leave unknown placeholders untouched
    });

  const html = replace(templateHtml);
  const subject = replace(subjectTemplate);
  const text = htmlToText(html);
  return { subject, html, text };
}

/**
 * Builds a simple default HTML body from selected fields when no template is provided.
 * Only selected fields appear; unselected fields are completely absent.
 */
export function buildDefaultBody(selectedFieldMap, extraLabelMap = {}) {
  const labels = {
    clientName: 'Client Name',
    clientEmail: 'Client Email',
    phone: 'Phone Number',
    insuranceType: 'Insurance Type',
    leadSource: 'Lead Source',
    expectedPremium: 'Expected Premium',
    currency: 'Currency',
    producerName: 'Producer',
    leadStatus: 'Lead Status',
    notes: 'Additional Notes',
    nextFollowUpDate: 'Follow-up Date',
    documents: 'Selected Documents',
    ...extraLabelMap,
  };

  const rows = Object.entries(selectedFieldMap)
    .filter(([, v]) => v !== '' && v != null)
    .map(([key, value]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#1e293b;">${labels[key] || key}</td><td style="padding:6px 12px;color:#334155;">${escapeHtml(String(value))}</td></tr>`)
    .join('');

  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#1e3a5f;padding:20px 24px;">
      <h2 style="margin:0;color:#fff;font-size:18px;">Oracle RMS London North — Notification</h2>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;color:#334155;">A lead update has been recorded in the CRM. The following details have been shared as authorized:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows || '<tr><td style="padding:6px 12px;color:#94a3b8;">No fields selected.</td></tr>'}</table>
      <p style="margin:16px 0 0;color:#64748b;font-size:12px;border-top:1px solid #e2e8f0;padding-top:12px;">Please review the full lead details in the CRM. Sensitive information has been omitted per configuration.</p>
    </div>
  </div>
</div>`;
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeHtmlExport(str) {
  return escapeHtml(str);
}
