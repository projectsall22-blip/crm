import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { hashToken, randomTokenHex } from '../utils/jwt.js';

let transporter = null;

/**
 * Lazily create the Nodemailer transporter from SMTP env config.
 * SMTP credentials stay in backend environment variables — never sent to frontend.
 */
function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  return transporter;
}

/**
 * Verify SMTP connection (used in health checks / settings UI).
 */
export async function verifySmtp() {
  try {
    const t = getTransporter();
    await t.verify();
    return { ok: true, message: 'SMTP connection verified.' };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

export function getFromAddress() {
  return `"${config.smtp.fromName}" <${config.smtp.fromAddress}>`;
}

/**
 * Low-level send: delivers an email and returns the response.
 * Does NOT create EmailLog — that's the caller's responsibility (via the queue).
 *
 * @returns {Promise<{messageId:string}>}
 */
export async function sendRawEmail({ to, cc = [], bcc = [], subject, html, text }) {
  const t = getTransporter();
  const info = await t.sendMail({
    from: getFromAddress(),
    to: Array.isArray(to) ? to.join(', ') : to,
    cc: cc.length ? cc.join(', ') : undefined,
    bcc: bcc.length ? bcc.join(', ') : undefined,
    subject,
    html,
    text: text || htmlToText(html),
  });
  return { messageId: info.messageId };
}

/**
 * Convert a minimal HTML string to plain text.
 */
export function htmlToText(html = '') {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Create a deduplication key to prevent duplicate emails for the same action.
 * Combines trigger + leadId + recipients + templateId.
 */
export function makeDeduplicationKey({ triggerType, leadId, recipients, templateId = '' }) {
  const recStr = [...(recipients || [])].sort().join(',');
  return `${triggerType}:${leadId || ''}:${recStr}:${templateId}`;
}

export default { sendRawEmail, verifySmtp, getFromAddress, htmlToText, makeDeduplicationKey };
