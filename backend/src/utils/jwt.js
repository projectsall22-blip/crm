import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

/**
 * Hash a refresh token for secure storage in the user record.
 * Only the hash is stored; the raw token is given to the client via httpOnly cookie.
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function randomTokenHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
