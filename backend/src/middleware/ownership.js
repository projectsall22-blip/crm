import { forbidden, notFoundErr } from '../utils/errors.js';

/**
 * Returns a Mongoose filter object scoped to the requesting user's permissions.
 *
 * - admin: no restriction
 * - manager: no restriction (view all company clients/leads/policies)
 * - producer: only records where ownerProducerId / assignedProducer / producerId === req.user.id
 */
export function scopeFilter(req, producerField = 'ownerProducerId') {
  if (!req.user) return {};
  if (req.user.role === 'admin' || req.user.role === 'manager') return {};
  // Producer — restrict to own records
  return { [producerField]: req.user._id };
}

/**
 * Middleware that appends a role-scoped filter to req.scopeFilter.
 * The controller uses this to merge into its own query.
 *
 * @param {string} producerField - the document field representing producer ownership
 */
export function attachScope(producerField = 'ownerProducerId') {
  return (req, res, next) => {
    req.scopeFilter = scopeFilter(req, producerField);
    req.isScoped = Object.keys(req.scopeFilter).length > 0;
    next();
  };
}

/**
 * Guards a single document: fetches nothing but ensures that if a producer
 * is requesting, the document's producerField matches their id.
 * The controller passes the loaded document.
 */
export function assertOwnership(req, doc, producerField = 'ownerProducerId') {
  if (!doc) throw notFoundErr('Record not found.');
  if (!req.user) return doc;
  if (req.user.role === 'admin' || req.user.role === 'manager') return doc;
  const ownerId = doc[producerField];
  if (!ownerId) {
    // If the record has no assigned producer and the user is a producer, deny.
    throw forbidden('You do not have access to this record.');
  }
  if (ownerId.toString() !== req.user._id.toString()) {
    throw forbidden('You do not have access to this record assigned to another producer.');
  }
  return doc;
}

export default attachScope;
