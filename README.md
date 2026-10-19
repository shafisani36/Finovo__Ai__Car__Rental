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

2. **Configure Backend Environment (`backend/.env`):**
   ```env
   NODE_ENV=development
   PORT=5000
   DATABASE_URL="mysql://root:1234@localhost:3306/finovo_car_rental"
   JWT_SECRET="finovo-super-secret-access-token-key-2026-secure-jwt-production"
   JWT_REFRESH_SECRET="finovo-super-secret-refresh-token-key-2026-secure-jwt-production"
   JWT_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   CORS_ORIGIN="http://localhost:5176"
   ```

3. **Database Migrations & Seed:**
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:seed
   ```

4. **Start Development Servers:**
   ```bash
   # Terminal 1 (Backend on http://localhost:5000)
   cd backend
   npm run dev

   # Terminal 2 (Frontend on http://localhost:5176)
   cd Frontend
   npm run dev
   ```

5. **Default Administrative Credentials:**
   - **Email:** `admin@finovo.com`
   - **Password:** `Admin@Finovo2026!`

---

## 2. Test & Build Commands

| Target | Command | Description |
|---|---|---|
| **Backend Build** | `cd backend && npm run build` | Compiles TypeScript with `tsc` |
| **Backend Tests** | `cd backend && npm test` | Runs Argon2id, JWT, session, and OTP test suite |
| **Frontend Build** | `cd Frontend && npm run build` | Compiles with `tsc -b` and builds production bundle with Vite |
| **Frontend Tests** | `cd Frontend && npm test` | Executes API client, error normalization, and caching test suite |
| **Frontend Lint** | `cd Frontend && npm run lint` | Runs `oxlint` static code analysis |

---

## 3. Architecture Documentation Suite

Detailed architectural specifications are located in `docs/architecture/`:

- [**System Architecture Overview**](docs/architecture/overview.md) — System boundaries, client-server responsibilities, and request data flows.
- [**Folder Structure & Guidelines**](docs/architecture/folder-structure.md) — Directory layout, module ownership, and rules for adding new code.
- [**Centralized API Architecture**](docs/architecture/api-architecture.md) — `ApiClient` specification, query caching, mutation invalidation, and step-by-step endpoint guide.
- [**Repository Audit Report**](docs/architecture/repository-audit.md) — Pre-restructuring baseline analysis and architectural findings.
- [**Safe Repository Cleanup Report**](docs/architecture/cleanup-report.md) — Catalog of eliminated dead artifacts with architectural justification.

---

## 4. Key Architectural Features

- **Centralized API Client (`Frontend/src/api/`):** Unified `ApiClient` providing Bearer token management, automatic HttpOnly refresh cookie handling, 15-second request timeouts, request cancellation, request correlation headers (`X-Correlation-Id`), and normalized error handling.
- **Domain API Services (`Frontend/src/api/services/`):** Dedicated typed services for `auth`, `dashboard`, `vehicles`, `vehiclePricing`, `bookings`, `rentals`, `inspections`, `customers`, `branches`, and `admin`.
- **Reactive Query Cache (`Frontend/src/api/cache.ts`):** In-memory cache with stale-time TTL and event-driven invalidation upon mutations (e.g., editing a vehicle or updating pricing automatically invalidates affected cached lists and dashboard metrics).
- **Reusable Data Hooks (`Frontend/src/hooks/`):** `useVehicles`, `useVehicle`, `useVehiclePricing`, `useBookings`, `useDashboardSummary`, `useBranches`, `useCustomers`, and `useVehicleAvailability`.
- **Role-Based Routing:** `RoleMiddlewareRoute` enforces authentication and redirects users based on their role (`/customer/dashboard` for customers, `/admin/dashboard` for fleet staff).
