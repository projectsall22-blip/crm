import { body, param } from 'express-validator';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFoundErr, forbidden } from '../utils/errors.js';
import validate from '../middleware/validate.js';
import { paginateResults } from '../utils/pagination.js';
import logActivity from '../utils/activityLogger.js';

export const createUserValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'manager', 'producer']).withMessage('Role must be admin, manager, or producer'),
  body('phone').optional().isString(),
  body('country').optional().isString(),
];

export const updateUserValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'manager', 'producer']),
  body('phone').optional().isString(),
  body('country').optional().isString(),
  body('isActive').optional().isBoolean(),
  body('managerId').optional().isMongoId(),
  body('password').optional().isString().isLength({ min: 6 }),
];

// GET /users — admin: all; manager: producers only; producer: self
export const listUsers = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === 'manager') {
    filter = { role: { $in: ['producer', 'manager'] } };
  } else if (req.user.role === 'producer') {
    filter = { _id: req.user._id };
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;

  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  let search = {};
  if (req.query.search) {
    const term = req.query.search.trim();
    search = {
      $or: [
        { firstName: { $regex: term, $options: 'i' } },
        { lastName: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ],
    };
  }

  const [users, total] = await Promise.all([
    User.find({ ...filter, ...search }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments({ ...filter, ...search }),
  ]);

  res.json(
    paginateResults(
      users.map((u) => u.toSafeObject()),
      total,
      page,
      limit
    )
  );
});

// GET /users/:id
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw notFoundErr('User not found');

  // Producers can only view their own profile
  if (req.user.role === 'producer' && user._id.toString() !== req.user._id.toString()) {
    throw forbidden('You can only view your own profile.');
  }
  res.json({ user: user.toSafeObject() });
});

// POST /users — admin only
export const createUser = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw badRequest('A user with this email already exists.');

  const user = await User.create({
    ...req.body,
    managerId: req.body.managerId || null,
  });

  await logActivity({
    type: 'create',
    description: `User ${user.firstName} ${user.lastName} (${user.role}) created`,
    entityType: 'user',
    entityId: user._id,
    performedBy: req.user._id,
    metadata: { role: user.role, email: user.email },
  });

  res.status(201).json({ user: user.toSafeObject(), message: 'User created successfully' });
});

// PUT /users/:id — admin can update all; user can update self
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw notFoundErr('User not found');

  const { firstName, lastName, email, role, phone, country, isActive, managerId, password } = req.body;

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (email !== undefined) user.email = email.toLowerCase();
  if (role !== undefined) user.role = role;
  if (phone !== undefined) user.phone = phone;
  if (country !== undefined) user.country = country;
  if (isActive !== undefined) user.isActive = isActive;
  if (managerId !== undefined) user.managerId = managerId || null;
  if (password) user.password = password; // pre-save hook re-hashes

  await user.save();

  await logActivity({
    type: 'update',
    description: `User ${user.firstName} ${user.lastName} updated`,
    entityType: 'user',
    entityId: user._id,
    performedBy: req.user._id,
  });

  res.json({ user: user.toSafeObject(), message: 'User updated successfully' });
});

// DELETE /users/:id — soft delete (deactivate)
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw notFoundErr('User not found');

  if (user._id.toString() === req.user._id.toString()) {
    throw badRequest('You cannot delete your own account.');
  }

  user.isActive = false;
  user.refreshTokenHash = null;
  await user.save();

  await logActivity({
    type: 'delete',
    description: `User ${user.firstName} ${user.lastName} deactivated`,
    entityType: 'user',
    entityId: user._id,
    performedBy: req.user._id,
  });

  res.json({ message: 'User deactivated successfully' });
});

// GET /users/roles/list — return available roles
export const listRoles = asyncHandler(async (req, res) => {
  res.json({ roles: ['admin', 'manager', 'producer'] });
});
