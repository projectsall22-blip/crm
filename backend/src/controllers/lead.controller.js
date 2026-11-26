import { body, param } from 'express-validator';
import Lead from '../models/Lead.js';
import { LEAD_STATUSES, LEAD_PRIORITIES } from '../models/Lead.js';
import Client from '../models/Client.js';
import Policy from '../models/Policy.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFoundErr, forbidden } from '../utils/errors.js';
import validate from '../middleware/validate.js';
import { paginateResults } from '../utils/pagination.js';
import { ids } from '../utils/idGenerator.js';
import logActivity from '../utils/activityLogger.js';
import { processAutomationRules } from '../services/emailAutomation.js';
import {
  buildLeadFieldMap,
  selectFields,
  renderTemplate,
  buildDefaultBody,
} from '../services/emailRouter.js';
import EmailLog from '../models/EmailLog.js';
import EmailTemplate from '../models/EmailTemplate.js';
import EmailRecipient from '../models/EmailRecipient.js';
import User from '../models/User.js';
import { sendRawEmail, makeDeduplicationKey } from '../services/emailService.js';

export const createLeadValidation = [
  body('clientName').trim().notEmpty().withMessage('Client name is required'),
  body('clientId').optional().isMongoId(),
  body('insuranceType').optional().isString(),
  body('leadSource').optional().isString(),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('phone').optional({ nullable: true }).isString(),
  body('expectedPremium').optional().isNumeric(),
  body('currency').optional().isString(),
  body('priority').optional().isIn(LEAD_PRIORITIES),
  body('leadStatus').optional().isIn(LEAD_STATUSES),
  body('assignedProducer').optional().isMongoId(),
  body('nextFollowUpDate').optional().isISO8601(),
  body('notes').optional().isString(),
];

export const updateLeadValidation = [
  param('id').isMongoId().withMessage('Invalid lead ID'),
  body('clientName').optional().trim().notEmpty(),
  body('insuranceType').optional().isString(),
  body('leadSource').optional().isString(),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('expectedPremium').optional({ checkFalsy: true }).isNumeric(),
  body('currency').optional().isString(),
  body('priority').optional().isIn(LEAD_PRIORITIES),
  body('leadStatus').optional().isIn(LEAD_STATUSES),
  body('assignedProducer').optional({ checkFalsy: true }).isMongoId(),
  body('nextFollowUpDate').optional({ checkFalsy: true }).isISO8601(),
  body('notes').optional().isString(),
];

/**
 * Lead scope filter — producers see only their own leads.
 */
function leadScopeFilter(req) {
  if (req.user.role === 'admin' || req.user.role === 'manager') return {};
  return { $or: [{ ownerProducerId: req.user._id }, { assignedProducer: req.user._id }] };
}

function assertLeadOwnership(req, lead) {
  if (!lead) throw notFoundErr('Lead not found');
  if (req.user.role === 'admin' || req.user.role === 'manager') return lead;
  const ownerId = lead.ownerProducerId || lead.assignedProducer;
  if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
    throw forbidden('You do not have access to this lead.');
  }
  return lead;
}

// GET /leads — paginated list with search & filters
export const listLeads = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;

  const filter = { ...leadScopeFilter(req) };

  if (req.query.search) {
    const term = req.query.search.trim();
    filter.$and = [
      ...(filter.$or ? [{ $or: filter.$or }] : []),
      {
        $or: [
          { clientName: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
          { insuranceType: { $regex: term, $options: 'i' } },
        ],
      },
    ];
    delete filter.$or;
  }

  if (req.query.leadStatus) filter.leadStatus = req.query.leadStatus;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.assignedProducer) filter.assignedProducer = req.query.assignedProducer;
  if (req.query.insuranceType) filter.insuranceType = req.query.insuranceType;

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate('assignedProducer', 'firstName lastName email')
      .populate('ownerProducerId', 'firstName lastName')
      .populate('clientId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Lead.countDocuments(filter),
  ]);

  res.json(paginateResults(leads, total, page, limit));
});

// GET /leads/kanban — pipeline grouped by status
export const getKanban = asyncHandler(async (req, res) => {
  const baseFilter = leadScopeFilter(req);
  const pipeline = [];
  for (const status of LEAD_STATUSES) {
    const leads = await Lead.find({ ...baseFilter, leadStatus: status })
      .populate('assignedProducer', 'firstName lastName')
      .populate('clientId', 'firstName lastName')
      .sort({ priority: -1, createdAt: -1 })
      .limit(200);
    pipeline.push({ status, leads, count: leads.length });
  }
  res.json({ pipeline });
});

// GET /leads/:id — full lead profile with activities & email logs
export const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate('assignedProducer', 'firstName lastName email')
    .populate('ownerProducerId', 'firstName lastName')
    .populate('clientId', 'firstName lastName email phone address country')
    .populate('activities.createdBy', 'firstName lastName');

  assertLeadOwnership(req, lead);

  const emailLogs = await EmailLog.find({ leadId: lead._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ lead, emailLogs });
});

// POST /leads — create lead (with optional selective email send)
export const createLead = asyncHandler(async (req, res) => {
  const {
    clientId,
    clientName,
    email,
    phone,
    insuranceType,
    leadSource,
    expectedPremium,
    currency,
    priority,
    leadStatus,
    assignedProducer,
    nextFollowUpDate,
    notes,
    // Email notification section (optional)
    emailNotification,
  } = req.body;

  // Resolve owner producer
  let ownerProducerId = assignedProducer || null;
  if (req.user.role === 'producer') {
    ownerProducerId = req.user._id; // producer-created leads belong to that producer
  }

  // If clientId provided, fetch client name if not supplied
  let resolvedClientName = clientName;
  let resolvedEmail = email;
  let resolvedPhone = phone;
  if (clientId) {
    const client = await Client.findById(clientId);
    if (client) {
      resolvedClientName = resolvedClientName || `${client.firstName} ${client.lastName}`;
      resolvedEmail = resolvedEmail || client.email;
      resolvedPhone = resolvedPhone || client.phone;
    }
  }

  const lead = await Lead.create({
    leadId: ids.lead(),
    clientId: clientId || null,
    clientName: resolvedClientName,
    email: resolvedEmail || '',
    phone: resolvedPhone || '',
    insuranceType: insuranceType || '',
    leadSource: leadSource || '',
    expectedPremium: expectedPremium || 0,
    currency: currency || 'USD',
    priority: priority || 'Medium',
    leadStatus: leadStatus || 'New',
    nextFollowUpDate: nextFollowUpDate || null,
    assignedProducer: ownerProducerId,
    createdBy: req.user._id,
    ownerProducerId,
    notes: notes || '',
    activities: [
      {
        type: 'created',
        note: 'Lead created',
        createdBy: req.user._id,
        createdAt: new Date(),
      },
    ],
  });

  await logActivity({
    type: 'create',
    description: `Lead for ${lead.clientName} created`,
    entityType: 'lead',
    entityId: lead._id,
    clientId: lead.clientId,
    leadId: lead._id,
    performedBy: req.user._id,
    metadata: { insuranceType: lead.insuranceType, leadStatus: lead.leadStatus },
  });

  // --- Trigger automatic email rules ---
  const triggerEvent = req.user.role === 'producer' ? 'producer_creates_lead' : 'admin_creates_lead';
  processAutomationRules(triggerEvent, lead, req.user).catch((err) =>
    console.warn('[lead] Automation rule error:', err.message)
  );

  // --- Manual selective email send (if requested) ---
  let emailResult = null;
  if (emailNotification && emailNotification.sendNow) {
    // hasRecipients = checkbox-selected recipients OR a valid custom email was provided
    const hasSelectedRecipients = Array.isArray(emailNotification.recipients) && emailNotification.recipients.length > 0;
    const hasCustomEmail = typeof emailNotification.customEmail === 'string'
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNotification.customEmail.trim());
    if (hasSelectedRecipients || hasCustomEmail) {
      emailResult = await sendSelectiveLeadEmail(lead, emailNotification, req.user);
    }
  }

  res.status(201).json({
    lead,
    emailNotification: emailResult,
    message: 'Lead created successfully',
  });
});

// PUT /leads/:id
export const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  assertLeadOwnership(req, lead);

  const oldProducer = lead.assignedProducer?.toString();
  const oldStatus = lead.leadStatus;

  const updatable = [
    'clientName', 'email', 'phone', 'insuranceType', 'leadSource',
    'expectedPremium', 'currency', 'priority', 'leadStatus',
    'nextFollowUpDate', 'notes',
  ];
  for (const f of updatable) {
    if (req.body[f] !== undefined) lead[f] = req.body[f];
  }

  // Assignment — admin can reassign
  if (req.body.assignedProducer !== undefined && req.user.role === 'admin') {
    lead.assignedProducer = req.body.assignedProducer;
    lead.ownerProducerId = req.body.assignedProducer;
  }

  lead.activities.push({
    type: 'updated',
    note: 'Lead updated',
    createdBy: req.user._id,
    createdAt: new Date(),
  });

  await lead.save();

  // Detect assignment change → trigger rule
  const newProducer = lead.assignedProducer?.toString();
  if (newProducer && oldProducer && newProducer !== oldProducer) {
    logActivity({
      type: 'assignment',
      description: `Lead reassigned to another producer`,
      entityType: 'lead',
      entityId: lead._id,
      leadId: lead._id,
      performedBy: req.user._id,
      metadata: { from: oldProducer, to: newProducer },
    });
    processAutomationRules('lead_assigned', lead, req.user).catch((err) =>
      console.warn('[lead] Assignment rule error:', err.message)
    );
  }

  // Detect status change → log
  if (oldStatus !== lead.leadStatus) {
    logActivity({
      type: 'status_change',
      description: `Lead status changed from ${oldStatus} to ${lead.leadStatus}`,
      entityType: 'lead',
      entityId: lead._id,
      leadId: lead._id,
      performedBy: req.user._id,
      metadata: { from: oldStatus, to: lead.leadStatus },
    });
  }

  res.json({ lead, message: 'Lead updated successfully' });
});

// PATCH /leads/:id/status — change status only
export const updateStatus = asyncHandler(async (req, res) => {
  const { leadStatus } = req.body;
  if (!LEAD_STATUSES.includes(leadStatus)) throw badRequest('Invalid lead status');

  const lead = await Lead.findById(req.params.id);
  assertLeadOwnership(req, lead);

  const oldStatus = lead.leadStatus;
  lead.leadStatus = leadStatus;
  lead.activities.push({
    type: 'status_change',
    note: `Status changed from ${oldStatus} to ${leadStatus}`,
    createdBy: req.user._id,
    createdAt: new Date(),
  });
  await lead.save();

  logActivity({
    type: 'status_change',
    description: `Lead status: ${oldStatus} → ${leadStatus}`,
    entityType: 'lead',
    entityId: lead._id,
    leadId: lead._id,
    performedBy: req.user._id,
    metadata: { from: oldStatus, to: leadStatus },
  });

  res.json({ lead, message: 'Status updated' });
});

// POST /leads/:id/won — mark lead as Won (opens policy registration)
// POST /leads/:id/won — mark lead as Won + auto-create client if not already linked
export const markWon = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  assertLeadOwnership(req, lead);

  if (lead.leadStatus === 'Won') {
    // Idempotent — don't create duplicate or re-trigger
    return res.json({
      lead,
      alreadyWon: true,
      message: 'Lead is already marked Won. No duplicate action performed.',
    });
  }

  lead.leadStatus = 'Won';
  lead.wonAt = new Date();
  lead.activities.push({
    type: 'won',
    note: 'Lead marked as Won',
    createdBy: req.user._id,
    createdAt: new Date(),
  });

  // ── Auto-create Client if not already linked ────────────────
  let client = null;
  let clientCreated = false;

  if (lead.clientId) {
    // Already linked to a client — just fetch it
    client = await Client.findById(lead.clientId);
  }

  if (!client) {
    // Split clientName into first/last (best effort)
    const nameParts = (lead.clientName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || lead.clientName || 'Unknown';
    const lastName  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Check for duplicate by email or phone before creating
    let existingClient = null;
    if (lead.email) {
      existingClient = await Client.findOne({
        email: lead.email.toLowerCase(),
        isActive: { $ne: false },
      });
    }
    if (!existingClient && lead.phone) {
      existingClient = await Client.findOne({
        phone: lead.phone,
        isActive: { $ne: false },
      });
    }

    if (existingClient) {
      // Link lead to existing client instead of creating duplicate
      client = existingClient;
    } else {
      // Create new client record from lead data
      client = await Client.create({
        clientId: ids.client(),
        firstName,
        lastName,
        email: lead.email || '',
        phone: lead.phone || '',
        address: '',
        country: '',
        leadSource: lead.leadSource || '',
        notes: `Auto-created when lead "${lead.leadId}" was marked Won.`,
        createdBy: lead.createdBy || req.user._id,
        ownerProducerId: lead.ownerProducerId || lead.assignedProducer || null,
        ownershipHistory: lead.ownerProducerId
          ? [{
              producerId: lead.ownerProducerId,
              assignedBy: req.user._id,
              reason: 'Auto-assigned on lead Won',
            }]
          : [],
      });
      clientCreated = true;
    }

    // Link the lead to this client
    lead.clientId = client._id;

    // Log the auto-creation activity
    await logActivity({
      type: clientCreated ? 'create' : 'update',
      description: clientCreated
        ? `Client "${client.firstName} ${client.lastName}" auto-created from won lead ${lead.leadId}`
        : `Lead ${lead.leadId} linked to existing client "${client.firstName} ${client.lastName}"`,
      entityType: 'client',
      entityId: client._id,
      clientId: client._id,
      leadId: lead._id,
      performedBy: req.user._id,
      metadata: { triggeredBy: 'markWon', leadId: lead.leadId },
    });
  }

  await lead.save();

  logActivity({
    type: 'won',
    description: `Lead for ${lead.clientName} marked Won — policy registration workflow opened`,
    entityType: 'lead',
    entityId: lead._id,
    leadId: lead._id,
    clientId: lead.clientId,
    performedBy: req.user._id,
  });

  // Trigger email automation
  processAutomationRules('lead_won', lead, req.user).catch((err) =>
    console.warn('[lead] Won rule error:', err.message)
  );

  res.json({
    lead,
    client,
    clientCreated,
    message: `Lead marked Won.${clientCreated ? ' New client record created automatically.' : ' Lead linked to existing client.'} Policy registration workflow is now available.`,
    policyRegistrationRequired: true,
  });
});

// POST /leads/:id/lost — mark lead as Lost
export const markLost = asyncHandler(async (req, res) => {
  const { lossReason } = req.body;
  const lead = await Lead.findById(req.params.id);
  assertLeadOwnership(req, lead);

  if (lead.leadStatus === 'Lost') {
    return res.json({ lead, alreadyLost: true, message: 'Lead is already marked Lost.' });
  }

  lead.leadStatus = 'Lost';
  lead.lostAt = new Date();
  lead.activities.push({
    type: 'lost',
    note: lossReason || 'Lead marked as Lost',
    createdBy: req.user._id,
    createdAt: new Date(),
  });
  await lead.save();

  logActivity({
    type: 'lost',
    description: `Lead for ${lead.clientName} marked Lost`,
    entityType: 'lead',
    entityId: lead._id,
    leadId: lead._id,
    performedBy: req.user._id,
    metadata: { lossReason },
  });

  // Trigger email automation
  processAutomationRules('lead_lost', lead, req.user).catch((err) =>
    console.warn('[lead] Lost rule error:', err.message)
  );

  res.json({ lead, message: 'Lead marked Lost' });
});

// POST /leads/:id/followup — add a follow-up note/activity
export const addFollowUp = asyncHandler(async (req, res) => {
  const { note, nextFollowUpDate } = req.body;
  const lead = await Lead.findById(req.params.id);
  assertLeadOwnership(req, lead);

  lead.activities.push({
    type: 'follow_up',
    note: note || '',
    createdBy: req.user._id,
    createdAt: new Date(),
  });

  if (nextFollowUpDate) lead.nextFollowUpDate = new Date(nextFollowUpDate);

  await lead.save();

  logActivity({
    type: 'follow_up',
    description: `Follow-up added for lead ${lead.clientName}`,
    entityType: 'lead',
    entityId: lead._id,
    leadId: lead._id,
    performedBy: req.user._id,
    metadata: { note },
  });

  res.json({ lead, message: 'Follow-up added' });
});

// DELETE /leads/:id — soft delete (only if no active policy)
export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  assertLeadOwnership(req, lead);

  if (lead.leadStatus === 'Won' && lead.policyRegistered) {
    throw badRequest('Cannot delete a lead with a registered policy.');
  }

  await Lead.findByIdAndDelete(req.params.id);

  logActivity({
    type: 'delete',
    description: `Lead for ${lead.clientName} deleted`,
    entityType: 'lead',
    entityId: lead._id,
    leadId: lead._id,
    performedBy: req.user._id,
  });

  res.json({ message: 'Lead deleted' });
});

// GET /leads/stats — summary counts for dashboard widgets
export const getLeadStats = asyncHandler(async (req, res) => {
  const filter = leadScopeFilter(req);
  const statusCounts = {};
  for (const s of LEAD_STATUSES) {
    statusCounts[s] = await Lead.countDocuments({ ...filter, leadStatus: s });
  }
  const total = await Lead.countDocuments(filter);
  const won = statusCounts['Won'] || 0;
  const lost = statusCounts['Lost'] || 0;
  const conversionRate = total > 0 ? ((won / (won + lost || 1)) * 100).toFixed(1) : 0;

  res.json({ statusCounts, total, won, lost, conversionRate });
});

// GET /leads/:id/email-logs
export const getLeadEmailLogs = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  assertLeadOwnership(req, lead);

  const logs = await EmailLog.find({ leadId: lead._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ logs });
});

// POST /leads/:id/send-email — manual selective email send for a lead
export const sendLeadEmail = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate('assignedProducer', 'firstName lastName')
    .populate('clientId');
  assertLeadOwnership(req, lead);

  const emailNotification = req.body;
  const result = await sendSelectiveLeadEmail(lead, emailNotification, req.user);
  res.json({ message: result.message, emailLog: result.emailLog });
});

/**
 * Core helper: sends a selective email for a lead.
 * Only the fields the user selected are included — unselected fields never enter the email.
 * Creates an EmailLog with status Pending; the background queue worker delivers it.
 */
async function sendSelectiveLeadEmail(lead, emailNotification, user) {
  const {
    recipients = [],
    cc = [],
    bcc = [],
    selectedFields = [],
    subject: customSubject,
    templateId,
    customEmail,  // ← plain-text email address entered by user
  } = emailNotification;

  // Merge customEmail into the recipients list before resolving
  const rawRecipients = [...(Array.isArray(recipients) ? recipients : [])];
  if (customEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customEmail.trim())) {
    rawRecipients.push(customEmail.trim());
  }

  if (rawRecipients.length === 0) {
    return { message: 'No recipients specified — email not sent.' };
  }

  // Resolve recipient addresses
  const recipientEmails = await resolveManualRecipients(rawRecipients);

  // Build the full field map, then extract ONLY selected fields
  const fieldMap = await buildLeadFieldMap(lead);
  const selectedMap = selectFields(fieldMap, selectedFields);

  // Render subject + body
  let subject = customSubject;
  let html;

  if (templateId) {
    const template = await EmailTemplate.findById(templateId);
    if (template) {
      const rendered = renderTemplate(template.bodyHtml, template.subject, selectedMap, {});
      subject = subject || rendered.subject;
      html = rendered.html;
    }
  }

  if (!html) {
    subject = subject || `New Insurance Lead Created – ${selectedMap.clientName || lead.clientName}`;
    html = buildDefaultBody(selectedMap);
  }

  // Deduplication key
  const deduplicationKey = makeDeduplicationKey({
    triggerType: 'manual_send',
    leadId: lead._id?.toString(),
    recipients: recipientEmails,
    templateId: templateId || '',
  });

  // Check for existing pending/sent email with same key
  const existing = await EmailLog.findOne({
    deduplicationKey,
    status: { $in: ['Pending', 'Sent', 'Retrying'] },
  });
  if (existing) {
    return {
      message: 'An email with these recipients and fields has already been queued or sent. Duplicate prevented.',
      emailLog: existing,
    };
  }

  const emailLog = await EmailLog.create({
    logId: ids.emailLog(),
    leadId: lead._id,
    sender: user.email,
    recipients: recipientEmails,
    cc,
    bcc,
    subject,
    selectedFields,
    bodyHtml: html,
    status: 'Pending',
    triggerType: 'manual_send',
    deduplicationKey,
    templateId: templateId || null,
    initiatedBy: user._id,
  });

  return { message: 'Email queued for delivery.', emailLog };
}

/**
 * Resolves manual recipients (which may be role keywords, recipient IDs, or raw emails).
 */
async function resolveManualRecipients(recipients) {
  const addresses = new Set();
  for (const r of recipients) {
    if (!r) continue;
    if (typeof r === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.trim())) {
      // raw email address (includes customEmail passed directly)
      addresses.add(r.trim().toLowerCase());
    } else if (r === 'manager') {
      const managers = await User.find({ role: 'manager', isActive: true }).select('email');
      managers.forEach((m) => m.email && addresses.add(m.email.toLowerCase()));
    } else if (r === 'admin') {
      const admins = await User.find({ role: 'admin', isActive: true }).select('email');
      admins.forEach((a) => a.email && addresses.add(a.email.toLowerCase()));
    } else if (r === 'producer' || r === 'assignedProducer') {
      // resolved by caller via lead context — skip here
    } else if (typeof r === 'string' && r.length === 24) {
      // looks like a Mongo ObjectId — EmailRecipient
      const rec = await EmailRecipient.findById(r).select('email isActive');
      if (rec?.isActive && rec.email) addresses.add(rec.email.toLowerCase());
    } else if (typeof r === 'object' && r?.email) {
      addresses.add(r.email.toLowerCase());
    }
  }
  return [...addresses];
}
