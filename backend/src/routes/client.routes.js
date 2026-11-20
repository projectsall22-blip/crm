import { Router } from 'express';
import { body, param } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import {
  createClientValidation,
  updateClientValidation,
  listClients,
  getClient,
  createClient,
  updateClient,
  assignClient,
  checkDuplicates,
  deleteClient,
} from '../controllers/client.controller.js';

const router = Router();

router.use(protect);

router.get('/', listClients);
router.get('/duplicates/check', checkDuplicates);
router.get('/:id', getClient);

router.post('/', createClientValidation, validate, createClient);
router.put('/:id', updateClientValidation, validate, updateClient);

// Assign / reassign — admin only
router.post(
  '/:id/assign',
  authorize('admin'),
  [body('ownerProducerId').isMongoId().withMessage('A valid producer ID is required')],
  validate,
  assignClient
);

router.delete('/:id', deleteClient);

export default router;
