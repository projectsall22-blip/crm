import mongoose from 'mongoose';

const { Schema } = mongoose;

export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled', 'Overdue'];

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    // belongs to client/lead/policy (optional)
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', index: true, default: null },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true, default: null },
    policyId: { type: Schema.Types.ObjectId, ref: 'Policy', index: true, default: null },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, index: true, default: null },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'Medium' },
    status: { type: String, enum: TASK_STATUSES, default: 'Pending', index: true },
    // task type for categorisation
    taskType: { type: String, default: 'Follow-up', trim: true },
    notes: { type: String, default: '' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });

export default mongoose.model('Task', taskSchema);
