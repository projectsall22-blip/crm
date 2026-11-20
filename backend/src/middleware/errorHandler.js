import mongoose from 'mongoose';
import { isProd } from '../config/env.js';

/**
 * Centralised error handler. Converts known error types into consistent
 * JSON responses and logs details server-side.
 */
export function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error('[error]', err.message);

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ message: 'Validation error', errors });
  }

  // Mongoose duplicate key
  if (err.code === 11000 || err.code === 11001) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      message: `Duplicate value for "${field}". This ${field} already exists.`,
    });
  }

  // Mongoose cast error (bad ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired. Please log in again.' });
  }

  // Custom app error with statusCode
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  return res.status(status).json({
    message,
    ...(isProd ? {} : { stack: err.stack }),
  });
}

export default errorHandler;
