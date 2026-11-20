import mongoose from 'mongoose';

const { Schema } = mongoose;

export const TEMPLATE_TRIGGERS = [
  'lead_created',
  'lead_updated',
  'lead_won',
  'lead_lost',
  'lead_assigned',
  'payment_received',
  'renewal_reminder',
  'custom',
];

const emailTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    triggerType: { type: String, enum: TEMPLATE_TRIGGERS, default: 'custom', index: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    // The set of fields this template is allowed to reference (for selective routing)
    allowedFields: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('EmailTemplate', emailTemplateSchema);
