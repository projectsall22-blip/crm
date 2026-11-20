import mongoose from 'mongoose';

const { Schema } = mongoose;

export const RULE_TRIGGERS = [
  'producer_creates_lead',
  'admin_creates_lead',
  'lead_won',
  'lead_lost',
  'lead_assigned',
  'lead_updated',
];

export const RECIPIENT_TARGETS = ['manager', 'admin', 'producer', 'preconfigured', 'custom'];

const emailRuleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    trigger: { type: String, enum: RULE_TRIGGERS, required: true, index: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    // which recipients to notify
    recipients: {
      manager: { type: Boolean, default: false },
      admin: { type: Boolean, default: false },
      producer: { type: Boolean, default: false }, // the assigned producer
      preconfiguredIds: { type: [Schema.Types.ObjectId], ref: 'EmailRecipient', default: [] },
      customEmails: { type: [String], default: [] },
    },
    // template to use
    templateId: { type: Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
    // fields to include in the email (selective routing)
    selectedFields: { type: [String], default: [] },
    // send cc/bcc — only when authorized
    ccEmails: { type: [String], default: [] },
    bccEmails: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastTriggeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('EmailRule', emailRuleSchema);
