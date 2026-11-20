import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  listRenewals,
  getRenewal,
  createRenewal,
  processRenewal,
  getRenewalStats,
} from '../controllers/renewal.controller.js';

const router = Router();

router.use(protect);

router.get('/', listRenewals);
router.get('/stats', getRenewalStats);
router.get('/:id', getRenewal);
router.post('/', [body('policyId').isMongoId().withMessage('Policy ID is required'), body('notes').optional().isString()], validate, createRenewal);
router.post('/:id/process', [body('newPolicyId').optional().isMongoId()], validate, processRenewal);

export default router;
