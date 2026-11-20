import mongoose from 'mongoose';

const { Schema } = mongoose;

export const RECIPIENT_TYPES = ['manager', 'admin', 'producer', 'preconfigured', 'custom'];

const emailRecipientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Operations"
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    type: { type: String, enum: RECIPIENT_TYPES, default: 'preconfigured' },
    isActive: { type: Boolean, default: true, index: true },
    // a recipient can be a system user reference (for manager/admin/producer)
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // grouping
    groups: { type: [String], default: [], index: true }, // e.g. ["Sales", "Management"]
    isDefault: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('EmailRecipient', emailRecipientSchema);
