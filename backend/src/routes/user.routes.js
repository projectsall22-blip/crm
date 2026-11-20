import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize, adminOnly } from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import {
  createUserValidation,
  updateUserValidation,
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  listRoles,
} from '../controllers/user.controller.js';

const router = Router();

router.use(protect);

// Available roles list (any authenticated user)
router.get('/roles/list', listRoles);

// List users — admin: all, manager: producers, producer: self
router.get('/', listUsers);

// Get single user
router.get('/:id', getUser);

// Create user — admin only
router.post('/', adminOnly, createUserValidation, validate, createUser);

// Update user — admin can update all; user can update self (checked in controller)
router.put('/:id', updateUserValidation, validate, updateUser);

// Delete (soft-delete / deactivate) — admin only
router.delete('/:id', adminOnly, deleteUser);

export default router;
