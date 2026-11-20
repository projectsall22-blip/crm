import mongoose from 'mongoose';

const { Schema } = mongoose;

const productSchema = new Schema(
  {
    productName: { type: String, required: true, trim: true },
    insurerId: { type: Schema.Types.ObjectId, ref: 'Insurer', required: true, index: true },
    insuranceCategory: { type: String, trim: true, default: '' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

productSchema.index({ productName: 1, insurerId: 1 }, { unique: true });

export default mongoose.model('Product', productSchema);
