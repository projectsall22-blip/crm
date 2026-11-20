import AuditLog from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paginateResults } from '../utils/pagination.js';

// GET /audit-logs — admin & manager only
export const listAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;
  const filter = {};

  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.path) filter.path = { $regex: req.query.path, $options: 'i' };
  if (req.query.method) filter.method = req.query.method;
  if (req.query.action) filter.action = { $regex: req.query.action, $options: 'i' };
  if (req.query.statusCode) filter.statusCode = parseInt(req.query.statusCode, 10);
  if (req.query.startDate) filter.createdAt = { $gte: new Date(req.query.startDate) };
  if (req.query.endDate) {
    filter.createdAt = { ...filter.createdAt, $lte: new Date(req.query.endDate) };
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('userId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  res.json(paginateResults(logs, total, page, limit));
});

// GET /audit-logs/:id
export const getAuditLog = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id).populate('userId', 'firstName lastName email role');
  if (!log) throw notFoundErr('Audit log not found');
  res.json({ log });
});

// GET /audit-logs/stats — summary for dashboard
export const getAuditStats = asyncHandler(async (req, res) => {
  const total = await AuditLog.countDocuments({});
  const errors = await AuditLog.countDocuments({ statusCode: { $gte: 400 } });
  const recentLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'firstName lastName email role');
  res.json({ total, errors, recentLogs });
});
