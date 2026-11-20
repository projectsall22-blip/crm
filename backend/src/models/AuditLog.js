import mongoose from 'mongoose';

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    method: { type: String, required: true }, // HTTP method
    path: { type: String, required: true, index: true },
    statusCode: { type: Number, default: 200 },
    // who performed the action
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    userRole: { type: String, default: '' },
    userEmail: { type: String, default: '' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    action: { type: String, default: '' }, // e.g. CREATE_CLIENT, UPDATE_LEAD
    // the entity affected
    entityType: { type: String, default: '' },
    entityId: { type: String, default: '' },
    // request / response summary (sanitised — passwords stripped)
    requestBody: { type: Object, default: {} },
    params: { type: Object, default: {} },
    query: { type: Object, default: {} },
    durationMs: { type: Number, default: 0 },
    error: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
