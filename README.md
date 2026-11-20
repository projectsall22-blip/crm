# Oracle RMS London North — CRM v1.2

A complete, production-ready CRM for **Oracle RMS London North** built with React, Node.js/Express, and MongoDB Atlas. Supports multiple producers, centralized management, client ownership, lead pipelines with selective email routing, automated email notifications, policy registration, premium and tax management, payments, commissions, renewals, and reporting.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Database Setup (MongoDB Atlas)](#database-setup-mongodb-atlas)
7. [Running Locally](#running-locally)
8. [Windows & macOS Desktop Access](#windows--macos-desktop-access)
9. [PWA Installation](#pwa-installation)
10. [Deployment](#deployment)
    - [Backend → Render](#backend--render)
    - [Frontend → Vercel](#frontend--vercel)
11. [Default Credentials](#default-credentials)
12. [Environment Variables Reference](#environment-variables-reference)
13. [API Reference](#api-reference)
14. [User Roles & Permissions](#user-roles--permissions)
15. [Email Automation Guide](#email-automation-guide)
16. [Acceptance Criteria Verification](#acceptance-criteria-verification)
17. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Devices                          │
│   Windows PC / macOS / Any browser (via internet URL)       │
│   OR: PWA installed on desktop (Add to Home Screen)         │
└──────────────────────┬──────────────────────────────────────┘
                       │  HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│          Frontend (React + Vite)                            │
│          Deployed: Vercel / CDN                             │
│          Tailwind CSS · React Router · Recharts             │
│          Lucide Icons · Axios + JWT token management        │
└──────────────────────┬──────────────────────────────────────┘
                       │  REST API /api/v1
┌──────────────────────▼──────────────────────────────────────┐
│          Backend (Node.js + Express)                        │
│          Deployed: Render / Railway / VPS                   │
│          JWT Auth · RBAC · Ownership enforcement            │
│          Nodemailer SMTP · Background email queue           │
│          Renewal reminder job · Multer file uploads         │
└──────────────────────┬──────────────────────────────────────┘
                       │  Mongoose ODM
┌──────────────────────▼──────────────────────────────────────┐
│          MongoDB Atlas (Cloud)                              │
│          17 Collections · Indexes · Validation              │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | 18.x LTS | [nodejs.org](https://nodejs.org) |
| npm | 9.x | Bundled with Node.js |
| MongoDB Atlas account | — | Free M0 tier is sufficient to start |
| Git | Any | Optional for cloning |

---

## Project Structure

```
CRM/
├── backend/                   Node.js / Express API
│   ├── src/
│   │   ├── config/            env.js, db.js
│   │   ├── controllers/       One controller per resource
│   │   ├── jobs/              Email queue worker, renewal reminders
│   │   ├── middleware/        auth, rbac, ownership, validate, rateLimiter, audit
│   │   ├── models/            17 Mongoose models
│   │   ├── routes/            One router per resource
│   │   ├── services/          emailService, emailRouter, emailAutomation
│   │   └── utils/             asyncHandler, errors, jwt, pagination, idGenerator, seed
│   ├── uploads/               Document uploads (created on first run)
│   ├── .env.example
│   └── package.json
│
└── frontend/                  React + Vite SPA
    ├── public/                manifest.json, sw.js, favicon.svg
    ├── src/
    │   ├── components/        ui.jsx (design system), layout/, ProtectedRoute
    │   ├── context/           AuthContext.jsx
    │   ├── pages/             All page components
    │   └── services/          api.js (Axios + interceptors)
    ├── .env.example
    └── package.json
```

---

## Backend Setup

### 1. Install dependencies

```bash
cd CRM/backend
npm install
```

### 2. Create the environment file

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `backend/.env` and fill in every value. The required fields are:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/crm?retryWrites=true&w=majority
JWT_SECRET=<at-least-32-random-characters>
JWT_REFRESH_SECRET=<another-32-random-characters>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_app_password          # Gmail: use an App Password, not your login password
SMTP_FROM_ADDRESS=noreply@yourcompany.com
```

> **Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App Passwords. Generate one for "Mail / Other" and paste it as `SMTP_PASS`.
>
> **Microsoft 365**: Set `SMTP_HOST=smtp.office365.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`.

### 3. Seed the database

```bash
npm run seed
```

This creates the default admin, a sample manager, a sample producer, default email recipients, 4 email templates, 5 automation rules, a sample insurer, and a sample product.

---

## Frontend Setup

### 1. Install dependencies

```bash
cd CRM/frontend
npm install
```

### 2. Create the environment file

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

For local development leave `VITE_API_URL` blank — Vite proxies `/api` to `http://localhost:5000` automatically.

For production point it at your deployed backend:

```
VITE_API_URL=https://your-backend.onrender.com
```

---

## Database Setup (MongoDB Atlas)

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a **free M0 cluster** (any region close to your users).
3. Under **Database Access** create a user with **Read and Write to Any Database**.
4. Under **Network Access** add `0.0.0.0/0` (allow from anywhere) or your server IP.
5. Under **Clusters → Connect → Connect your application** copy the connection string and paste it as `MONGODB_URI` in `backend/.env`.

Mongoose creates all collections and indexes automatically on first startup.

---

## Running Locally

Open **two terminals** (or two PowerShell windows):

**Terminal 1 — Backend**

```bash
cd CRM/backend
npm run dev
```

Expected output:

```
[db] MongoDB connected
[server] Oracle RMS London North CRM API running on port 5000 (development)
[emailQueue] Starting background email queue worker...
[renewals] Starting renewal reminder job...
```

**Terminal 2 — Frontend**

```bash
cd CRM/frontend
npm run dev
```

Expected output:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

Open **http://localhost:5173** in your browser and log in with the seed credentials.

---

## Windows & macOS Desktop Access

Because the backend is a central cloud server and the frontend is a standard web SPA:

| Scenario | How to access |
|----------|---------------|
| Local dev (single machine) | `http://localhost:5173` |
| LAN access from another laptop | `http://<your-machine-ip>:5173` |
| Internet access (deployed) | `https://your-crm.vercel.app` |
| All team members, any OS | Same deployed URL — same database |

No special desktop software is required. Any modern browser on Windows or macOS works identically because all data lives in MongoDB Atlas.

---

## PWA Installation

The CRM ships with a full PWA manifest and service worker, making it installable as a desktop app on both Windows and macOS without Electron.

### Chrome / Edge (Windows & macOS)

1. Open the deployed CRM URL.
2. Click the install icon in the address bar (or the browser menu → **Install Oracle RMS London North**).
3. The app opens in its own window, with no browser chrome, like a native app.
4. It appears in your Start Menu (Windows) or Applications folder (macOS).

### Safari (macOS / iOS)

1. Open the CRM URL in Safari.
2. Click **Share** → **Add to Dock** (macOS Sonoma+) or **Add to Home Screen**.

All desktop PWA clients connect to the same centralized backend and database — there is no data isolation between devices.

---

## Deployment

### Backend → Render

1. Create a free account at [render.com](https://render.com).
2. **New → Web Service** → connect your Git repository (or upload).
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Environment**: Node
4. Add all variables from `backend/.env` in the **Environment** tab.
5. After the first deploy, run the seed script once from the Render **Shell**:
   ```bash
   node src/utils/seed.js
   ```
6. Copy the service URL (e.g. `https://insurance-crm-api.onrender.com`).

### Frontend → Vercel

1. Create a free account at [vercel.com](https://vercel.com).
2. **New Project** → import your repository.
3. Set:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL` = your Render backend URL (no trailing slash)
5. Deploy. Vercel provides a `.vercel.app` URL with HTTPS.

> **CORS**: The backend `CLIENT_URL` env var must match your Vercel frontend URL exactly (e.g. `https://insurance-crm.vercel.app`). Multiple origins are comma-separated.

### Alternative Hosting

| Service | Backend | Frontend |
|---------|---------|----------|
| Railway | ✅ | — |
| Fly.io | ✅ | — |
| DigitalOcean App Platform | ✅ | ✅ |
| Netlify | — | ✅ |
| AWS / GCP / Azure | ✅ | ✅ |

---

## Default Credentials

> **Change all passwords immediately after first login in production.**

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@brokerage.com | ChangeMe123! |
| Manager | manager@brokerage.com | Manager123! |
| Producer | producer@brokerage.com | Producer123! |

These are configured via `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` in `backend/.env`.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | No | API port (default: 5000) |
| `CLIENT_URL` | Yes | Frontend URL (CORS origin) |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Access token signing secret (≥32 chars) |
| `JWT_EXPIRES_IN` | No | Access token TTL (default: 15m) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret (≥32 chars) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token TTL (default: 7d) |
| `SMTP_HOST` | Yes | SMTP server hostname |
| `SMTP_PORT` | Yes | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_SECURE` | No | `true` for port 465 SSL (default: false) |
| `SMTP_USER` | Yes | SMTP authentication username |
| `SMTP_PASS` | Yes | SMTP authentication password / app password |
| `SMTP_FROM_NAME` | No | Display name for outgoing emails |
| `SMTP_FROM_ADDRESS` | Yes | From address for outgoing emails |
| `UPLOAD_DIR` | No | Local document upload directory (default: ./uploads) |
| `MAX_UPLOAD_MB` | No | Max upload file size in MB (default: 15) |
| `DEFAULT_ADMIN_EMAIL` | No | Seed script admin email |
| `DEFAULT_ADMIN_PASSWORD` | No | Seed script admin password |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend base URL. Leave blank for local dev (Vite proxy handles it). Set for production. |

---

## API Reference

All endpoints are prefixed with `/api/v1`. Every endpoint requires a valid JWT Bearer token except `/auth/login`, `/auth/refresh`, and `/auth/forgot-password`.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/logout` | Invalidate refresh token |
| POST | `/auth/refresh` | Rotate access token using refresh cookie |
| POST | `/auth/forgot-password` | Send password reset email |
| GET | `/auth/me` | Get authenticated user profile |

### Users

| Method | Endpoint | Roles |
|--------|----------|-------|
| GET | `/users` | All (scoped) |
| GET | `/users/:id` | All (scoped) |
| POST | `/users` | Admin |
| PUT | `/users/:id` | Admin / self |
| DELETE | `/users/:id` | Admin |

### Clients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/clients` | List (producer-scoped) |
| GET | `/clients/:id` | Full profile with related records |
| POST | `/clients` | Create |
| PUT | `/clients/:id` | Update |
| POST | `/clients/:id/assign` | Assign to producer (Admin) |
| GET | `/clients/duplicates/check` | Check for duplicate email/phone |
| DELETE | `/clients/:id` | Soft-delete |

### Leads

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leads` | List with filters |
| GET | `/leads/kanban` | Kanban pipeline grouped by status |
| GET | `/leads/stats` | Status counts + conversion rate |
| GET | `/leads/:id` | Lead detail + email logs |
| POST | `/leads` | Create (with optional email notification) |
| PUT | `/leads/:id` | Update |
| PATCH | `/leads/:id/status` | Change status only |
| POST | `/leads/:id/won` | Mark Won → triggers policy registration |
| POST | `/leads/:id/lost` | Mark Lost |
| POST | `/leads/:id/followup` | Add follow-up note |
| GET | `/leads/:id/email-logs` | Email history for lead |
| POST | `/leads/:id/send-email` | Manual selective email send |
| DELETE | `/leads/:id` | Delete (if no policy) |

### Policies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/policies` | List (producer-scoped) |
| GET | `/policies/stats` | Status/payment counts |
| GET | `/policies/:id` | Detail + payments + commissions |
| POST | `/policies` | Register (Won-to-Policy workflow) |
| PUT | `/policies/:id` | Update |
| POST | `/policies/:id/issue` | Issue → mark Active |
| POST | `/policies/:id/cancel` | Cancel |
| DELETE | `/policies/:id` | Delete (Draft only) |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payments` | List |
| GET | `/payments/overdue` | Overdue payments only |
| POST | `/payments` | Add payment |
| PUT | `/payments/:id` | Update |
| DELETE | `/payments/:id` | Delete |

### Commissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/commissions` | List |
| GET | `/commissions/stats` | Totals by status |
| POST | `/commissions` | Create |
| PUT | `/commissions/:id` | Update |
| POST | `/commissions/:id/approve` | Approve (Admin/Manager) |
| POST | `/commissions/:id/mark-paid` | Mark Paid (Admin/Manager) |

### Renewals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/renewals` | List |
| GET | `/renewals/stats` | Upcoming pipeline counts |
| GET | `/renewals/:id` | Detail |
| POST | `/renewals` | Create renewal record |
| POST | `/renewals/:id/process` | Process renewal (new policy term) |

### Email

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/email/recipients` | List recipients |
| POST | `/email/recipients` | Create (Admin) |
| PUT | `/email/recipients/:id` | Update (Admin) |
| DELETE | `/email/recipients/:id` | Deactivate (Admin) |
| GET | `/email/templates` | List templates |
| POST | `/email/templates` | Create (Admin) |
| PUT | `/email/templates/:id` | Update (Admin) |
| GET | `/email/rules` | List rules (Admin) |
| POST | `/email/rules` | Create rule (Admin) |
| PUT | `/email/rules/:id` | Update rule (Admin) |
| PATCH | `/email/rules/:id/toggle` | Enable/disable rule (Admin) |
| GET | `/email/logs` | List email logs |
| GET | `/email/logs/stats` | Delivery statistics |
| GET | `/email/logs/:id` | Log detail |
| POST | `/email/logs/:id/retry` | Retry failed email |
| GET | `/email/fields` | Available selective routing fields |
| GET | `/email/verify-smtp` | Test SMTP connection (Admin) |
| POST | `/email/send` | Manual ad-hoc send |

### Reports

| Method | Endpoint | Roles |
|--------|----------|-------|
| GET | `/reports/overview` | All (scoped) |
| GET | `/reports/producers` | Admin, Manager |

### Other

| Endpoint | Description |
|----------|-------------|
| `GET /audit-logs` | Audit log list (Admin) |
| `GET /insurers` | Insurer list |
| `GET /products` | Product list |
| `GET /tasks` | Task list |
| `GET /documents` | Document list |
| `POST /documents/upload` | File upload (multipart/form-data) |
| `GET /documents/:id/download` | Download file |
| `GET /health` | Health check (no auth) |

---

## User Roles & Permissions

Permissions are enforced on the **backend**, not just hidden in the UI.

| Feature | Admin | Manager | Producer |
|---------|:-----:|:-------:|:--------:|
| Manage users | ✅ | — | — |
| View all clients | ✅ | ✅ | Own only |
| Create clients | ✅ | ✅ | ✅ (auto-owns) |
| Assign/reassign clients | ✅ | — | — |
| View all leads | ✅ | ✅ | Own only |
| Create leads | ✅ | ✅ | ✅ |
| Mark Won/Lost | ✅ | ✅ | ✅ (own) |
| Register policies | ✅ | ✅ | ✅ (own) |
| View all policies | ✅ | ✅ | Own only |
| Issue/cancel policies | ✅ | ✅ | ✅ (own) |
| Approve commissions | ✅ | ✅ | — |
| Manage insurers/products | ✅ | — | — |
| Email management (settings) | ✅ | — | — |
| View email logs | ✅ | ✅ | ✅ |
| View all reports | ✅ | ✅ | Own only |
| View audit logs | ✅ | — | — |

**Producer isolation**: Producer A can never read, update, or delete records owned by Producer B. This is enforced at the database query level in every controller.

---

## Email Automation Guide

### Selective Field Routing

When creating a lead or sending a manual email, the sender selects which fields appear in the email. Unselected fields are **never** placed in the email payload — the selection happens in `emailRouter.js:selectFields()` before rendering.

**Available fields**: Client Name, Client Email, Phone, Insurance Type, Lead Source, Expected Premium, Currency, Producer Name, Lead Status, Additional Notes, Follow-up Date, Selected Documents.

### Automation Rules (5 defaults seeded)

| Rule | Trigger | Recipients |
|------|---------|-----------|
| Notify Manager on New Producer Lead | Producer creates lead | Manager |
| Notify Producer on Admin-Created Lead | Admin creates lead | Assigned Producer |
| Notify on Lead Won | Lead marked Won | Manager |
| Notify on Lead Lost | Lead marked Lost | Manager |
| Notify New Producer on Assignment | Lead reassigned | New Producer |

Activate or deactivate rules at **Settings → Email Management → Rules**.

### Email Queue

Emails are not sent synchronously. They are saved to `EmailLog` with status `Pending` and processed by the background worker (`emailQueue.worker.js`) every 15 seconds. This means:

- **A failed email never loses the lead record** — the lead and email log are independent.
- Failed emails retry up to 3 times with exponential back-off.
- You can manually retry any failed email from **Email Logs → Retry**.
- Deduplication prevents duplicate emails for the same action (checked via `deduplicationKey`).

### Configure SMTP

SMTP credentials live **only in `backend/.env`** and are never sent to or stored in the frontend. After changing `.env`, restart the backend. Test the connection at **Settings → Email Management → SMTP Settings → Test SMTP Connection**.

---

## Acceptance Criteria Verification

| # | Requirement | Where implemented |
|---|------------|-------------------|
| 1 | Admin can manage Producers | `GET/POST/PUT/DELETE /users` (adminOnly) |
| 2 | Manager can view all company records | `manager` role returns unscoped queries in all controllers |
| 3 | Producer can only view assigned records | `scopeFilter()` in every controller; tested via ownership assertions |
| 4 | Producer-created clients auto-belong to that Producer | `client.controller.js:createClient` sets `ownerProducerId = req.user._id` |
| 5 | Admin can assign and reassign clients | `POST /clients/:id/assign` (adminOnly) + ownership history log |
| 6 | Lead statuses work correctly | 8 statuses in `Lead.js` model; PATCH `/leads/:id/status` |
| 7 | Marking Won opens policy registration | `POST /leads/:id/won` → `policyRegistrationRequired: true`; frontend redirects to `/policies/register/:leadId` |
| 8 | Policy Issuance Pending | `createPolicy` falls back to `Policy Issuance Pending` if `policyNumber` or `issueDate` absent; `POST /policies/:id/issue` promotes to Active |
| 9 | Premium/tax calculations correct | `policy.recalculateTotal()`: `base + taxes + fees − discounts`; computed server-side |
| 10 | Payments and overdue detection | `updatePolicyPaymentStatus()` runs after every payment; compares `dueDate < now` |
| 11 | Commissions calculate and track correctly | `commission.calculateAmount()` for percentage/fixed; approval workflow with history |
| 12 | Renewal reminders do not duplicate | `renewalReminders.job.js` checks `reminder.sent` flag before sending |
| 13 | Email routing sends only selected information | `selectFields(fieldMap, selectedFields)` strips all unselected fields before rendering |
| 14 | Custom email addresses work | `resolveManualRecipients()` validates regex and accepts raw email strings |
| 15 | Automatic email rules work | `processAutomationRules(triggerEvent, lead, user)` called after every lead lifecycle event |
| 16 | Email delivery logs maintained | `EmailLog` collection; full log in **Email Logs** UI |
| 17 | Failed emails can be retried | `POST /email/logs/:id/retry` resets status to `Pending`; worker re-delivers |
| 18 | Email failure does not delete lead | Email logs and leads are separate collections; failures only update `EmailLog.status` |
| 19 | Windows and macOS users access same cloud CRM | Single backend + MongoDB Atlas; any browser connects |
| 20 | All permissions enforced on backend | RBAC middleware (`authorize()`), scope filters, `assertOwnership()` on every sensitive route |

---

## Troubleshooting

### "Cannot connect to MongoDB"

- Verify `MONGODB_URI` in `backend/.env` is complete and correctly encoded.
- Check MongoDB Atlas **Network Access** — ensure your IP or `0.0.0.0/0` is whitelisted.
- If using a cluster password with special characters, URL-encode them.

### "Invalid or expired token" on page refresh

- The frontend auto-refreshes the access token using the refresh cookie. If the cookie is missing (cross-site), set `SMTP_SECURE=false` and ensure `CLIENT_URL` matches the exact frontend origin in `backend/.env`.

### Emails not sending

1. Check **Settings → Email Management → SMTP Settings → Test SMTP Connection**.
2. For Gmail, use an **App Password** (not your Gmail login password). Enable 2FA first.
3. Check `backend/.env` for `SMTP_USER` and `SMTP_PASS`.
4. View failed emails at **Email Logs** and use **Retry**.

### File uploads fail

- Ensure `UPLOAD_DIR` in `backend/.env` points to a writable directory.
- The directory is created automatically on startup. If running on a hosted service, verify the filesystem is writable (Render: use a persistent disk).

### Frontend shows blank after deploy

- Confirm `VITE_API_URL` in `frontend/.env` points to your deployed backend (no trailing slash).
- Check the browser console for CORS errors. Update `CLIENT_URL` in the backend env to match your Vercel URL.

### Seed script fails

- Run only once. If you re-run on an existing database it skips existing records (idempotent).
- If the admin password requirement changes, update `DEFAULT_ADMIN_PASSWORD` in `.env` before seeding.

---

## Development Commands

```bash
# Backend
npm run dev      # Start with nodemon (auto-reload)
npm run seed     # Seed database with defaults
npm start        # Production start (no auto-reload)

# Frontend
npm run dev      # Vite dev server with HMR
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

---

## Security Notes

- JWT secrets must be at least 32 random characters in production.
- SMTP credentials are stored only in backend environment variables — never in frontend code or database.
- Document downloads are authenticated (JWT required) and served from outside the web root.
- All sensitive fields (`password`, `refreshTokenHash`, `resetTokenHash`) are stripped from API responses via `toSafeObject()`.
- Rate limiting is applied globally (1000/15 min) and tightly on auth endpoints (30/15 min).
- Input validation is applied on every write endpoint using `express-validator`.
- Producer isolation is enforced at the MongoDB query level, not just in the UI.

---

*Oracle RMS London North CRM v1.2 — Built per SRS v1.1 extended with Lead Email Automation and Selective Email Data Routing (v1.2 requirements).*
