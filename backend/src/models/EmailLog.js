import mongoose from 'mongoose';

const { Schema } = mongoose;

export const EMAIL_STATUSES = ['Pending', 'Sent', 'Failed', 'Retrying'];

export const EMAIL_TRIGGERS = [
  'lead_created',
  'lead_updated',
  'lead_won',
  'lead_lost',
  'lead_assigned',
  'manual_send',
  'rule',
  'renewal_reminder',
];

const emailLogSchema = new Schema(
  {
    logId: { type: String, unique: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true, default: null },
    policyId: { type: Schema.Types.ObjectId, ref: 'Policy', index: true, default: null },
    sender: { type: String, trim: true, default: '' },
    recipients: { type: [String], default: [] }, // to
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },
    subject: { type: String, default: '' },
    // which fields were selected / included
    selectedFields: { type: [String], default: [] },
    // content snapshot for audit / retention (store rendered selected content)
    bodyHtml: { type: String, default: '' },
    bodyText: { type: String, default: '' },
    status: { type: String, enum: EMAIL_STATUSES, default: 'Pending', index: true },
    sentDate: { type: Date, default: null },
    errorMessage: { type: String, default: '' },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    triggerType: { type: String, enum: EMAIL_TRIGGERS, default: 'manual_send' },
    // idempotency: prevent duplicate sends for the same action
    deduplicationKey: { type: String, index: true, default: '' },
    // related rule/template that generated this email
    ruleId: { type: Schema.Types.ObjectId, ref: 'EmailRule', default: null },
    templateId: { type: Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // for scheduled / queued processing
    nextRetryAt: { type: Date, default: null },
  },
  { timestamps: true }
);

emailLogSchema.index({ status: 1, nextRetryAt: 1 });
emailLogSchema.index({ leadId: 1, createdAt: -1 });

export default mongoose.model('EmailLog', emailLogSchema);
