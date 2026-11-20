import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { authorize, adminOnly } from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import { emailLimiter } from '../middleware/rateLimiter.js';
import {
  // recipients
  listRecipients,
  createRecipientValidation,
  createRecipient,
  updateRecipient,
  deleteRecipient,
  // templates
  listTemplates,
  createTemplateValidation,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  // rules
  listRules,
  createRuleValidation,
  createRule,
  updateRule,
  toggleRule,
  deleteRule,
  // logs
  listLogs,
  getLog,
  retryLog,
  getLogStats,
  // utilities
  listAvailableFields,
  checkSmtp,
  listTriggers,
  sendAdhocEmail,
} from '../controllers/email.controller.js';

const router = Router();

router.use(protect);

// All email management endpoints require admin role (Settings → Email Management).
// Producers and managers can still send lead emails via the lead routes.

// --- Recipients ---
router.get('/recipients', listRecipients);
router.post('/recipients', adminOnly, createRecipientValidation, validate, createRecipient);
router.put('/recipients/:id', adminOnly, updateRecipient);
router.delete('/recipients/:id', adminOnly, deleteRecipient);

// --- Templates ---
router.get('/templates', listTemplates);
router.post('/templates', adminOnly, createTemplateValidation, validate, createTemplate);
router.put('/templates/:id', adminOnly, updateTemplate);
router.delete('/templates/:id', adminOnly, deleteTemplate);

// --- Rules ---
router.get('/rules', adminOnly, listRules);
router.post('/rules', adminOnly, createRuleValidation, validate, createRule);
router.put('/rules/:id', adminOnly, updateRule);
router.patch('/rules/:id/toggle', adminOnly, toggleRule);
router.delete('/rules/:id', adminOnly, deleteRule);

// --- Logs ---
router.get('/logs', listLogs);
router.get('/logs/stats', getLogStats);
router.get('/logs/:id', getLog);
router.post('/logs/:id/retry', retryLog);

// --- Utilities ---
router.get('/fields', listAvailableFields);
router.get('/verify-smtp', adminOnly, checkSmtp);
router.get('/triggers', listTriggers);

// --- Manual send ---
router.post('/send', emailLimiter, [
  body('recipients').isArray({ min: 1 }).withMessage('At least one recipient required'),
  body('subject').trim().notEmpty().withMessage('Subject required'),
  body('bodyHtml').trim().notEmpty().withMessage('Email body required'),
], validate, sendAdhocEmail);

export default router;
