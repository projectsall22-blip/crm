import { forbidden } from '../utils/errors.js';

/**
 * Role-based access control middleware.
 * Usage: router.get('/route', protect, authorize('admin', 'manager'), controller)
 *
 * Roles are enforced on the backend — the frontend only hides/shows UI.
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(forbidden('Authentication required.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        forbidden(
          `Access denied. This action requires one of the following roles: ${roles.join(', ')}.`
        )
      );
    }
    next();
  };
}

export const adminOnly = authorize('admin');
export const adminOrManager = authorize('admin', 'manager');
export const allRoles = authorize('admin', 'manager', 'producer');

export default authorize;
