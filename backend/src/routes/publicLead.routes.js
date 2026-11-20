import { Router } from 'express';
import { body, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import validate from '../middleware/validate.js';
import {
  getPolicyTypes,
  getQuestions,
  getProducers,
  getEmailRecipients,
  submitPublicLead,
} from '../controllers/publicLead.controller.js';

const router = Router();

// Strict rate limit — public endpoint, no auth required
const publicLeadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many submissions. Please wait 15 minutes.' },
});

// GET /api/v1/public/lead/policy-types
router.get('/policy-types', getPolicyTypes);

// GET /api/v1/public/lead/questions?policyType=Auto+Insurance
router.get(
  '/questions',
  [query('policyType').notEmpty().withMessage('policyType is required')],
  validate,
  getQuestions
);

// GET /api/v1/public/lead/producers
router.get('/producers', getProducers);

// GET /api/v1/public/lead/email-recipients  (managers + admins for recipient picker)
router.get('/email-recipients', getEmailRecipients);

// POST /api/v1/public/lead/submit
router.post(
  '/submit',
  publicLeadLimiter,
  [
    body('clientName').trim().notEmpty().withMessage('Client name is required'),
    body('producerId').isMongoId().withMessage('Please select a producer'),
    body('insuranceType').notEmpty().withMessage('Insurance type is required'),
    body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
    body('phone').optional().isString(),
    body('address').optional().isString(),
    body('notes').optional().isString(),
    body('subType').optional().isString(),
    body('questionnaire').optional().isObject(),
    body('sendQuestionnaireEmail').optional().isBoolean(),
    body('additionalRecipients').optional().isArray(),
  ],
  validate,
  submitPublicLead
);

export default router;
