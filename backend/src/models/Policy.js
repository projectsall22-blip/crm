import mongoose from 'mongoose';

const { Schema } = mongoose;

export const POLICY_STATUSES = [
  'Draft',
  'Policy Issuance Pending',
  'Active',
  'Expiring Soon',
  'Renewal Pending',
  'Cancelled',
  'Expired',
  'Not Taken Up',
];

const policySchema = new Schema(
  {
    policyId:             { type: String, unique: true, index: true },
    policyNumber:         { type: String, trim: true, default: '', index: true },
    leadId:               { type: Schema.Types.ObjectId, ref: 'Lead',    index: true, default: null },
    clientId:             { type: Schema.Types.ObjectId, ref: 'Client',  required: true, index: true },
    producerId:           { type: Schema.Types.ObjectId, ref: 'User',    index: true },
    insurerId:            { type: Schema.Types.ObjectId, ref: 'Insurer', index: true },
    productId:            { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    applicationReference: { type: String, trim: true, default: '' },
    insuranceCategory:    { type: String, trim: true, default: '' },
    effectiveDate:        { type: Date, default: null },
    expiryDate:           { type: Date, default: null },
    issueDate:            { type: Date, default: null },
    policyStatus:         { type: String, enum: POLICY_STATUSES, default: 'Policy Issuance Pending', index: true },
    billType:             { type: String, enum: ['Direct Bill', 'Agency Bill'], default: 'Direct Bill' },
    // Financial fields
    totalPremium:         { type: Number, default: 0 },
    brokerFee:            { type: Number, default: 0 },
    commissionPercent:    { type: Number, default: 0 },
    commissionAmount:     { type: Number, default: 0 },
    currency:             { type: String, default: 'CAD' },
    notes:                { type: String, default: '' },
    issuanceRequirementsMet: { type: Boolean, default: false },
    issuedAt:             { type: Date, default: null },
    // renewal chain
    previousPolicyId:     { type: Schema.Types.ObjectId, ref: 'Policy', default: null },
    nextPolicyId:         { type: Schema.Types.ObjectId, ref: 'Policy', default: null },
    createdBy:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

policySchema.index({ clientId: 1, policyStatus: 1 });
policySchema.index({ expiryDate: 1 });

export default mongoose.model('Policy', policySchema);
