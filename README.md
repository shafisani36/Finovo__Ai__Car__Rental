# Finovo AI Car Rental — Enterprise Platform

An enterprise-grade luxury car rental and fleet management system built with **React 19**, **Node.js/Express**, **Prisma ORM**, and **MySQL 8**. Features automated booking quotes, multi-tier dynamic pricing, AI-assisted computer vision damage inspection, and centralized security telemetry.

---

## 1. Quick Start Guide

### Prerequisites
- Node.js v22.x or later
- MySQL 8.x running on port `3306` with database `finovo_car_rental`
- npm v10.x or later

### Setup & Local Development

1. **Install Dependencies:**
   ```bash
   # In backend
   cd backend
   npm install

   # In frontend
   cd ../Frontend
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp backend/.env.example backend/.env
   cp Frontend/.env.example Frontend/.env
   ```
   Fill in `backend/.env`. The full list with comments is in `backend/.env.example`; the minimum for local development:
   ```env
   NODE_ENV=development
   PORT=5000
   DATABASE_URL="mysql://<user>:<password>@localhost:3306/finovo_car_rental"
   JWT_ACCESS_SECRET="<random 64+ character string>"
   JWT_REFRESH_SECRET="<a different random 64+ character string>"
   CORS_ORIGIN="http://localhost:5176"
   ```
   Generate each secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
   Never commit `.env` files.

3. **Create the Database Tables & Seed Data:**
   ```bash
   cd backend
   npx prisma db push
   npx prisma generate
   npm run prisma:seed
   ```
   `prisma:seed` creates the vehicle categories, a development admin account and sample fleet vehicles.
   The development admin login is written in `backend/src/seed_admin.ts`; that demo password is refused in production.

4. **Start Development Servers:**
   ```bash
   # Terminal 1 (Backend on http://localhost:5000)
   cd backend
   npm run dev

   # Terminal 2 (Frontend on http://localhost:5176)
   cd Frontend
   npm run dev
   ```

---

## 2. Production Deployment

### Required backend settings (`backend/.env`)
| Setting | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Production MySQL 8 database with its own user (not root) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Two different random strings, 64+ characters each |
| `CORS_ORIGIN` | The live website address, for example `https://www.your-domain.com` |
| `COOKIE_SECURE` | `true` (the site must be served over HTTPS) |
| `TRUST_PROXY` | `1` when running behind Nginx or a load balancer |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | The first admin account; password 12+ characters, kept private |
| `APP_CURRENCY`, `TAX_RATE_PERCENT`, `TAX_LABEL` | Currency and tax, for example `SAR`, `15`, `VAT` for Saudi Arabia |
| `EMAIL_PROVIDER`, `SMTP_*`, `EMAIL_FROM` | A real mail server, needed for verification codes, password reset and rental agreements |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Live Stripe keys; point the Stripe webhook to `https://<api-domain>/api/v1/payments/stripe/webhook` |
| `GEMINI_API_KEY` (or `OPENAI_API_KEY`) | Needed for the AI damage inspection |
| `MESSAGING_PROVIDER`, `TWILIO_*` | Optional: SMS and WhatsApp messages |
| `SENTRY_DSN` | Optional: error monitoring |

The server refuses to start in production when the JWT secrets or `CORS_ORIGIN` are missing or weak.

### Frontend settings (`Frontend/.env`, read at build time)
| Setting | Value |
|---|---|
| `VITE_API_URL` | `https://<api-domain>/api/v1` |
| `VITE_SITE_URL` | `https://www.your-domain.com` (no trailing slash) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Optional; read from the backend when empty |
| `VITE_SENTRY_DSN` | Optional |

### Deploy steps
```bash
# Backend
cd backend
npm ci --include=dev          # build tools (TypeScript, Prisma CLI) are development packages
npx prisma db push            # creates or updates the tables
npx prisma generate
npm run prisma:seed:production   # vehicle categories + first admin (no demo data)
npm run build
npm start                     # run with a process manager such as PM2 or systemd

# Frontend
cd ../Frontend
npm ci
npm run build                 # serve the Frontend/dist folder as static files
```

### Server checklist
- Serve both the website and the API over HTTPS (for example Nginx with a Let's Encrypt certificate).
- Configure the web server to send every unknown website path to `index.html` (single-page app routing).
- Keep `backend/uploads` (car photos, inspection images) and `backend/storage` (signed rental agreements) on persistent storage and include them in backups.
- Take daily MySQL backups and test restoring one.
- Back up the database before running `npx prisma db push` on an update, and read its warnings before accepting them.
- Rotate any API key that was ever shared outside the server (Stripe, Gemini, SMTP).

---

---

## 3. Test & Build Commands

| Target | Command | Description |
|---|---|---|
| **Backend Build** | `cd backend && npm run build` | Compiles TypeScript with `tsc` |
| **Backend Tests** | `cd backend && npm test` | Runs Argon2id, JWT, session, and OTP test suite |
| **Frontend Build** | `cd Frontend && npm run build` | Compiles with `tsc -b` and builds production bundle with Vite |
| **Frontend Tests** | `cd Frontend && npm test` | Executes API client, error normalization, and caching test suite |
| **Frontend Lint** | `cd Frontend && npm run lint` | Runs `oxlint` static code analysis |

---

## 4. Architecture Documentation Suite

Detailed architectural specifications are located in `docs/architecture/`:

- [**System Architecture Overview**](docs/architecture/overview.md) — System boundaries, client-server responsibilities, and request data flows.
- [**Folder Structure & Guidelines**](docs/architecture/folder-structure.md) — Directory layout, module ownership, and rules for adding new code.
- [**Centralized API Architecture**](docs/architecture/api-architecture.md) — `ApiClient` specification, query caching, mutation invalidation, and step-by-step endpoint guide.
- [**Repository Audit Report**](docs/architecture/repository-audit.md) — Pre-restructuring baseline analysis and architectural findings.
- [**Safe Repository Cleanup Report**](docs/architecture/cleanup-report.md) — Catalog of eliminated dead artifacts with architectural justification.

---

## 5. Key Architectural Features

- **Centralized API Client (`Frontend/src/api/`):** Unified `ApiClient` providing Bearer token management, automatic HttpOnly refresh cookie handling, 15-second request timeouts, request cancellation, request correlation headers (`X-Correlation-Id`), and normalized error handling.
- **Domain API Services (`Frontend/src/api/services/`):** Dedicated typed services for `auth`, `dashboard`, `vehicles`, `vehiclePricing`, `bookings`, `rentals`, `inspections`, `customers`, `branches`, and `admin`.
- **Reactive Query Cache (`Frontend/src/api/cache.ts`):** In-memory cache with stale-time TTL and event-driven invalidation upon mutations (e.g., editing a vehicle or updating pricing automatically invalidates affected cached lists and dashboard metrics).
- **Reusable Data Hooks (`Frontend/src/hooks/`):** `useVehicles`, `useVehicle`, `useVehiclePricing`, `useBookings`, `useDashboardSummary`, `useBranches`, `useCustomers`, and `useVehicleAvailability`.
- **Role-Based Routing:** `RoleMiddlewareRoute` enforces authentication and redirects users based on their role (`/customer/dashboard` for customers, `/admin/dashboard` for fleet staff).
