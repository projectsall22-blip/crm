import mongoose from 'mongoose';

const { Schema } = mongoose;

export const INSURER_STATUS = ['Active', 'Inactive'];

const insurerSchema = new Schema(
  {
    companyName: { type: String, required: true, trim: true, unique: true },
    country: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    contactEmail: { type: String, trim: true, lowercase: true, default: '' },
    contactPhone: { type: String, trim: true, default: '' },
    status: { type: String, enum: INSURER_STATUS, default: 'Active', index: true },
    notes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Insurer', insurerSchema);
