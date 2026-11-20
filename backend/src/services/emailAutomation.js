import EmailRule from '../models/EmailRule.js';
import EmailTemplate from '../models/EmailTemplate.js';
import EmailRecipient from '../models/EmailRecipient.js';
import EmailLog from '../models/EmailLog.js';
import User from '../models/User.js';
import { ids } from '../utils/idGenerator.js';
import { makeDeduplicationKey } from './emailService.js';
import { buildLeadFieldMap, selectFields, renderTemplate, buildDefaultBody } from './emailRouter.js';

/**
 * Maps a lead lifecycle event to the rule trigger key.
 */
const EVENT_TO_TRIGGER = {
  producer_creates_lead: 'producer_creates_lead',
  admin_creates_lead: 'admin_creates_lead',
  lead_won: 'lead_won',
  lead_lost: 'lead_lost',
  lead_assigned: 'lead_assigned',
  lead_updated: 'lead_updated',
};

/**
 * Resolves the actual email addresses for a rule's recipient configuration.
 * Returns a deduplicated array of addresses.
 */
export async function resolveRecipients(ruleRecipients, lead) {
  const addresses = new Set();

  // Manager / Admin → resolve all active users with those roles
  if (ruleRecipients.manager) {
    const managers = await User.find({ role: 'manager', isActive: true }).select('email');
    managers.forEach((m) => m.email && addresses.add(m.email));
  }
  if (ruleRecipients.admin) {
    const admins = await User.find({ role: 'admin', isActive: true }).select('email');
    admins.forEach((a) => a.email && addresses.add(a.email));
  }
  // Assigned producer
  if (ruleRecipients.producer && lead?.assignedProducer) {
    const prod = await User.findById(lead.assignedProducer).select('email');
    if (prod?.email) addresses.add(prod.email);
  }
  // Preconfigured recipients
  if (ruleRecipients.preconfiguredIds?.length) {
    const pre = await EmailRecipient.find({
      _id: { $in: ruleRecipients.preconfiguredIds },
      isActive: true,
    }).select('email');
    pre.forEach((p) => p.email && addresses.add(p.email));
  }
  // Custom emails
  if (ruleRecipients.customEmails?.length) {
    ruleRecipients.customEmails.forEach((e) => {
      if (isValidEmail(e)) addresses.add(e);
    });
  }

  return [...addresses];
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Evaluates all active rules for a given trigger event and enqueues emails.
 * This is called after a lead is created/updated/won/lost/assigned.
 *
 * @param {string} triggerEvent - one of EVENT_TO_TRIGGER keys
 * @param {object} lead - the lead document (lean or mongoose)
 * @param {object} initiatedBy - the user who triggered the event
 * @returns {Promise<number>} count of emails enqueued
 */
export async function processAutomationRules(triggerEvent, lead, initiatedBy) {
  const trigger = EVENT_TO_TRIGGER[triggerEvent];
  if (!trigger) return 0;

  const rules = await EmailRule.find({ trigger, isActive: true });
  if (rules.length === 0) return 0;

  const fieldMap = await buildLeadFieldMap(lead);
  let enqueued = 0;

  for (const rule of rules) {
    const recipients = await resolveRecipients(rule.recipients, lead);
    if (recipients.length === 0) continue;

    // Determine selected fields: rule may specify its own; otherwise use template's allowedFields
    let selectedFields = rule.selectedFields?.length ? rule.selectedFields : [];

    // Load template
    let template = null;
    if (rule.templateId) {
      template = await EmailTemplate.findById(rule.templateId);
    }
    if (!template) {
      // Fall back to default matching by triggerType
      const triggerMap = {
        producer_creates_lead: 'lead_created',
        admin_creates_lead: 'lead_created',
        lead_won: 'lead_won',
        lead_lost: 'lead_lost',
        lead_assigned: 'lead_assigned',
        lead_updated: 'lead_updated',
      };
      template = await EmailTemplate.findOne({
        triggerType: triggerMap[triggerEvent],
        isActive: true,
      });
    }

    if (template && template.allowedFields?.length && selectedFields.length === 0) {
      selectedFields = template.allowedFields;
    }
    // Default: include a safe minimal set if nothing configured
    if (selectedFields.length === 0) {
      selectedFields = ['clientName', 'insuranceType', 'leadSource', 'producerName'];
    }

    const selectedMap = selectFields(fieldMap, selectedFields);

    let subject, html;
    if (template) {
      const rendered = renderTemplate(template.bodyHtml, template.subject, selectedMap, {
        clientName: selectedMap.clientName || lead.clientName,
        insuranceType: selectedMap.insuranceType || lead.insuranceType,
        expectedPremium: selectedMap.expectedPremium || '',
        producerName: selectedMap.producerName || '',
        leadSource: selectedMap.leadSource || '',
      });
      subject = rendered.subject;
      html = rendered.html;
    } else {
      subject = `Oracle RMS London North — ${lead.clientName}`;
      html = buildDefaultBody(selectedMap);
    }

    // Deduplication: skip if an email with the same key was already sent/sending
    const deduplicationKey = makeDeduplicationKey({
      triggerType: 'rule',
      leadId: lead._id?.toString(),
      recipients,
      templateId: template?._id?.toString(),
    });

    const existing = await EmailLog.findOne({ deduplicationKey, status: { $in: ['Pending', 'Sent', 'Retrying'] } });
    if (existing) {
      // Prevent duplicate email sending on repeated requests
      continue;
    }

    await EmailLog.create({
      logId: ids.emailLog(),
      leadId: lead._id,
      sender: 'automation',
      recipients,
      cc: rule.ccEmails || [],
      bcc: rule.bccEmails || [],
      subject,
      selectedFields,
      bodyHtml: html,
      status: 'Pending',
      triggerType: 'rule',
      deduplicationKey,
      ruleId: rule._id,
      templateId: template?._id,
      initiatedBy: initiatedBy?._id,
    });

    enqueued += 1;

    // Mark rule as last triggered
    rule.lastTriggeredAt = new Date();
    await rule.save();
  }

  return enqueued;
}

export default processAutomationRules;
