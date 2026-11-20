import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  upload,
  uploadDocument,
  listDocuments,
  getDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
  getChecklist,
} from '../controllers/document.controller.js';

const router = Router();

router.use(protect);

router.get('/', listDocuments);
router.get('/checklist', getChecklist);
router.get('/:id', getDocument);
router.get('/:id/download', downloadDocument);

router.post('/upload', upload.single('file'), uploadDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

export default router;
