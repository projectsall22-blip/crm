import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Document from '../models/Document.js';
import { DOCUMENT_TYPES } from '../models/Document.js';
import Policy from '../models/Policy.js';
import Lead from '../models/Lead.js';
import Client from '../models/Client.js';
import { config } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFoundErr, forbidden } from '../utils/errors.js';
import validate from '../middleware/validate.js';
import { paginateResults } from '../utils/pagination.js';
import { ids } from '../utils/idGenerator.js';
import logActivity from '../utils/activityLogger.js';

// --- Multer storage config ---
const uploadDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = path.join(uploadDir, new Date().getFullYear().toString(), String(new Date().getMonth() + 1).padStart(2, '0'));
    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
    cb(null, subDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxUploadMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.xls', '.xlsx', '.txt', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`File type "${ext}" not allowed. Allowed: ${allowed.join(', ')}`));
  },
});

function docScopeFilter(req) {
  if (req.user.role === 'admin' || req.user.role === 'manager') return {};
  return { ownerProducerId: req.user._id };
}

// GET /documents
export const listDocuments = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;
  const filter = { ...docScopeFilter(req) };

  if (req.query.type) filter.type = req.query.type;
  if (req.query.relatedType) filter.relatedType = req.query.relatedType;
  if (req.query.clientId) filter.clientId = req.query.clientId;
  if (req.query.leadId) filter.leadId = req.query.leadId;
  if (req.query.policyId) filter.policyId = req.query.policyId;

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .populate('uploadedBy', 'firstName lastName')
      .populate('ownerProducerId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Document.countDocuments(filter),
  ]);
  res.json(paginateResults(documents, total, page, limit));
});

// POST /documents/upload — upload a document
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest('No file uploaded.');

  const { relatedType, clientId, leadId, policyId, type, name, checklistRequired } = req.body;

  // Determine owner producer
  let ownerProducerId = req.user._id;
  if (req.user.role === 'admin' && req.body.ownerProducerId) {
    ownerProducerId = req.body.ownerProducerId;
  }

  // If policyId, check ownership
  if (policyId) {
    const policy = await Policy.findById(policyId);
    if (policy && req.user.role === 'producer') {
      if (!policy.producerId || policy.producerId.toString() !== req.user._id.toString()) {
        throw forbidden('You can only upload documents for your own policies.');
      }
    }
  }

  const document = await Document.create({
    docId: ids.document(),
    name: name || req.file.originalname,
    type: type || 'Other',
    relatedType: relatedType || 'client',
    clientId: clientId || null,
    leadId: leadId || null,
    policyId: policyId || null,
    filePath: path.relative(path.resolve(config.upload.dir), req.file.path),
    fileName: req.file.filename,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    ownerProducerId,
    uploadedBy: req.user._id,
    checklistRequired: checklistRequired === 'true' || checklistRequired === true,
    checklistCompleted: false,
  });

  logActivity({ type: 'create', description: `Document "${document.name}" uploaded`, entityType: 'document', entityId: document._id, performedBy: req.user._id, metadata: { type: document.type, relatedType: document.relatedType } });

  res.status(201).json({ document, message: 'Document uploaded successfully' });
});

// GET /documents/:id — get document metadata + signed download path
export const getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id)
    .populate('uploadedBy', 'firstName lastName')
    .populate('ownerProducerId', 'firstName lastName');

  if (!document) throw notFoundErr('Document not found');

  if (req.user.role === 'producer') {
    if (!document.ownerProducerId || document.ownerProducerId._id.toString() !== req.user._id.toString()) {
      throw forbidden('You do not have access to this document.');
    }
  }

  res.json({ document });
});

// GET /documents/:id/download — download the file
export const downloadDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) throw notFoundErr('Document not found');

  if (req.user.role === 'producer') {
    if (!document.ownerProducerId || document.ownerProducerId.toString() !== req.user._id.toString()) {
      throw forbidden('You do not have access to this document.');
    }
  }

  const fullPath = path.resolve(config.upload.dir, document.filePath);
  if (!fs.existsSync(fullPath)) throw notFoundErr('File not found on disk.');

  logActivity({ type: 'update', description: `Document "${document.name}" downloaded`, entityType: 'document', entityId: document._id, performedBy: req.user._id });

  res.download(fullPath, document.name || document.fileName);
});

// PUT /documents/:id — update metadata / checklist
export const updateDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) throw notFoundErr('Document not found');

  const updatable = ['name', 'type', 'isSigned', 'checklistRequired', 'checklistCompleted', 'notes'];
  for (const f of updatable) {
    if (req.body[f] !== undefined) document[f] = req.body[f];
  }
  await document.save();
  res.json({ document, message: 'Document updated' });
});

// DELETE /documents/:id
export const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) throw notFoundErr('Document not found');

  if (req.user.role === 'producer') {
    if (!document.ownerProducerId || document.ownerProducerId.toString() !== req.user._id.toString()) {
      throw forbidden('You can only delete your own documents.');
    }
  }

  // Delete file from disk
  const fullPath = path.resolve(config.upload.dir, document.filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }

  await Document.findByIdAndDelete(req.params.id);
  res.json({ message: 'Document deleted' });
});

// GET /documents/checklist — pending document checklist for a policy
export const getChecklist = asyncHandler(async (req, res) => {
  const { policyId } = req.query;
  if (!policyId) throw badRequest('policyId is required');

  const filter = { policyId, checklistRequired: true, checklistCompleted: false };
  if (req.user.role === 'producer') filter.ownerProducerId = req.user._id;

  const pending = await Document.find(filter);
  res.json({ pending, count: pending.length });
});
