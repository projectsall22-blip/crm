import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import {
  createProductValidation,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.js';

const router = Router();

router.use(protect);

router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', adminOnly, createProductValidation, validate, createProduct);
router.put('/:id', adminOnly, updateProduct);
router.delete('/:id', adminOnly, deleteProduct);

export default router;
