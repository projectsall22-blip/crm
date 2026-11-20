import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ACTIVITY_TYPES = [
  'create',
  'update',
  'delete',
  'status_change',
  'login',
  'logout',
  'assignment',
  'note',
  'call',
  'email',
  'follow_up',
  'won',
  'lost',
  'policy_registered',
  'payment',
  'commission',
  'renewal',
];

const activitySchema = new Schema(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true, index: true },
    description: { type: String, default: '' },
    // related entity
    entityType: { type: String, enum: ['client', 'lead', 'policy', 'payment', 'commission', 'renewal', 'task', 'document', 'user', 'email'], default: 'client' },
    entityId: { type: Schema.Types.ObjectId, default: null },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', index: true, default: null },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true, default: null },
    policyId: { type: Schema.Types.ObjectId, ref: 'Policy', index: true, default: null },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

activitySchema.index({ performedBy: 1, createdAt: -1 });
activitySchema.index({ entityType: 1, entityId: 1 });

export default mongoose.model('Activity', activitySchema);
