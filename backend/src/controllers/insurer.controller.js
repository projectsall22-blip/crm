import { body, param } from 'express-validator';
import Insurer from '../models/Insurer.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFoundErr } from '../utils/errors.js';
import validate from '../middleware/validate.js';
import { paginateResults } from '../utils/pagination.js';
import logActivity from '../utils/activityLogger.js';

export const createInsurerValidation = [
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('country').optional().isString(),
  body('website').optional().isString(),
  body('contactEmail').optional().isEmail().normalizeEmail(),
  body('contactPhone').optional().isString(),
  body('status').optional().isIn(['Active', 'Inactive']),
  body('notes').optional().isString(),
];

export const listInsurers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const skip = (page - 1) * limit;
  const filter = {};
  if (req.query.search) {
    filter.companyName = { $regex: req.query.search.trim(), $options: 'i' };
  }
  if (req.query.status) filter.status = req.query.status;

  const [insurers, total] = await Promise.all([
    Insurer.find(filter).sort({ companyName: 1 }).skip(skip).limit(limit),
    Insurer.countDocuments(filter),
  ]);
  res.json(paginateResults(insurers, total, page, limit));
});

export const getInsurer = asyncHandler(async (req, res) => {
  const insurer = await Insurer.findById(req.params.id);
  if (!insurer) throw notFoundErr('Insurer not found');
  const products = await Product.find({ insurerId: insurer._id, isActive: true });
  res.json({ insurer, products });
});

export const createInsurer = asyncHandler(async (req, res) => {
  const existing = await Insurer.findOne({ companyName: req.body.companyName });
  if (existing) throw badRequest('An insurer with this name already exists.');
  const insurer = await Insurer.create({ ...req.body, createdBy: req.user._id });
  await logActivity({ type: 'create', description: `Insurer ${insurer.companyName} created`, entityType: 'client', performedBy: req.user._id, metadata: { insurerId: insurer._id } });
  res.status(201).json({ insurer, message: 'Insurance company created' });
});

export const updateInsurer = asyncHandler(async (req, res) => {
  const insurer = await Insurer.findById(req.params.id);
  if (!insurer) throw notFoundErr('Insurer not found');
  const updatable = ['companyName', 'country', 'website', 'contactEmail', 'contactPhone', 'status', 'notes'];
  for (const f of updatable) {
    if (req.body[f] !== undefined) insurer[f] = req.body[f];
  }
  await insurer.save();
  res.json({ insurer, message: 'Insurer updated' });
});

export const deleteInsurer = asyncHandler(async (req, res) => {
  const insurer = await Insurer.findById(req.params.id);
  if (!insurer) throw notFoundErr('Insurer not found');
  insurer.status = 'Inactive';
  await insurer.save();
  res.json({ message: 'Insurer deactivated' });
});
