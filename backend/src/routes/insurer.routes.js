import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize, adminOnly } from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import {
  createInsurerValidation,
  listInsurers,
  getInsurer,
  createInsurer,
  updateInsurer,
  deleteInsurer,
} from '../controllers/insurer.controller.js';

const router = Router();

router.use(protect);

router.get('/', listInsurers);
router.get('/:id', getInsurer);
router.post('/', adminOnly, createInsurerValidation, validate, createInsurer);
router.put('/:id', adminOnly, updateInsurer);
router.delete('/:id', adminOnly, deleteInsurer);

export default router;
