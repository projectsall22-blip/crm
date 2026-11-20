import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { config, isProd } from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { requestLogger } from './middleware/auditLogger.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import clientRoutes from './routes/client.routes.js';
import leadRoutes from './routes/lead.routes.js';
import insurerRoutes from './routes/insurer.routes.js';
import productRoutes from './routes/product.routes.js';
import policyRoutes from './routes/policy.routes.js';
import renewalRoutes from './routes/renewal.routes.js';
import taskRoutes from './routes/task.routes.js';
import documentRoutes from './routes/document.routes.js';
import emailRoutes from './routes/email.routes.js';
import reportRoutes from './routes/report.routes.js';
import auditRoutes from './routes/audit.routes.js';
import publicLeadRoutes from './routes/publicLead.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// --- Security & utility middleware ---
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(
  cors({
    origin: config.clientUrl.split(','),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(isProd ? 'combined' : 'dev'));

// --- Static file serving for uploaded documents ---
app.use('/uploads', express.static(path.resolve(__dirname, '..', config.upload.dir)));

// --- Audit request logging ---
app.use(requestLogger);

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- API routes (v1) ---
const v1 = '/api/v1';
app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/users`, userRoutes);
app.use(`${v1}/clients`, clientRoutes);
app.use(`${v1}/leads`, leadRoutes);
app.use(`${v1}/insurers`, insurerRoutes);
app.use(`${v1}/products`, productRoutes);
app.use(`${v1}/policies`, policyRoutes);
app.use(`${v1}/renewals`, renewalRoutes);
app.use(`${v1}/tasks`, taskRoutes);
app.use(`${v1}/documents`, documentRoutes);
app.use(`${v1}/email`, emailRoutes);
app.use(`${v1}/reports`, reportRoutes);
app.use(`${v1}/audit-logs`, auditRoutes);
// Public (no auth) — lead intake form
app.use(`${v1}/public/lead`, publicLeadRoutes);

// --- 404 & error handling ---
app.use(notFound);
app.use(errorHandler);

// --- Start ---
async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`[server] Oracle RMS London North CRM API running on port ${config.port} (${config.env})`);
    console.log(`[server] API base: ${v1}`);
  });

  // Start background workers
  const { startEmailQueueWorker } = await import('./jobs/emailQueue.worker.js');
  startEmailQueueWorker();
  const { startRenewalReminderJob } = await import('./jobs/renewalReminders.job.js');
  startRenewalReminderJob();
}

start().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});

export default app;
