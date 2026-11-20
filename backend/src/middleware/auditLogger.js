import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';

// Sensitive fields that should never be persisted in audit logs.
const SENSITIVE_KEYS = ['password', 'confirmPassword', 'oldPassword', 'token', 'refreshToken', 'secret'];

function sanitise(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      clone[key] = '[REDACTED]';
    } else if (typeof clone[key] === 'object' && clone[key] !== null) {
      clone[key] = sanitise(clone[key]);
    }
  }
  return clone;
}

/**
 * Lightweight request audit logger. Persists a sanitised audit-log entry
 * after the response finishes. Failures are swallowed so they never break
 * the request cycle.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    setImmediate(async () => {
      try {
        // Only audit API calls
        if (!req.originalUrl.startsWith('/api/v1') && req.path !== '/health') return;
        if (req.path === '/health') return;

        const user = req.user;
        const action = deriveAction(req, res);

        await AuditLog.create({
          method: req.method,
          path: req.originalUrl.split('?')[0],
          statusCode: res.statusCode,
          userId: user?._id || null,
          userRole: user?.role || '',
          userEmail: user?.email || '',
          ip: req.ip || req.socket?.remoteAddress || '',
          userAgent: req.get('user-agent') || '',
          action,
          entityType: deriveEntityType(req),
          entityId: req.params?.id || req.params?.leadId || '',
          requestBody: sanitise(req.body),
          params: req.params,
          query: req.query,
          durationMs: Date.now() - start,
          error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : '',
        });
      } catch {
        // swallow — audit logging must never break requests
      }
    });
  });

  next();
}

function deriveAction(req, res) {
  if (res.statusCode >= 400) return `${req.method}_FAILED`;
  const seg = req.originalUrl.split('?')[0].split('/').filter(Boolean);
  const resource = seg[2] || 'unknown'; // /api/v1/<resource>
  if (req.method === 'POST') return `CREATE_${resource.toUpperCase()}`;
  if (req.method === 'PUT' || req.method === 'PATCH') return `UPDATE_${resource.toUpperCase()}`;
  if (req.method === 'DELETE') return `DELETE_${resource.toUpperCase()}`;
  return `READ_${resource.toUpperCase()}`;
}

function deriveEntityType(req) {
  const seg = req.originalUrl.split('?')[0].split('/').filter(Boolean);
  return seg[2] || '';
}

export default requestLogger;
