import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { listAuditLogs, getAuditLog, getAuditStats } from '../controllers/audit.controller.js';

const router = Router();

router.use(protect);
router.use(authorize('admin')); // audit logs are admin-only

router.get('/', listAuditLogs);
router.get('/stats', getAuditStats);
router.get('/:id', getAuditLog);

export default router;
