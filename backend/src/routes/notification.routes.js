import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allRoles } from '../middleware/rbac.js';
import { getNotifications } from '../controllers/notification.controller.js';

const router = Router();

router.use(protect);
router.use(allRoles);

router.get('/', getNotifications);

export default router;
