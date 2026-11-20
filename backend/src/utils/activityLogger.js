import Activity from '../models/Activity.js';

/**
 * Records an activity entry. Non-blocking — failures are swallowed so they
 * never break the main request flow.
 */
export async function logActivity({ type, description, entityType, entityId, clientId, leadId, policyId, performedBy, metadata = {} }) {
  try {
    await Activity.create({
      type,
      description,
      entityType: entityType || 'client',
      entityId: entityId || null,
      clientId: clientId || null,
      leadId: leadId || null,
      policyId: policyId || null,
      performedBy,
      metadata,
    });
  } catch (err) {
    console.warn('[activity] Failed to log activity:', err.message);
  }
}

export default logActivity;
