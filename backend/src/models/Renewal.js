import mongoose from 'mongoose';

const { Schema } = mongoose;

export const RENEWAL_STATUSES = ['Pending', 'In Progress', 'Renewed', 'Lapsed', 'Cancelled'];

const reminderSchema = new Schema(
  {
    daysBeforeExpiry: { type: Number, required: true },
    reminderDate: { type: Date, required: true },
    sent: { type: Boolean, default: false },
    sentAt: { type: Date, default: null },
  },
  { _id: false }
);

const renewalSchema = new Schema(
  {
    renewalNumber: { type: String, unique: true, index: true },
    originalPolicyId: { type: Schema.Types.ObjectId, ref: 'Policy', required: true, index: true },
    newPolicyId: { type: Schema.Types.ObjectId, ref: 'Policy', default: null },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    producerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    expiryDate: { type: Date, required: true, index: true },
    status: { type: String, enum: RENEWAL_STATUSES, default: 'Pending', index: true },
    reminders: [reminderSchema],
    notes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const REMINDER_SCHEDULE = [90, 60, 30, 15, 7];

export default mongoose.model('Renewal', renewalSchema);
