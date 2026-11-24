import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { BrevoClient } from '@getbrevo/brevo';
import { config } from '../config/env.js';

// ── Brevo API client (HTTP — no port issues on Render) ─────────
let brevoClient = null;
function getBrevoClient() {
  if (!brevoClient && config.brevo.apiKey) {
    brevoClient = new BrevoClient({ apiKey: config.brevo.apiKey });
  }
  return brevoClient;
}

// ── Resend client (HTTP fallback) ─────────────────────────────
let resendClient = null;
function getResendClient() {
  if (!resendClient && config.resend.apiKey) {
    resendClient = new Resend(config.resend.apiKey);
  }
  return resendClient;
}

// ── Nodemailer transporter (last fallback) ────────────────────
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });
  return transporter;
}

/**
 * Send email:
 * 1. Brevo API (if BREVO_API_KEY set)
 * 2. Resend API (if RESEND_API_KEY set)
 * 3. SMTP nodemailer (fallback)
 */
export async function sendRawEmail({ to, cc = [], bcc = [], subject, html, text }) {
  const toList = Array.isArray(to) ? to : [to];

  // ── 1. Brevo API ─────────────────────────────────────────────
  const brevo = getBrevoClient();
  if (brevo) {
    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: config.brevo.fromName, email: config.brevo.fromAddress },
      to:      toList.map((e) => ({ email: e })),
      cc:      cc.length  ? cc.map((e)  => ({ email: e })) : undefined,
      bcc:     bcc.length ? bcc.map((e) => ({ email: e })) : undefined,
      subject,
      htmlContent:  html,
      textContent: text || htmlToText(html),
    });
    return { messageId: result.messageId || 'brevo-ok' };
  }

  // ── 2. Resend API ────────────────────────────────────────────
  const resend = getResendClient();
  if (resend) {
    const from   = `${config.resend.fromName} <${config.resend.fromAddress}>`;
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

  // ── 3. SMTP fallback ─────────────────────────────────────────
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

export async function verifySmtp() {
  if (config.brevo.apiKey)  return { ok: true, message: 'Brevo API configured — HTTP email ready.' };
  if (config.resend.apiKey) return { ok: true, message: 'Resend API configured — HTTP email ready.' };

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
  if (config.brevo.apiKey)  return `"${config.brevo.fromName}" <${config.brevo.fromAddress}>`;
  if (config.resend.apiKey) return `"${config.resend.fromName}" <${config.resend.fromAddress}>`;
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
