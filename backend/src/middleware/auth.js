import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError, unauthorized } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

/**
 * Extracts and verifies the JWT access token from the Authorization header.
 * Attaches the authenticated user document to req.user.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw unauthorized('Authentication required. No token provided.');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw unauthorized('Invalid or expired token. Please log in again.');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw unauthorized('User no longer exists.');
  }
  if (!user.isActive) {
    throw unauthorized('Account is deactivated. Contact your administrator.');
  }

  req.user = user;
  next();
});

/**
 * Optional auth — attaches user if token is valid, but does not require it.
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id);
      if (user && user.isActive) req.user = user;
    } catch {
      // ignore — treat as anonymous
    }
  }
  next();
});

export default protect;
