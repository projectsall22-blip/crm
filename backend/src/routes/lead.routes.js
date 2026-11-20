import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  createLeadValidation,
  updateLeadValidation,
  listLeads,
  getKanban,
  getLead,
  createLead,
  updateLead,
  updateStatus,
  markWon,
  markLost,
  addFollowUp,
  deleteLead,
  getLeadStats,
  getLeadEmailLogs,
  sendLeadEmail,
} from '../controllers/lead.controller.js';

const router = Router();

router.use(protect);

// Stats & kanban (must be before /:id routes)
router.get('/stats', getLeadStats);
router.get('/kanban', getKanban);

// CRUD
router.get('/', listLeads);
router.post('/', createLeadValidation, validate, createLead);
router.get('/:id', getLead);
router.put('/:id', updateLeadValidation, validate, updateLead);
router.delete('/:id', deleteLead);

// Status & lifecycle
router.patch('/:id/status', [body('leadStatus').isString()], validate, updateStatus);
router.post('/:id/won', markWon);
router.post('/:id/lost', [body('lossReason').optional().isString()], validate, markLost);

// Follow-ups & activities
router.post('/:id/followup', [body('note').optional().isString(), body('nextFollowUpDate').optional().isISO8601()], validate, addFollowUp);

// Email
router.get('/:id/email-logs', getLeadEmailLogs);
router.post('/:id/send-email', sendLeadEmail);

export default router;
