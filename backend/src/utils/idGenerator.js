import crypto from 'crypto';

const counters = {};

/**
 * Generates a human-readable, prefixed ID with a timestamp and random suffix.
 * e.g. CLT-20261114-AB12XY
 *
 * This avoids a separate counter collection while remaining collision-resistant.
 */
export function generateId(prefix = 'ID') {
  const now = new Date();
  const dateStr =
    now.getUTCFullYear().toString() +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
  return `${prefix}-${dateStr}-${rand}`;
}

// Predefined prefixes for each collection
export const ids = {
  client: () => generateId('CLT'),
  lead: () => generateId('LD'),
  policy: () => generateId('POL'),
  payment: () => generateId('PMT'),
  commission: () => generateId('COM'),
  renewal: () => generateId('RNW'),
  document: () => generateId('DOC'),
  emailLog: () => generateId('EML'),
  task: () => generateId('TSK'),
};

export default generateId;
