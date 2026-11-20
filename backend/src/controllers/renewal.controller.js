import { body } from 'express-validator';
import Renewal from '../models/Renewal.js';
import { RENEWAL_STATUSES, REMINDER_SCHEDULE } from '../models/Renewal.js';
import Policy from '../models/Policy.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFoundErr, forbidden } from '../utils/errors.js';
import validate from '../middleware/validate.js';
import { paginateResults } from '../utils/pagination.js';
import { ids } from '../utils/idGenerator.js';
import logActivity from '../utils/activityLogger.js';

function renewalScopeFilter(req) {
  if (req.user.role === 'admin' || req.user.role === 'manager') return {};
  return { producerId: req.user._id };
}

// GET /renewals
export const listRenewals = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;
  const filter = { ...renewalScopeFilter(req) };

  if (req.query.status) filter.status = req.query.status;
  if (req.query.policyId) filter.originalPolicyId = req.query.policyId;
  if (req.query.clientId) filter.clientId = req.query.clientId;

  const [renewals, total] = await Promise.all([
    Renewal.find(filter)
      .populate('originalPolicyId', 'policyNumber policyId expiryDate')
      .populate('newPolicyId', 'policyNumber policyId')
      .populate('clientId', 'firstName lastName')
      .populate('producerId', 'firstName lastName')
      .sort({ expiryDate: 1 })
      .skip(skip)
      .limit(limit),
    Renewal.countDocuments(filter),
  ]);
  res.json(paginateResults(renewals, total, page, limit));
});

// GET /renewals/:id
export const getRenewal = asyncHandler(async (req, res) => {
  const renewal = await Renewal.findById(req.params.id)
    .populate('originalPolicyId')
    .populate('newPolicyId')
    .populate('clientId', 'firstName lastName')
    .populate('producerId', 'firstName lastName');
  if (!renewal) throw notFoundErr('Renewal not found');
  res.json({ renewal });
});

// POST /renewals — create a renewal record for a policy
export const createRenewal = asyncHandler(async (req, res) => {
  const { policyId, notes } = req.body;
  const policy = await Policy.findById(policyId);
  if (!policy) throw badRequest('Referenced policy does not exist.');

  if (req.user.role === 'producer') {
    if (!policy.producerId || policy.producerId.toString() !== req.user._id.toString()) {
      throw forbidden('You can only create renewals for your own policies.');
    }
  }

  // Don't create duplicate renewal for same policy
  const existing = await Renewal.findOne({ originalPolicyId: policyId, status: 'Pending' });
  if (existing) throw badRequest('A pending renewal already exists for this policy. Duplicate renewal prevented.');

  const reminders = REMINDER_SCHEDULE.map((days) => ({
    daysBeforeExpiry: days,
    reminderDate: new Date(policy.expiryDate.getTime() - days * 24 * 60 * 60 * 1000),
    sent: false,
    sentAt: null,
  }));

  const renewal = await Renewal.create({
    renewalNumber: ids.renewal(),
    originalPolicyId: policyId,
    clientId: policy.clientId,
    producerId: policy.producerId,
    expiryDate: policy.expiryDate,
    reminders,
    status: 'Pending',
    notes: notes || '',
    createdBy: req.user._id,
  });

  // Mark original policy as Renewal Pending
  policy.policyStatus = 'Renewal Pending';
  await policy.save();

  logActivity({ type: 'renewal', description: 'Renewal record created', entityType: 'renewal', entityId: renewal._id, policyId: policy._id, performedBy: req.user._id });
  res.status(201).json({ renewal, message: 'Renewal record created' });
});

// POST /renewals/:id/process — mark renewal as renewed and create a new policy term
export const processRenewal = asyncHandler(async (req, res) => {
  const { newPolicyId, newExpiryDate } = req.body;
  const renewal = await Renewal.findById(req.params.id);
  if (!renewal) throw notFoundErr('Renewal not found');

  if (newPolicyId) {
    renewal.newPolicyId = newPolicyId;
    // Link the new policy back to the original
    await Policy.findByIdAndUpdate(newPolicyId, { previousPolicyId: renewal.originalPolicyId });
  }

  renewal.status = 'Renewed';
  await renewal.save();

  // Update original policy to Expired
  const originalPolicy = await Policy.findById(renewal.originalPolicyId);
  if (originalPolicy) {
    originalPolicy.policyStatus = 'Expired';
    originalPolicy.nextPolicyId = newPolicyId || null;
    await originalPolicy.save();
  }

  logActivity({ type: 'renewal', description: 'Policy renewed — new term created', entityType: 'renewal', entityId: renewal._id, policyId: renewal.originalPolicyId, performedBy: req.user._id });
  res.json({ renewal, message: 'Policy renewed successfully' });
});

// GET /renewals/stats — upcoming renewals pipeline
export const getRenewalStats = asyncHandler(async (req, res) => {
  const filter = renewalScopeFilter(req);
  const now = new Date();
  const upcoming30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcoming90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [pending, expiring30, expiring90, inProgress] = await Promise.all([
    Renewal.countDocuments({ ...filter, status: 'Pending' }),
    Renewal.countDocuments({ ...filter, status: 'Pending', expiryDate: { $gte: now, $lte: upcoming30 } }),
    Renewal.countDocuments({ ...filter, status: 'Pending', expiryDate: { $gte: now, $lte: upcoming90 } }),
    Renewal.countDocuments({ ...filter, status: 'In Progress' }),
  ]);

  res.json({ pending, expiring30, expiring90, inProgress });
});
