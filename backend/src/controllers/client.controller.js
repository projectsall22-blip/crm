import { body, param } from 'express-validator';
import Client from '../models/Client.js';
import Lead from '../models/Lead.js';
import Policy from '../models/Policy.js';
import Activity from '../models/Activity.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFoundErr, forbidden } from '../utils/errors.js';
import validate from '../middleware/validate.js';
import { paginateResults } from '../utils/pagination.js';
import { ids } from '../utils/idGenerator.js';
import logActivity from '../utils/activityLogger.js';

export const createClientValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').optional({ nullable: true }).trim(),
  body('email').optional({ nullable: true }).isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('phone').optional({ nullable: true }).isString(),
  body('address').optional().isString(),
  body('country').optional().isString(),
  body('leadSource').optional().isString(),
  body('notes').optional().isString(),
];

export const updateClientValidation = [
  param('id').isMongoId().withMessage('Invalid client ID'),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('phone').optional({ nullable: true }).isString(),
  body('address').optional().isString(),
  body('country').optional().isString(),
  body('leadSource').optional().isString(),
  body('notes').optional().isString(),
  body('isActive').optional().isBoolean(),
];

/**
 * Build role-scoped filter for clients.
 * - admin/manager: all
 * - producer: only clients where ownerProducerId === their id
 */
function clientScopeFilter(req) {
  if (req.user.role === 'admin' || req.user.role === 'manager') return {};
  return { ownerProducerId: req.user._id };
}

// GET /clients
export const listClients = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;

  const filter = { ...clientScopeFilter(req), isActive: { $ne: false } };

  if (req.query.search) {
    const term = req.query.search.trim();
    filter.$or = [
      { firstName: { $regex: term, $options: 'i' } },
      { lastName: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
      { phone: { $regex: term, $options: 'i' } },
    ];
  }

  if (req.query.ownerProducerId) filter.ownerProducerId = req.query.ownerProducerId;
  if (req.query.leadSource) filter.leadSource = req.query.leadSource;

  const [clients, total] = await Promise.all([
    Client.find(filter)
      .populate('ownerProducerId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Client.countDocuments(filter),
  ]);

  res.json(paginateResults(clients, total, page, limit));
});

// GET /clients/:id — full profile with related data
export const getClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id)
    .populate('ownerProducerId', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName')
    .populate('ownershipHistory.producerId', 'firstName lastName')
    .populate('ownershipHistory.assignedBy', 'firstName lastName');

  if (!client) throw notFoundErr('Client not found');

  // Enforce producer ownership
  if (req.user.role === 'producer') {
    if (!client.ownerProducerId || client.ownerProducerId._id.toString() !== req.user._id.toString()) {
      throw forbidden('You do not have access to this client.');
    }
  }

  // Fetch related records (respecting ownership for producers)
  const ownerId = req.user.role === 'producer' ? req.user._id : null;
  const leadFilter = { clientId: client._id, ...(ownerId ? { ownerProducerId: ownerId } : {}) };
  const policyFilter = { clientId: client._id, ...(ownerId ? { producerId: ownerId } : {}) };

  const [leads, policies, payments, documents, activities] = await Promise.all([
    Lead.find(leadFilter).sort({ createdAt: -1 }).populate('assignedProducer', 'firstName lastName'),
    Policy.find(policyFilter).sort({ createdAt: -1 }).populate('insurerId', 'companyName').populate('productId', 'productName'),
    // payments fetched via policies below
    Promise.resolve([]),
    import('../models/Document.js').then((m) => m.default.find({ clientId: client._id }).sort({ createdAt: -1 })),
    Activity.find({ clientId: client._id }).sort({ createdAt: -1 }).limit(50).populate('performedBy', 'firstName lastName'),
  ]);

  // Fetch email history for this client's leads
  const leadIds = leads.map((l) => l._id);
  const EmailLog = (await import('../models/EmailLog.js')).default;
  const emailLogs = await EmailLog.find({ leadId: { $in: leadIds } }).sort({ createdAt: -1 }).limit(50);

  // Get renewals for policies
  const Renewal = (await import('../models/Renewal.js')).default;
  const policyIds = policies.map((p) => p._id);
  const renewals = await Renewal.find({ originalPolicyId: { $in: policyIds } }).sort({ createdAt: -1 });

  res.json({
    client,
    related: {
      leads,
      policies,
      payments: [],
      renewals,
      documents,
      activities,
      emailLogs,
    },
  });
});

// POST /clients
export const createClient = asyncHandler(async (req, res) => {
  const { email, phone, ownerProducerId } = req.body;

  // Duplicate detection — warn (not block)
  const duplicates = [];
  if (email) {
    const byEmail = await Client.findOne({ email: email.toLowerCase(), isActive: { $ne: false } });
    if (byEmail) duplicates.push({ field: 'email', existingClientId: byEmail._id, existingName: `${byEmail.firstName} ${byEmail.lastName}` });
  }
  if (phone) {
    const byPhone = await Client.findOne({ phone, isActive: { $ne: false } });
    if (byPhone) duplicates.push({ field: 'phone', existingClientId: byPhone._id, existingName: `${byPhone.firstName} ${byPhone.lastName}` });
  }

  // Ownership: producer-created clients automatically belong to that producer
  let assignedProducerId = ownerProducerId || null;
  if (req.user.role === 'producer') {
    assignedProducerId = req.user._id; // producers can only assign to themselves
  }

  const client = await Client.create({
    clientId: ids.client(),
    firstName: req.body.firstName,
    lastName:  req.body.lastName  || '',
    email:     email              || '',
    phone:     phone              || '',
    street:    req.body.street    || '',
    city:      req.body.city      || '',
    province:  req.body.province  || '',
    postalCode:req.body.postalCode|| '',
    country:   'Canada',
    address:   [req.body.street, req.body.city, req.body.province, req.body.postalCode].filter(Boolean).join(', ') || '',
    leadSource:req.body.leadSource|| '',
    notes:     req.body.notes     || '',
    createdBy: req.user._id,
    ownerProducerId: assignedProducerId,
    ownershipHistory: assignedProducerId
      ? [{ producerId: assignedProducerId, assignedBy: req.user._id, reason: 'Initial assignment' }]
      : [],
  });

  await logActivity({
    type: 'create',
    description: `Client ${client.firstName} ${client.lastName} created`,
    entityType: 'client',
    entityId: client._id,
    clientId: client._id,
    performedBy: req.user._id,
    metadata: { ownerProducerId: assignedProducerId },
  });

  res.status(201).json({
    client,
    duplicates: duplicates.length > 0 ? duplicates : undefined,
    message: duplicates.length > 0 ? 'Client created with duplicate warnings' : 'Client created successfully',
  });
});

// PUT /clients/:id
export const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw notFoundErr('Client not found');

  if (req.user.role === 'producer') {
    if (!client.ownerProducerId || client.ownerProducerId.toString() !== req.user._id.toString()) {
      throw forbidden('You can only update your own clients.');
    }
  }

  const updatable = ['firstName', 'lastName', 'email', 'phone', 'street', 'city', 'province', 'postalCode', 'leadSource', 'notes', 'isActive'];
  for (const f of updatable) {
    if (req.body[f] !== undefined) client[f] = req.body[f];
  }
  // Keep legacy address field in sync
  client.address = [client.street, client.city, client.province, client.postalCode].filter(Boolean).join(', ');
  client.country = 'Canada';

  await client.save();

  await logActivity({
    type: 'update',
    description: `Client ${client.firstName} ${client.lastName} updated`,
    entityType: 'client',
    entityId: client._id,
    clientId: client._id,
    performedBy: req.user._id,
  });

  res.json({ client, message: 'Client updated successfully' });
});

// POST /clients/:id/assign — admin reassigns client to a producer
export const assignClient = asyncHandler(async (req, res) => {
  const { ownerProducerId, reason } = req.body;
  if (!ownerProducerId) throw badRequest('ownerProducerId is required to assign a client.');

  const client = await Client.findById(req.params.id);
  if (!client) throw notFoundErr('Client not found');

  const oldProducerId = client.ownerProducerId;

  client.ownerProducerId = ownerProducerId;
  client.ownershipHistory.push({
    producerId: ownerProducerId,
    assignedBy: req.user._id,
    reason: reason || 'Reassigned by admin',
  });
  await client.save();

  await logActivity({
    type: 'assignment',
    description: `Client ${client.firstName} ${client.lastName} reassigned to producer`,
    entityType: 'client',
    entityId: client._id,
    clientId: client._id,
    performedBy: req.user._id,
    metadata: { from: oldProducerId, to: ownerProducerId, reason },
  });

  res.json({ client, message: 'Client assigned successfully' });
});

// GET /clients/duplicates/check — check for duplicates before creating
export const checkDuplicates = asyncHandler(async (req, res) => {
  const { email, phone } = req.query;
  const matches = [];
  if (email) {
    const c = await Client.findOne({ email: email.toLowerCase(), isActive: { $ne: false } });
    if (c) matches.push({ field: 'email', client: c });
  }
  if (phone) {
    const c = await Client.findOne({ phone, isActive: { $ne: false } });
    if (c) matches.push({ field: 'phone', client: c });
  }
  res.json({ duplicates: matches });
});

// DELETE /clients/:id — soft delete
export const deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw notFoundErr('Client not found');

  if (req.user.role === 'producer') {
    if (!client.ownerProducerId || client.ownerProducerId.toString() !== req.user._id.toString()) {
      throw forbidden('You can only delete your own clients.');
    }
  }

  client.isActive = false;
  await client.save();

  await logActivity({
    type: 'delete',
    description: `Client ${client.firstName} ${client.lastName} deactivated`,
    entityType: 'client',
    entityId: client._id,
    clientId: client._id,
    performedBy: req.user._id,
  });

  res.json({ message: 'Client deactivated successfully' });
});
