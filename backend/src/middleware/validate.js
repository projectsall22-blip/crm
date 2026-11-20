import { validationResult } from 'express-validator';
import { badRequest } from '../utils/errors.js';

/**
 * Runs after express-validator chains. Collects validation errors and
 * returns them in a consistent 400 response.
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const formatted = errors.array().map((e) => ({
    field: e.path,
    message: e.msg,
    value: e.value,
  }));

  return next(badRequest('Validation failed'));
}

/**
 * Returns a 400 with detailed field errors (use inside asyncHandler controllers).
 */
export function getValidationErrors(req) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  return errors.array().map((e) => ({ field: e.path, message: e.msg }));
}

export default validate;
