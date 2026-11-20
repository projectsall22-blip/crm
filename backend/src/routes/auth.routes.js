import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  loginValidation,
  forgotPasswordValidation,
  login,
  logout,
  refresh,
  forgotPassword,
  me,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', loginValidation, validate, login);
router.post('/logout', protect, logout);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);
router.get('/me', protect, me);

export default router;
