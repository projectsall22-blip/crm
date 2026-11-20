import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import {
  createPolicyValidation,
  listPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  issuePolicy,
  cancelPolicy,
  deletePolicy,
  getPolicyStats,
} from '../controllers/policy.controller.js';

const router = Router();

router.use(protect);

// All roles can VIEW policies
router.get('/',      listPolicies);
router.get('/stats', getPolicyStats);
router.get('/:id',   getPolicy);

// Only MANAGER can CREATE a policy
router.post(
  '/',
  authorize('manager'),
  createPolicyValidation,
  validate,
  createPolicy
);

// Only MANAGER can update / issue / cancel / delete
router.put(   '/:id',    authorize('manager'), updatePolicy);
router.post(  '/:id/issue',  authorize('manager'), issuePolicy);
router.post(  '/:id/cancel', authorize('manager'),
  [body('cancellationReason').optional().isString()], validate, cancelPolicy
);
router.delete('/:id',    authorize('manager'), deletePolicy);

export default router;
