import { body } from 'express-validator';
import Policy from '../models/Policy.js';
import { POLICY_STATUSES } from '../models/Policy.js';
import Lead from '../models/Lead.js';
import Client from '../models/Client.js';
import Insurer from '../models/Insurer.js';
import Product from '../models/Product.js';
import Renewal from '../models/Renewal.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFoundErr, forbidden } from '../utils/errors.js';
import { paginateResults } from '../utils/pagination.js';
import { ids } from '../utils/idGenerator.js';
import logActivity from '../utils/activityLogger.js';

export const createPolicyValidation = [
  body('clientId').isMongoId().withMessage('A valid client ID is required'),
  body('leadId').optional().isMongoId(),
  body('producerId').optional().isMongoId(),
  body('insurerId').optional().isMongoId(),
  body('productId').optional().isMongoId(),
  body('policyNumber').optional().isString(),
  body('applicationReference').optional().isString(),
  body('insuranceCategory').optional().isString(),
  body('effectiveDate').optional().isISO8601(),
  body('expiryDate').optional().isISO8601(),
  body('issueDate').optional().isISO8601(),
  body('policyStatus').optional().isIn(POLICY_STATUSES),
  body('billType').optional().isIn(['Direct Bill', 'Agency Bill']),
  body('notes').optional().isString(),
];

function policyScopeFilter(req) {
  // Admin sees all, Manager sees all, Producer sees only their own
  if (req.user.role === 'admin' || req.user.role === 'manager') return {};
  return { producerId: req.user._id };
}

function assertPolicyOwnership(req, policy) {
  if (!policy) throw notFoundErr('Policy not found');
  // Admin and Manager can view all policies
  if (req.user.role === 'admin' || req.user.role === 'manager') return policy;
  // Producer can only view their own
  if (!policy.producerId || policy.producerId.toString() !== req.user._id.toString()) {
    throw forbidden('You do not have access to this policy.');
  }
  return policy;
}

// GET /policies
export const listPolicies = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const skip  = (page - 1) * limit;
  const filter = { ...policyScopeFilter(req) };

  if (req.query.policyStatus) filter.policyStatus = req.query.policyStatus;
  if (req.query.clientId)     filter.clientId     = req.query.clientId;
  if (req.query.producerId)   filter.producerId   = req.query.producerId;
  if (req.query.insurerId)    filter.insurerId    = req.query.insurerId;
  if (req.query.search) {
    const term = req.query.search.trim();
    filter.$or = [
      { policyNumber:        { $regex: term, $options: 'i' } },
      { applicationReference:{ $regex: term, $options: 'i' } },
    ];
  }

  const [policies, total] = await Promise.all([
    Policy.find(filter)
      .populate('clientId',  'firstName lastName email')
      .populate('producerId','firstName lastName')
      .populate('insurerId', 'companyName')
      .populate('productId', 'productName insuranceCategory')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Policy.countDocuments(filter),
  ]);
  res.json(paginateResults(policies, total, page, limit));
});

// GET /policies/stats
export const getPolicyStats = asyncHandler(async (req, res) => {
  const filter = policyScopeFilter(req);
  const statusCounts = {};
  for (const s of POLICY_STATUSES) {
    statusCounts[s] = await Policy.countDocuments({ ...filter, policyStatus: s });
  }

  const now = new Date();
  const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const upcomingRenewals = await Policy.countDocuments({
    ...filter,
    expiryDate:   { $gte: now, $lte: ninetyDaysLater },
    policyStatus: { $in: ['Active', 'Expiring Soon'] },
  });

  const premiumAgg = await Policy.aggregate([
    { $match: filter },
    { $group: { _id: null, totalPremium: { $sum: '$basePremium' } } },
  ]);
  const totalPremium = premiumAgg[0]?.totalPremium || 0;

  res.json({ statusCounts, upcomingRenewals, totalPremium });
});

// GET /policies/:id
export const getPolicy = asyncHandler(async (req, res) => {
  const policy = await Policy.findById(req.params.id)
    .populate('clientId')
    .populate('producerId',      'firstName lastName email')
    .populate('insurerId',       'companyName')
    .populate('productId',       'productName insuranceCategory')
    .populate('leadId',          'clientName leadStatus')
    .populate('previousPolicyId','policyNumber policyId');

  assertPolicyOwnership(req, policy);

  const renewals = await Renewal.find({ originalPolicyId: policy._id });

  res.json({ policy, renewals });
});

// POST /policies
export const createPolicy = asyncHandler(async (req, res) => {
  const {
    clientId, leadId, producerId, insurerId, productId,
    policyNumber, applicationReference, insuranceCategory,
    effectiveDate, expiryDate, issueDate,
    policyStatus, billType, notes,
    totalPremium, brokerFee, commissionPercent, currency,
  } = req.body;

  const client = await Client.findById(clientId);
  if (!client) throw badRequest('Referenced client does not exist.');

  let resolvedProducerId = producerId;
  if (req.user.role === 'producer' && !resolvedProducerId) {
    resolvedProducerId = req.user._id;
  }

  if (leadId) {
    const lead = await Lead.findById(leadId);
    if (lead?.policyRegistered) {
      throw badRequest('A policy has already been registered for this lead.');
    }
  }

  if (insurerId) {
    const insurer = await Insurer.findById(insurerId);
    if (!insurer) throw badRequest('Referenced insurer does not exist.');
  }

  const policy = new Policy({
    policyId:             ids.policy(),
    policyNumber:         policyNumber         || '',
    leadId:               leadId               || null,
    clientId,
    producerId:           resolvedProducerId   || null,
    insurerId:            insurerId            || null,
    productId:            productId            || null,
    applicationReference: applicationReference || '',
    insuranceCategory:    insuranceCategory    || '',
    effectiveDate:        effectiveDate        || null,
    expiryDate:           expiryDate           || null,
    issueDate:            issueDate            || null,
    policyStatus:         policyStatus         || 'Policy Issuance Pending',
    billType:             billType             || 'Direct Bill',
    totalPremium:         Number(totalPremium) || 0,
    brokerFee:            Number(brokerFee)    || 0,
    commissionPercent:    Number(commissionPercent) || 0,
    commissionAmount:     totalPremium && commissionPercent
                            ? Number(((Number(totalPremium) * Number(commissionPercent)) / 100).toFixed(2))
                            : 0,
    currency:             currency             || 'CAD',
    notes:                notes                || '',
    createdBy:            req.user._id,
  });

  await policy.save();

  if (leadId) {
    await Lead.findByIdAndUpdate(leadId, {
      policyRegistered: true,
      $push: {
        activities: {
          type:      'policy_registered',
          note:      'Policy registration completed',
          createdBy: req.user._id,
          createdAt: new Date(),
        },
      },
    });
  }

  await logActivity({
    type:        'policy_registered',
    description: `Policy registered for client ${client.firstName} ${client.lastName}`,
    entityType:  'policy',
    entityId:    policy._id,
    clientId,
    leadId:      leadId || null,
    policyId:    policy._id,
    performedBy: req.user._id,
  });

  res.status(201).json({
    policy,
    message: 'Policy registered successfully.',
  });
});

// PUT /policies/:id
export const updatePolicy = asyncHandler(async (req, res) => {
  const policy = await Policy.findById(req.params.id);
  assertPolicyOwnership(req, policy);

  const updatable = [
    'policyNumber', 'applicationReference', 'insuranceCategory',
    'effectiveDate', 'expiryDate', 'issueDate',
    'policyStatus', 'billType',
    'totalPremium', 'brokerFee', 'commissionPercent', 'commissionAmount', 'currency',
    'notes', 'insurerId', 'productId',
  ];
  for (const f of updatable) {
    if (req.body[f] !== undefined) policy[f] = req.body[f];
  }

  await policy.save();
  res.json({ policy, message: 'Policy updated' });
});

// POST /policies/:id/issue
export const issuePolicy = asyncHandler(async (req, res) => {
  const policy = await Policy.findById(req.params.id);
  assertPolicyOwnership(req, policy);

  if (!policy.policyNumber) throw badRequest('Policy number is required to issue a policy.');
  if (!policy.issueDate)    policy.issueDate = new Date();
  if (!policy.effectiveDate) policy.effectiveDate = policy.issueDate;

  policy.policyStatus         = 'Active';
  policy.issuanceRequirementsMet = true;
  policy.issuedAt             = new Date();
  await policy.save();

  await logActivity({
    type:        'update',
    description: `Policy ${policy.policyNumber} issued as Active`,
    entityType:  'policy',
    entityId:    policy._id,
    policyId:    policy._id,
    performedBy: req.user._id,
  });

  res.json({ policy, message: 'Policy issued and marked Active' });
});

// POST /policies/:id/cancel
export const cancelPolicy = asyncHandler(async (req, res) => {
  const { cancellationReason } = req.body;
  const policy = await Policy.findById(req.params.id);
  assertPolicyOwnership(req, policy);

  policy.policyStatus = 'Cancelled';
  policy.notes = `${policy.notes || ''}\n[Cancelled: ${cancellationReason || 'No reason provided'}]`.trim();
  await policy.save();

  await logActivity({
    type:        'update',
    description: `Policy ${policy.policyNumber || policy.policyId} cancelled`,
    entityType:  'policy',
    entityId:    policy._id,
    policyId:    policy._id,
    performedBy: req.user._id,
    metadata:    { cancellationReason },
  });

  res.json({ policy, message: 'Policy cancelled' });
});

// DELETE /policies/:id
export const deletePolicy = asyncHandler(async (req, res) => {
  const policy = await Policy.findById(req.params.id);
  if (!policy) throw notFoundErr('Policy not found');
  if (policy.policyStatus === 'Active') throw badRequest('Cannot delete an active policy.');
  await Policy.findByIdAndDelete(req.params.id);
  res.json({ message: 'Policy deleted' });
});
