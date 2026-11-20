import { body, param } from 'express-validator';
import EmailRecipient from '../models/EmailRecipient.js';
import EmailTemplate from '../models/EmailTemplate.js';
import EmailRule from '../models/EmailRule.js';
import EmailLog from '../models/EmailLog.js';
import Lead from '../models/Lead.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFoundErr } from '../utils/errors.js';
import validate from '../middleware/validate.js';
import { paginateResults } from '../utils/pagination.js';
import { verifySmtp } from '../services/emailService.js';
import { AVAILABLE_LEAD_FIELDS } from '../services/emailRouter.js';
import { processQueue } from '../jobs/emailQueue.worker.js';
import { RULE_TRIGGERS } from '../models/EmailRule.js';
import { TEMPLATE_TRIGGERS } from '../models/EmailTemplate.js';

// ===================== RECIPIENTS =====================

export const listRecipients = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.group) filter.groups = req.query.group;

  const [recipients, total] = await Promise.all([
    EmailRecipient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    EmailRecipient.countDocuments(filter),
  ]);

  res.json(paginateResults(recipients, total, page, limit));
});

export const createRecipientValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('description').optional().isString(),
  body('type').optional().isIn(['manager', 'admin', 'producer', 'preconfigured', 'custom']),
  body('groups').optional().isArray(),
  body('isDefault').optional().isBoolean(),
];

export const createRecipient = asyncHandler(async (req, res) => {
  const existing = await EmailRecipient.findOne({ email: req.body.email.toLowerCase() });
  if (existing) throw badRequest('A recipient with this email already exists.');

  const recipient = await EmailRecipient.create({
    ...req.body,
    createdBy: req.user._id,
  });
  res.status(201).json({ recipient, message: 'Email recipient created' });
});

export const updateRecipient = asyncHandler(async (req, res) => {
  const recipient = await EmailRecipient.findById(req.params.id);
  if (!recipient) throw notFoundErr('Recipient not found');

  const updatable = ['name', 'email', 'description', 'type', 'groups', 'isDefault', 'isActive'];
  for (const f of updatable) {
    if (req.body[f] !== undefined) recipient[f] = req.body[f];
  }
  await recipient.save();
  res.json({ recipient, message: 'Recipient updated' });
});

export const deleteRecipient = asyncHandler(async (req, res) => {
  const recipient = await EmailRecipient.findById(req.params.id);
  if (!recipient) throw notFoundErr('Recipient not found');
  // Soft delete — deactivate
  recipient.isActive = false;
  await recipient.save();
  res.json({ message: 'Recipient deactivated' });
});

// ===================== TEMPLATES =====================

export const listTemplates = asyncHandler(async (req, res) => {
  const templates = await EmailTemplate.find().sort({ createdAt: -1 });
  res.json({ templates });
});

export const createTemplateValidation = [
  body('name').trim().notEmpty().withMessage('Template name is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('bodyHtml').trim().notEmpty().withMessage('Email body is required'),
  body('triggerType').optional().isIn(TEMPLATE_TRIGGERS),
  body('allowedFields').optional().isArray(),
];

export const createTemplate = asyncHandler(async (req, res) => {
  const existing = await EmailTemplate.findOne({ name: req.body.name });
  if (existing) throw badRequest('A template with this name already exists.');

  const template = await EmailTemplate.create({
    ...req.body,
    createdBy: req.user._id,
  });
  res.status(201).json({ template, message: 'Email template created' });
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findById(req.params.id);
  if (!template) throw notFoundErr('Template not found');

  const updatable = ['name', 'subject', 'bodyHtml', 'triggerType', 'description', 'isActive', 'allowedFields'];
  for (const f of updatable) {
    if (req.body[f] !== undefined) template[f] = req.body[f];
  }
  await template.save();
  res.json({ template, message: 'Template updated' });
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findById(req.params.id);
  if (!template) throw notFoundErr('Template not found');
  template.isActive = false;
  await template.save();
  res.json({ message: 'Template deactivated' });
});

// ===================== RULES =====================

export const listRules = asyncHandler(async (req, res) => {
  const rules = await EmailRule.find()
    .populate('templateId', 'name subject')
    .populate('recipients.preconfiguredIds', 'name email')
    .sort({ createdAt: 1 });
  res.json({ rules });
});

export const createRuleValidation = [
  body('name').trim().notEmpty().withMessage('Rule name is required'),
  body('trigger').isIn(RULE_TRIGGERS).withMessage('Valid trigger is required'),
  body('isActive').optional().isBoolean(),
  body('recipients').optional().isObject(),
  body('templateId').optional().isMongoId(),
  body('selectedFields').optional().isArray(),
  body('ccEmails').optional().isArray(),
  body('bccEmails').optional().isArray(),
];

export const createRule = asyncHandler(async (req, res) => {
  const rule = await EmailRule.create({
    ...req.body,
    recipients: {
      manager: req.body.recipients?.manager || false,
      admin: req.body.recipients?.admin || false,
      producer: req.body.recipients?.producer || false,
      preconfiguredIds: req.body.recipients?.preconfiguredIds || [],
      customEmails: req.body.recipients?.customEmails || [],
    },
    createdBy: req.user._id,
  });
  res.status(201).json({ rule, message: 'Email rule created' });
});

export const updateRule = asyncHandler(async (req, res) => {
  const rule = await EmailRule.findById(req.params.id);
  if (!rule) throw notFoundErr('Rule not found');

  const updatable = ['name', 'trigger', 'description', 'isActive', 'templateId', 'selectedFields', 'ccEmails', 'bccEmails'];
  for (const f of updatable) {
    if (req.body[f] !== undefined) rule[f] = req.body[f];
  }
  if (req.body.recipients) {
    rule.recipients = {
      manager: req.body.recipients.manager ?? false,
      admin: req.body.recipients.admin ?? false,
      producer: req.body.recipients.producer ?? false,
      preconfiguredIds: req.body.recipients.preconfiguredIds ?? [],
      customEmails: req.body.recipients.customEmails ?? [],
    };
  }
  await rule.save();
  res.json({ rule, message: 'Rule updated' });
});

export const toggleRule = asyncHandler(async (req, res) => {
  const rule = await EmailRule.findById(req.params.id);
  if (!rule) throw notFoundErr('Rule not found');
  rule.isActive = !rule.isActive;
  await rule.save();
  res.json({ rule, message: `Rule ${rule.isActive ? 'activated' : 'deactivated'}` });
});

export const deleteRule = asyncHandler(async (req, res) => {
  await EmailRule.findByIdAndDelete(req.params.id);
  res.json({ message: 'Rule deleted' });
});

// ===================== LOGS =====================

/**
 * Scope filter for email logs:
 *  - admin / manager  → see ALL logs
 *  - producer         → see only logs they initiated OR whose lead belongs to them
 */
function logScopeFilter(req) {
  if (req.user.role === 'admin' || req.user.role === 'manager') return {};
  // Producer: logs they personally initiated
  return { initiatedBy: req.user._id };
}

export const listLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;

  // Apply role-based scope
  const filter = { ...logScopeFilter(req) };

  if (req.query.status) filter.status = req.query.status;
  if (req.query.triggerType) filter.triggerType = req.query.triggerType;
  if (req.query.leadId) filter.leadId = req.query.leadId;

  const [logs, total] = await Promise.all([
    EmailLog.find(filter)
      .populate('leadId', 'clientName leadId')
      .populate('ruleId', 'name')
      .populate('templateId', 'name')
      .populate('initiatedBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    EmailLog.countDocuments(filter),
  ]);

  res.json(paginateResults(logs, total, page, limit));
});

export const getLog = asyncHandler(async (req, res) => {
  const log = await EmailLog.findById(req.params.id)
    .populate('leadId', 'clientName')
    .populate('ruleId', 'name')
    .populate('templateId', 'name')
    .populate('initiatedBy', 'firstName lastName role');
  if (!log) throw notFoundErr('Email log not found');

  // Producer can only view their own logs
  if (req.user.role === 'producer') {
    const initiatedById = log.initiatedBy?._id?.toString() || log.initiatedBy?.toString();
    if (initiatedById !== req.user._id.toString()) {
      throw notFoundErr('Email log not found');
    }
  }

  res.json({ log });
});

// POST /email/logs/:id/retry — retry a failed email
export const retryLog = asyncHandler(async (req, res) => {
  const log = await EmailLog.findById(req.params.id);
  if (!log) throw notFoundErr('Email log not found');

  // Producer can only retry their own logs
  if (req.user.role === 'producer') {
    const initiatedById = log.initiatedBy?.toString();
    if (initiatedById !== req.user._id.toString()) {
      throw notFoundErr('Email log not found');
    }
  }

  if (log.status === 'Sent') {
    return res.json({ message: 'This email was already sent successfully.' });
  }

  log.status = 'Pending';
  log.errorMessage = '';
  log.nextRetryAt = null;
  await log.save();

  // Trigger immediate queue processing for this log
  processQueue();

  res.json({ log, message: 'Email queued for retry' });
});

// GET /email/logs/stats — delivery statistics for dashboard
export const getLogStats = asyncHandler(async (req, res) => {
  // Scope: producer sirf apne stats dekhe
  const scopeFilter = logScopeFilter(req);
  const stats = {};
  for (const s of ['Pending', 'Sent', 'Failed', 'Retrying']) {
    stats[s] = await EmailLog.countDocuments({ ...scopeFilter, status: s });
  }
  const total = await EmailLog.countDocuments(scopeFilter);
  stats.total = total;
  stats.deliveryRate = total > 0 ? ((stats.Sent / total) * 100).toFixed(1) : 0;
  res.json({ stats });
});

// ===================== SETTINGS & UTILITIES =====================

// GET /email/fields — list of available fields for selective routing
export const listAvailableFields = asyncHandler(async (req, res) => {
  res.json({ fields: AVAILABLE_LEAD_FIELDS });
});

// GET /email/verify-smtp — test SMTP connection
export const checkSmtp = asyncHandler(async (req, res) => {
  const result = await verifySmtp();
  res.json(result);
});

// GET /email/triggers — list available trigger types for rules/templates
export const listTriggers = asyncHandler(async (req, res) => {
  res.json({ ruleTriggers: RULE_TRIGGERS, templateTriggers: TEMPLATE_TRIGGERS });
});

// POST /email/send — manual ad-hoc email (not lead-specific)
export const sendAdhocEmail = asyncHandler(async (req, res) => {
  const { recipients, cc = [], bcc = [], subject, bodyHtml, leadId } = req.body;
  if (!recipients?.length) throw badRequest('At least one recipient is required.');
  if (!subject) throw badRequest('Subject is required.');
  if (!bodyHtml) throw badRequest('Email body is required.');

  const EmailLogModel = EmailLog;
  const log = await EmailLogModel.create({
    logId: `EML-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    leadId: leadId || null,
    sender: req.user.email,
    recipients,
    cc,
    bcc,
    subject,
    selectedFields: [],
    bodyHtml,
    status: 'Pending',
    triggerType: 'manual_send',
    initiatedBy: req.user._id,
  });

  processQueue();
  res.json({ log, message: 'Email queued for delivery' });
});
