import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getOverview, getProducerReports } from '../controllers/report.controller.js';

const router = Router();

router.use(protect);

router.get('/overview', getOverview);
router.get('/producers', authorize('admin', 'manager'), getProducerReports);

export default router;
