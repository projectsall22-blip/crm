import mongoose from 'mongoose';

const { Schema } = mongoose;

export const DOCUMENT_TYPES = [
  'Insurance Application',
  'Signed Application',
  'Policy Document',
  'Invoice',
  'Receipt',
  'Supporting Document',
  'Other',
];

const documentSchema = new Schema(
  {
    docId: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: DOCUMENT_TYPES, default: 'Other' },
    // Belongs to: client, lead, policy
    relatedType: { type: String, enum: ['client', 'lead', 'policy'], default: 'client' },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', index: true, default: null },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true, default: null },
    policyId: { type: Schema.Types.ObjectId, ref: 'Policy', index: true, default: null },
    // storage
    filePath: { type: String, required: true }, // relative path under upload dir
    fileName: { type: String, required: true },
    mimeType: { type: String, default: '' },
    sizeBytes: { type: Number, default: 0 },
    // access control — only assigned producer + admin + manager can access by default
    ownerProducerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    isSigned: { type: Boolean, default: false },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // pending checklist flag
    checklistRequired: { type: Boolean, default: false },
    checklistCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

documentSchema.index({ relatedType: 1, clientId: 1 });

export default mongoose.model('Document', documentSchema);
