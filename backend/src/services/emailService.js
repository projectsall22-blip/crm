import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../config/env.js';

// ── Resend client (HTTP API — works on Render free tier) ──────
let resendClient = null;
function getResendClient() {
  if (!resendClient && config.resend.apiKey) {
    resendClient = new Resend(config.resend.apiKey);
  }
  return resendClient;
}

// ── Nodemailer transporter (SMTP fallback) ────────────────────
let transporter = null;
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
 * Send email — tries Resend first (HTTP, works on Render free tier),
 * falls back to SMTP nodemailer if Resend key not configured.
 */
export async function sendRawEmail({ to, cc = [], bcc = [], subject, html, text }) {
  const toList  = Array.isArray(to) ? to : [to];
  const resend  = getResendClient();

  if (resend) {
    // ── Resend path ──────────────────────────────────────────
    const from = `${config.resend.fromName} <${config.resend.fromAddress}>`;
    const result = await resend.emails.send({
      from,
      to:      toList,
      cc:      cc.length  ? cc  : undefined,
      bcc:     bcc.length ? bcc : undefined,
      subject,
      html,
      text: text || htmlToText(html),
    });
    if (result.error) throw new Error(result.error.message || 'Resend error');
    return { messageId: result.data?.id || 'resend-ok' };
  }

  // ── SMTP fallback ────────────────────────────────────────────
  const t    = getTransporter();
  const from = `"${config.smtp.fromName}" <${config.smtp.fromAddress}>`;
  const info = await t.sendMail({
    from,
    to:  toList.join(', '),
    cc:  cc.length  ? cc.join(', ')  : undefined,
    bcc: bcc.length ? bcc.join(', ') : undefined,
    subject,
    html,
    text: text || htmlToText(html),
  });
  return { messageId: info.messageId };
}

/**
 * Verify connection — Resend: lightweight ping, SMTP: t.verify() with timeout.
 */
export async function verifySmtp() {
  const resend = getResendClient();
  if (resend) {
    // Resend has no explicit verify — just confirm the key is set
    return { ok: true, message: 'Resend API key configured — HTTP email delivery ready.' };
  }

  try {
    const t = getTransporter();
    await Promise.race([
      t.verify(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP verification timed out (10 s)')), 10_000)
      ),
    ]);
    return { ok: true, message: 'SMTP connection verified.' };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

export function getFromAddress() {
  if (config.resend.apiKey) {
    return `"${config.resend.fromName}" <${config.resend.fromAddress}>`;
  }
  return `"${config.smtp.fromName}" <${config.smtp.fromAddress}>`;
}

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

export function makeDeduplicationKey({ triggerType, leadId, recipients, templateId = '' }) {
  const recStr = [...(recipients || [])].sort().join(',');
  return `${triggerType}:${leadId || ''}:${recStr}:${templateId}`;
}

export default { sendRawEmail, verifySmtp, getFromAddress, htmlToText, makeDeduplicationKey };
