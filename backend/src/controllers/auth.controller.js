import crypto from 'crypto';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { unauthorized, badRequest, notFoundErr } from '../utils/errors.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, randomTokenHex } from '../utils/jwt.js';
import { config } from '../config/env.js';
import validate from '../middleware/validate.js';
import { sendRawEmail } from '../services/emailService.js';
import logActivity from '../utils/activityLogger.js';

// ── OTP helpers ────────────────────────────────────────────────
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp() {
  // 6-digit numeric OTP
  return crypto.randomInt(100000, 999999).toString();
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Sign a short-lived "pre-auth" token that only unlocks the verify-otp endpoint.
 * It carries NO role/access — just the user id and a "otp_pending" flag.
 */
function signOtpToken(userId) {
  return jwt.sign(
    { id: userId, stage: 'otp_pending' },
    config.jwt.secret,
    { expiresIn: '12m' }   // slightly longer than OTP expiry
  );
}

function verifyOtpToken(token) {
  const decoded = jwt.verify(token, config.jwt.secret);
  if (decoded.stage !== 'otp_pending') throw new Error('Invalid token stage');
  return decoded;
}

// ── Email sender ───────────────────────────────────────────────
async function sendOtpEmail(user, otp) {
  const html = `
<div style="font-family:Inter,Arial,sans-serif;background:#F4F5FB;padding:28px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:linear-gradient(135deg,#4338ca,#1e1b6e);padding:24px 28px;">
      <p style="margin:0 0 2px;color:#A5B4FC;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;">Oracle RMS London North</p>
      <h2 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Login Verification</h2>
    </div>
    <div style="padding:28px;text-align:center;">
      <p style="color:#374151;font-size:14px;margin:0 0 20px;">
        Hi <strong>${user.firstName}</strong>, use the code below to complete your login.
      </p>
      <div style="display:inline-block;background:#EEF2FF;border:2px dashed #6366F1;border-radius:12px;padding:18px 40px;margin-bottom:20px;">
        <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#1e1b6e;font-family:monospace;">
          ${otp}
        </span>
      </div>
      <p style="color:#6B7280;font-size:13px;margin:0 0 6px;">This code expires in <strong>10 minutes</strong>.</p>
      <p style="color:#9CA3AF;font-size:12px;margin:0;">If you did not attempt to log in, please ignore this email or contact your administrator.</p>
    </div>
    <div style="padding:14px 28px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-size:11px;color:#9CA3AF;text-align:center;">
      Oracle RMS London North · Private system · Authorised users only
    </div>
  </div>
</div>`;

  await sendRawEmail({
    to: user.email,
    subject: `${otp} — Your Oracle RMS login code`,
    html,
  });
}

// ── Validation schemas ─────────────────────────────────────────
export const loginValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const verifyOtpValidation = [
  body('otpToken').isString().notEmpty().withMessage('OTP token is required'),
  body('otp').isString().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
];

// ── POST /auth/login ───────────────────────────────────────────
// Step 1: verify password → send OTP → return otpToken (not a full session)
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw unauthorized('Invalid email or password.');
  if (!user.isActive) throw unauthorized('Account is deactivated. Contact your administrator.');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw unauthorized('Invalid email or password.');

  // Generate OTP
  const otp = generateOtp();
  user.otpHash = hashOtp(otp);
  user.otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
  await user.save();

  // Return otpToken IMMEDIATELY — don't wait for email delivery
  const otpToken = signOtpToken(user._id);
  res.json({
    message: 'OTP sent to your registered email address.',
    otpToken,
    emailHint: maskEmail(user.email),
  });

  // Send email in background AFTER response is sent
  sendOtpEmail(user, otp).catch((err) => {
    console.warn('[auth] Failed to send OTP email:', err.message);
    console.log(`[auth] OTP for ${user.email} : ${otp}  (email delivery failed — check SMTP config)`);
  });
});

// ── POST /auth/verify-otp ──────────────────────────────────────
// Step 2: verify OTP → issue real accessToken + refreshToken
export const verifyOtp = asyncHandler(async (req, res) => {
  const { otpToken, otp } = req.body;

  // Verify pre-auth token
  let decoded;
  try {
    decoded = verifyOtpToken(otpToken);
  } catch {
    throw unauthorized('OTP session expired or invalid. Please log in again.');
  }

  const user = await User.findById(decoded.id).select('+otpHash');
  if (!user || !user.isActive) throw unauthorized('User not found or inactive.');

  // Check OTP not expired
  if (!user.otpHash || !user.otpExpires || user.otpExpires < new Date()) {
    throw unauthorized('OTP has expired. Please log in again.');
  }

  // Constant-time comparison via hash
  if (user.otpHash !== hashOtp(otp.trim())) {
    throw unauthorized('Incorrect OTP. Please try again.');
  }

  // OTP valid — clear it (single use)
  user.otpHash = null;
  user.otpExpires = null;
  user.lastLoginAt = new Date();

  // Issue real session tokens
  const payload = { id: user._id, role: user.role, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  await logActivity({
    type: 'login',
    description: `${user.firstName} ${user.lastName} logged in (OTP verified)`,
    entityType: 'user',
    entityId: user._id,
    performedBy: user._id,
  });

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

// ── POST /auth/resend-otp ──────────────────────────────────────
export const resendOtp = asyncHandler(async (req, res) => {
  const { otpToken } = req.body;

  let decoded;
  try {
    decoded = verifyOtpToken(otpToken);
  } catch {
    throw unauthorized('Session expired. Please log in again.');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw unauthorized('User not found.');

  const otp = generateOtp();
  user.otpHash = hashOtp(otp);
  user.otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
  await user.save();

  // Respond immediately, send email in background
  res.json({ message: 'A new OTP has been sent to your email.' });

  sendOtpEmail(user, otp).catch((err) => {
    console.warn('[auth] Failed to resend OTP:', err.message);
    console.log(`[auth] OTP for ${user.email} : ${otp}  (email delivery failed — check SMTP config)`);
  });
});

// ── POST /auth/logout ──────────────────────────────────────────
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

// ── POST /auth/refresh ─────────────────────────────────────────
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

// ── POST /auth/forgot-password ─────────────────────────────────
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

  const resetToken = randomTokenHex(32);
  user.resetTokenHash = hashToken(resetToken);
  user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
  try {
    await sendRawEmail({
      to: user.email,
      subject: 'Oracle RMS London North — Password Reset',
      html: `<div style="font-family:Arial,sans-serif;padding:24px;color:#1e293b;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your Oracle RMS London North CRM account.</p>
        <p><a href="${resetUrl}" style="background:#1e3a5f;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Reset Password</a></p>
        <p style="color:#64748b;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
      </div>`,
    });
  } catch (err) {
    console.warn('[auth] Failed to send reset email:', err.message);
  }

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

// ── GET /auth/me ───────────────────────────────────────────────
export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw notFoundErr('User not found');
  res.json({ user: user.toSafeObject() });
});

// ── Utility ───────────────────────────────────────────────────
function maskEmail(email) {
  const [local, domain] = email.split('@');
  const masked = local.length <= 2
    ? local[0] + '***'
    : local.slice(0, 2) + '***';
  return `${masked}@${domain}`;
}
