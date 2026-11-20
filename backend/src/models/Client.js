import mongoose from 'mongoose';

const { Schema } = mongoose;

const ownershipHistoryEntrySchema = new Schema(
  {
    producerId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const clientSchema = new Schema(
  {
    clientId: { type: String, unique: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: false, trim: true, default: '' },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: '',
    },
    phone: { type: String, trim: true, default: '', index: true },
    // Canada address format
    street:     { type: String, trim: true, default: '' },
    city:       { type: String, trim: true, default: '' },
    province:   { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    country:    { type: String, trim: true, default: 'Canada' },
    // Legacy single-string address (kept for backward compat)
    address:    { type: String, trim: true, default: '' },
    leadSource: { type: String, trim: true, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerProducerId: { type: Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    ownershipHistory: [ownershipHistoryEntrySchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

clientSchema.index({ firstName: 1, lastName: 1 });
clientSchema.index({ email: 1, phone: 1 });

export default mongoose.model('Client', clientSchema);
