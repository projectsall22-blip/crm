import Policy from '../models/Policy.js';
import Renewal from '../models/Renewal.js';
import User from '../models/User.js';
import EmailLog from '../models/EmailLog.js';
import EmailRecipient from '../models/EmailRecipient.js';
import { REMINDER_SCHEDULE } from '../models/Renewal.js';
import { sendRawEmail } from '../services/emailService.js';
import { ids } from '../utils/idGenerator.js';

let intervalHandle = null;
const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Ensures a Renewal record exists for every Active policy that is approaching
 * its expiry date, and sends reminder emails per the schedule (90/60/30/15/7 days).
 *
 * Reminder emails are never duplicated — each reminder entry tracks whether it
 * has been sent.
 */
async function processRenewalReminders() {
  const now = new Date();
  const lookaheadDays = 95;
  const cutoff = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

  // Find active / expiring-soon policies within the lookahead window
  const policies = await Policy.find({
    policyStatus: { $in: ['Active', 'Expiring Soon'] },
    expiryDate: { $gte: now, $lte: cutoff },
  }).populate('producerId clientId');

  for (const policy of policies) {
    // Ensure a renewal record exists
    let renewal = await Renewal.findOne({ originalPolicyId: policy._id, status: 'Pending' });
    if (!renewal) {
      const reminders = REMINDER_SCHEDULE.map((days) => ({
        daysBeforeExpiry: days,
        reminderDate: new Date(policy.expiryDate.getTime() - days * 24 * 60 * 60 * 1000),
        sent: false,
        sentAt: null,
      }));
      renewal = await Renewal.create({
        renewalNumber: ids.renewal(),
        originalPolicyId: policy._id,
        clientId: policy.clientId,
        producerId: policy.producerId,
        expiryDate: policy.expiryDate,
        reminders,
        status: 'Pending',
      });
    }

    // Mark policy as "Expiring Soon" if within 30 days
    if (policy.policyStatus === 'Active') {
      const daysToExpiry = Math.ceil((policy.expiryDate - now) / (24 * 60 * 60 * 1000));
      if (daysToExpiry <= 30 && daysToExpiry > 0) {
        policy.policyStatus = 'Expiring Soon';
        await policy.save();
      }
    }

    // Send due reminders that haven't been sent yet
    for (const reminder of renewal.reminders) {
      if (reminder.sent) continue;
      if (reminder.reminderDate > now) continue; // not yet due

      const producer = policy.producerId;
      if (!producer?.email) continue;

      const subject = `Renewal Reminder – Policy ${policy.policyNumber || policy.policyId} expiring in ${reminder.daysBeforeExpiry} days`;
      const html = `<div style="font-family:Arial,sans-serif;padding:24px;color:#1e293b;">
        <h2>Policy Renewal Reminder</h2>
        <p>Policy <strong>${policy.policyNumber || policy.policyId}</strong> for client <strong>${policy.clientId?.firstName || ''} ${policy.clientId?.lastName || ''}</strong> will expire on <strong>${policy.expiryDate.toDateString()}</strong>.</p>
        <p>This is the <strong>${reminder.daysBeforeExpiry}-day</strong> reminder. Please contact the client to initiate renewal.</p>
        <p style="color:#64748b;font-size:12px;">Oracle RMS London North — Automated Renewal Reminder</p>
      </div>`;

      try {
        await sendRawEmail({ to: producer.email, subject, html });

        // Optionally notify managers
        const managers = await User.find({ role: 'manager', isActive: true }).select('email');
        const managerEmails = managers.map((m) => m.email).filter(Boolean);
        if (managerEmails.length) {
          await sendRawEmail({ to: managerEmails, subject, html });
        }

        reminder.sent = true;
        reminder.sentAt = new Date();
      } catch (err) {
        console.warn(`[renewals] Reminder send failed for policy ${policy._id}: ${err.message}`);
      }
    }
    await renewal.save();
  }
}

export function startRenewalReminderJob() {
  if (intervalHandle) return;
  console.log('[renewals] Starting renewal reminder job...');
  intervalHandle = setInterval(processRenewalReminders, POLL_INTERVAL_MS);
  setTimeout(processRenewalReminders, 10000);
}

export function stopRenewalReminderJob() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export { processRenewalReminders };
