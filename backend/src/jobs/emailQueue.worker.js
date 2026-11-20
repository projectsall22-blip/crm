import EmailLog from '../models/EmailLog.js';
import { sendRawEmail } from '../services/emailService.js';

let workerRunning = false;
let intervalHandle = null;

const POLL_INTERVAL_MS = 15000; // 15 seconds
const BATCH_SIZE = 25;
const RETRY_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes between retries

/**
 * Background worker that drains the email queue.
 * Picks up Pending and Retrying emails whose nextRetryAt has passed,
 * attempts delivery, updates status, and schedules retries on failure.
 *
 * Never deletes the lead if email delivery fails — only the EmailLog is updated.
 */
async function processQueue() {
  if (workerRunning) return;
  workerRunning = true;

  try {
    const now = new Date();
    const emails = await EmailLog.find({
      status: { $in: ['Pending', 'Retrying'] },
      $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
    })
      .limit(BATCH_SIZE)
      .sort({ createdAt: 1 });

    for (const log of emails) {
      if (log.status === 'Failed' && log.retryCount >= log.maxRetries) continue;

      try {
        await sendRawEmail({
          to: log.recipients,
          cc: log.cc,
          bcc: log.bcc,
          subject: log.subject,
          html: log.bodyHtml,
        });
        log.status = 'Sent';
        log.sentDate = new Date();
        log.errorMessage = '';
        log.nextRetryAt = null;
        await log.save();
      } catch (err) {
        log.retryCount += 1;
        log.errorMessage = err.message;

        if (log.retryCount >= log.maxRetries) {
          log.status = 'Failed';
          log.nextRetryAt = null;
        } else {
          log.status = 'Retrying';
          log.nextRetryAt = new Date(Date.now() + RETRY_BACKOFF_MS * log.retryCount);
        }
        await log.save();
        console.warn(`[emailQueue] Email ${log.logId} failed (attempt ${log.retryCount}): ${err.message}`);
      }
    }
  } catch (err) {
    console.error('[emailQueue] Worker error:', err.message);
  } finally {
    workerRunning = false;
  }
}

/**
 * Starts the background email queue worker on an interval.
 */
export function startEmailQueueWorker() {
  if (intervalHandle) return;
  console.log('[emailQueue] Starting background email queue worker...');
  intervalHandle = setInterval(processQueue, POLL_INTERVAL_MS);
  // Also process immediately on startup
  setTimeout(processQueue, 3000);
}

export function stopEmailQueueWorker() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export { processQueue };
