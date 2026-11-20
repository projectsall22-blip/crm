import { body } from 'express-validator';
import Product from '../models/Product.js';
import Insurer from '../models/Insurer.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFoundErr } from '../utils/errors.js';
import validate from '../middleware/validate.js';
import { paginateResults } from '../utils/pagination.js';
import logActivity from '../utils/activityLogger.js';

export const createProductValidation = [
  body('productName').trim().notEmpty().withMessage('Product name is required'),
  body('insurerId').isMongoId().withMessage('A valid insurer ID is required'),
  body('insuranceCategory').optional().isString(),
  body('description').optional().isString(),
  body('isActive').optional().isBoolean(),
];

export const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const skip = (page - 1) * limit;
  const filter = { isActive: { $ne: false } };
  if (req.query.insurerId) filter.insurerId = req.query.insurerId;
  if (req.query.insuranceCategory) filter.insuranceCategory = req.query.insuranceCategory;
  if (req.query.search) filter.productName = { $regex: req.query.search.trim(), $options: 'i' };

  const [products, total] = await Promise.all([
    Product.find(filter).populate('insurerId', 'companyName').sort({ productName: 1 }).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json(paginateResults(products, total, page, limit));
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('insurerId', 'companyName');
  if (!product) throw notFoundErr('Product not found');
  res.json({ product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const insurer = await Insurer.findById(req.body.insurerId);
  if (!insurer) throw badRequest('Referenced insurer does not exist.');
  const product = await Product.create({ ...req.body, createdBy: req.user._id });
  await logActivity({ type: 'create', description: `Product ${product.productName} created`, entityType: 'client', performedBy: req.user._id, metadata: { productId: product._id } });
  res.status(201).json({ product, message: 'Product created' });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw notFoundErr('Product not found');
  const updatable = ['productName', 'insurerId', 'insuranceCategory', 'description', 'isActive'];
  for (const f of updatable) {
    if (req.body[f] !== undefined) product[f] = req.body[f];
  }
  await product.save();
  res.json({ product, message: 'Product updated' });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw notFoundErr('Product not found');
  product.isActive = false;
  await product.save();
  res.json({ message: 'Product deactivated' });
});
