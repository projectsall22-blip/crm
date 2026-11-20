import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { unauthorized, badRequest, notFoundErr } from '../utils/errors.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, randomTokenHex } from '../utils/jwt.js';
import { config } from '../config/env.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import { sendRawEmail } from '../services/emailService.js';
import logActivity from '../utils/activityLogger.js';

export const loginValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
];

// --- POST /auth/login ---
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw unauthorized('Invalid email or password.');
  }
  if (!user.isActive) {
    throw unauthorized('Account is deactivated. Contact your administrator.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw unauthorized('Invalid email or password.');
  }

  const payload = { id: user._id, role: user.role, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshTokenHash = hashToken(refreshToken);
  user.lastLoginAt = new Date();
  await user.save();

  await logActivity({
    type: 'login',
    description: `${user.firstName} ${user.lastName} logged in`,
    entityType: 'user',
    entityId: user._id,
    performedBy: user._id,
  });

  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    message: 'Login successful',
    accessToken,
    user: user.toSafeObject(),
  });
});

// --- POST /auth/logout ---
export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    req.user.refreshTokenHash = null;
    await req.user.save();
    await logActivity({
      type: 'logout',
      description: `${req.user.firstName} ${req.user.lastName} logged out`,
      entityType: 'user',
      entityId: req.user._id,
      performedBy: req.user._id,
    });
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

// --- POST /auth/refresh ---
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) throw unauthorized('Refresh token required.');

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw unauthorized('Invalid or expired refresh token.');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw unauthorized('User not found or inactive.');

  if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(token)) {
    throw unauthorized('Refresh token does not match. Please log in again.');
  }

  const payload = { id: user._id, role: user.role, email: user.email };
  const accessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  user.refreshTokenHash = hashToken(newRefreshToken);
  await user.save();

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken, message: 'Token refreshed' });
});

// --- POST /auth/forgot-password ---
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return generic success to prevent email enumeration
  if (!user) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }

  const resetToken = randomTokenHex(32);
  user.resetTokenHash = hashToken(resetToken);
  user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  // Send reset email (best-effort)
  const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
  try {
    await sendRawEmail({
      to: user.email,
      subject: 'Oracle RMS London North — Password Reset',
      html: `<div style="font-family:Arial,sans-serif;padding:24px;color:#1e293b;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your Oracle RMS London North CRM account.</p>
        <p>Click the link below to reset your password (valid for 1 hour):</p>
        <p><a href="${resetUrl}" style="background:#1e3a5f;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Reset Password</a></p>
        <p style="color:#64748b;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
      </div>`,
    });
  } catch (err) {
    console.warn('[auth] Failed to send reset email:', err.message);
  }

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

// --- GET /auth/me ---
export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw notFoundErr('User not found');
  res.json({ user: user.toSafeObject() });
});
