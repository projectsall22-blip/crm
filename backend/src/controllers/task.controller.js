import { body } from 'express-validator';
import Task from '../models/Task.js';
import { TASK_PRIORITIES, TASK_STATUSES } from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFoundErr, forbidden } from '../utils/errors.js';
import validate from '../middleware/validate.js';
import { paginateResults } from '../utils/pagination.js';
import logActivity from '../utils/activityLogger.js';

export const createTaskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().isString(),
  body('assignedTo').optional().isMongoId(),
  body('dueDate').optional().isISO8601(),
  body('priority').optional().isIn(TASK_PRIORITIES),
  body('status').optional().isIn(TASK_STATUSES),
  body('taskType').optional().isString(),
  body('notes').optional().isString(),
  body('clientId').optional().isMongoId(),
  body('leadId').optional().isMongoId(),
  body('policyId').optional().isMongoId(),
];

function taskScopeFilter(req) {
  if (req.user.role === 'admin' || req.user.role === 'manager') return {};
  // Producers see tasks assigned to them or created by them
  return { $or: [{ assignedTo: req.user._id }, { createdBy: req.user._id }] };
}

// GET /tasks
export const listTasks = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;
  const filter = { ...taskScopeFilter(req) };

  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.clientId) filter.clientId = req.query.clientId;
  if (req.query.leadId) filter.leadId = req.query.leadId;
  if (req.query.overdue === 'true') {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $ne: 'Completed' };
  }

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('clientId', 'firstName lastName')
      .populate('leadId', 'clientName')
      .sort({ dueDate: 1, priority: -1 })
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);
  res.json(paginateResults(tasks, total, page, limit));
});

// POST /tasks
export const createTask = asyncHandler(async (req, res) => {
  const task = await Task.create({
    ...req.body,
    dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
    assignedTo: req.body.assignedTo || req.user._id,
    createdBy: req.user._id,
  });
  logActivity({ type: 'create', description: `Task "${task.title}" created`, entityType: 'task', entityId: task._id, performedBy: req.user._id });
  res.status(201).json({ task, message: 'Task created' });
});

// GET /tasks/:id
export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .populate('clientId', 'firstName lastName')
    .populate('leadId', 'clientName');
  if (!task) throw notFoundErr('Task not found');
  if (req.user.role === 'producer') {
    if (task.assignedTo?.toString() !== req.user._id.toString() && task.createdBy?.toString() !== req.user._id.toString()) {
      throw forbidden('You do not have access to this task.');
    }
  }
  res.json({ task });
});

// PUT /tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw notFoundErr('Task not found');

  const updatable = ['title', 'description', 'assignedTo', 'dueDate', 'priority', 'status', 'taskType', 'notes'];
  for (const f of updatable) {
    if (req.body[f] !== undefined) task[f] = req.body[f];
  }

  if (req.body.dueDate) task.dueDate = new Date(req.body.dueDate);
  if (req.body.status === 'Completed') task.completedAt = new Date();

  await task.save();
  res.json({ task, message: 'Task updated' });
});

// DELETE /tasks/:id
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw notFoundErr('Task not found');
  if (req.user.role === 'producer' && task.createdBy?.toString() !== req.user._id.toString()) {
    throw forbidden('You can only delete tasks you created.');
  }
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: 'Task deleted' });
});

// GET /tasks/stats
export const getTaskStats = asyncHandler(async (req, res) => {
  const filter = taskScopeFilter(req);
  const [pending, inProgress, completed, overdue] = await Promise.all([
    Task.countDocuments({ ...filter, status: 'Pending' }),
    Task.countDocuments({ ...filter, status: 'In Progress' }),
    Task.countDocuments({ ...filter, status: 'Completed' }),
    Task.countDocuments({ ...filter, dueDate: { $lt: new Date() }, status: { $ne: 'Completed' } }),
  ]);
  res.json({ pending, inProgress, completed, overdue });
});
