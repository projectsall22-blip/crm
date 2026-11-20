import mongoose from 'mongoose';

const { Schema } = mongoose;

export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Follow-up',
  'Interested',
  'In Progress',
  'Won',
  'Lost',
  'On Hold',
];

export const LEAD_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const activitySchema = new Schema(
  {
    type: {
      type: String,
      enum: ['created', 'updated', 'status_change', 'note', 'call', 'email', 'follow_up', 'assignment', 'won', 'lost'],
      required: true,
    },
    note: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const leadSchema = new Schema(
  {
    leadId: { type: String, unique: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    clientName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    insuranceType: { type: String, trim: true, default: '' },
    leadSource: { type: String, trim: true, default: '' },
    expectedPremium: { type: Number, default: 0 },
    currency: { type: String, default: 'USD', trim: true },
    priority: { type: String, enum: LEAD_PRIORITIES, default: 'Medium' },
    leadStatus: { type: String, enum: LEAD_STATUSES, default: 'New', index: true },
    nextFollowUpDate: { type: Date, default: null },
    assignedProducer: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerProducerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    notes: { type: String, default: '' },
    // duplicate-policy protection: once a lead is Won a policy registration is triggered
    wonAt: { type: Date, default: null },
    lostAt: { type: Date, default: null },
    policyRegistered: { type: Boolean, default: false },
    activities: [activitySchema],
  },
  { timestamps: true }
);

leadSchema.index({ leadStatus: 1, assignedProducer: 1 });
leadSchema.index({ clientName: 'text', email: 'text', insuranceType: 'text' });

export default mongoose.model('Lead', leadSchema);
