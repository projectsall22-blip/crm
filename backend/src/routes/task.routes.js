import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  createTaskValidation,
  listTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  getTaskStats,
} from '../controllers/task.controller.js';

const router = Router();

router.use(protect);

router.get('/', listTasks);
router.get('/stats', getTaskStats);
router.get('/:id', getTask);
router.post('/', createTaskValidation, validate, createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
