# Finovo AI Car Rental — Repository Architecture Audit & Baseline Report

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-18  
**Auditor:** Principal Enterprise Software Architect  
**Repository:** Finovo AI Car Rental (`c:\Users\TNC\Desktop\Finovo_Ai_Car_Rental`)  
**Deployment Model:** Decoupled Monorepo (Node.js + Express + Prisma + MySQL Backend / React 19 + TypeScript + Vite Frontend)

---

## 1. Executive Summary

This comprehensive repository audit evaluates the architecture, folder structure, API communication patterns, security controls, database models, and build stability of the **Finovo AI Car Rental System**.

The repository is divided into two primary sub-projects:
1. `backend/`: Production-ready TypeScript/Express modular monolith powered by Prisma ORM and MySQL 8, featuring Argon2id password hashing, rotating JWT access & refresh tokens with database-backed session revocation, and role-based access control (RBAC).
2. `Frontend/`: Modern React 19 single-page application built with Vite and TypeScript, featuring a luxury purple/gold design system (`#1A0322`, `#6C1E84`, `#FAB826`), role-guarded routing, and administrative consoles for fleet, bookings, rentals, customers, branches, and AI computer vision inspections.

Both projects compile with **zero build errors** (`tsc` on backend, `vite build` on frontend) and **100% test pass rate** on the core authentication suite. However, key architectural weaknesses exist around API client scattering, missing domain abstraction layers, empty scaffolded directory bloat (over 300 empty `.gitkeep` directories), and slight directory naming divergences (`customer` vs `customers`).

---

## 2. Technology Stack & Runtime Environment

| Domain | Technology / Library | Version | Purpose |
|---|---|---|---|
| **Backend Runtime** | Node.js / tsx | Node v22+ | Server-side execution and live dev server |
| **Backend Framework** | Express.js | 4.21.2 | Modular REST API routing & middleware |
| **Database & ORM** | MySQL 8 / Prisma ORM | Prisma 6.4.1 | Relational database schema, migrations, and queries |
| **Security & Hashing** | Argon2 / crypto | argon2 0.41.1 | Secure password hashing (Argon2id) and SHA-256 tokens |
| **Authentication** | jsonwebtoken / cookie-parser | jwt 9.0.2 | Short-lived JWTs (15m) + HttpOnly refresh cookies (7d) |
| **Validation** | Zod | 3.24.2 | Runtime schema validation for requests and payloads |
| **Rate Limiting** | express-rate-limit | 7.5.0 | Anti-abuse protection on auth endpoints |
| **Frontend Framework** | React 19 | 19.2.8 | Declarative component UI |
| **Frontend Build Tool** | Vite | 8.3.0 | Next-gen lightning-fast dev server and bundler |
| **Language & Typing** | TypeScript | 5.8 (BE), 6.0 (FE) | Strict enterprise static typing |
| **Routing** | React Router DOM | 7.18.4 | Declarative client-side routing & navigation guards |
| **UI Icons & Visuals** | Lucide React | 1.58.0 | Vector icons |
| **Animations & Smooth Scroll** | GSAP, Lenis | 3.15 / 1.3 | Micro-interactions and smooth page dynamics |
| **Styling** | Custom Vanilla CSS | CSS3 Variables | Premium token-based design system (no Tailwind) |

---

## 3. Baseline Build & Test Health

Prior to any architectural restructuring, baseline health checks were conducted:

1. **Backend Compilation (`npm run build` in `backend`):**
   - Command: `tsc`
   - Result: **0 errors, Exit code 0**.
2. **Backend Automated Test Suite (`npm test` in `backend`):**
   - Command: `tsx tests/unit/auth.test.ts`
   - Test Count: **8 tests executed**.
   - Result: **8 passed, 0 failed, Exit code 0**.
   - Verified areas: Argon2id password hashing, SHA-256 token hashing, JWT issuance and decoding, MySQL user creation with role assignments, session persistence, token rotation, password reset OTP flow, and session revocation.
3. **Frontend Compilation (`npm run build` in `Frontend`):**
   - Command: `tsc -b && vite build`
   - Result: **0 errors, Exit code 0**. 2012 modules transformed cleanly.
4. **Frontend Static Linting (`npm run lint` in `Frontend`):**
   - Command: `oxlint`
   - Result: **0 errors**, 30 React Compiler optimization hints/warnings across 88 files.

---

## 4. Current Repository Folder Structure

```text
Finovo_Ai_Car_Rental/
├── backend/
│   ├── .env                      # Database credentials, JWT secrets, CORS config
│   ├── package.json              # Backend dependencies and scripts
│   ├── tsconfig.json             # TypeScript configuration (target ES2022)
│   ├── dist/                     # Compiled JavaScript build output
│   ├── prisma/
│   │   └── schema.prisma         # 18 Prisma relational models & enums
│   ├── uploads/                  # Permanent vehicle image upload storage
│   ├── tests/
│   │   └── unit/auth.test.ts     # Automated auth integration test
│   └── src/
│       ├── server.ts             # Application entry point & graceful shutdown
│       ├── bootstrap/app.ts      # Express setup, CORS, static uploads, routers
│       ├── config/env.config.ts  # Validated environment configuration
│       ├── infrastructure/
│       │   ├── prisma/           # Prisma client, seed.ts, seed_operational.ts
│       │   └── email/            # Email verification & OTP mock delivery
│       ├── middleware/           # authenticate, authorize, error-handler, rate-limiter
│       ├── security/             # Argon2 password service, JWT service, token hash
│       ├── shared/errors/        # AppError domain error classes
│       ├── api/routes/           # 10 route modules (auth, vehicle, booking, etc.)
│       └── modules/              # Domain logic (auth, fleet, bookings, rentals, etc.)
│
└── Frontend/
    ├── .gitignore
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── public/cars/              # Vehicle image library (Porsche, BMW, Audi, etc.)
    └── src/
        ├── App.tsx               # Root component wrapping AppRouter
        ├── main.tsx              # DOM mount point
        ├── app/
        │   ├── layouts/          # RootLayout, AdminLayout
        │   └── router/           # AppRouter.tsx with complete route table
        ├── components/
        │   ├── common/           # BrandLogo, Button, Badge, SectionHeading
        │   └── layout/           # Header, Footer
        ├── styles/               # tokens.css, base.css
        └── features/             # Feature domains (auth, fleet, bookings, etc.)
            ├── audit-logs/
            ├── auth/
            ├── bookings/
            ├── branches/
            ├── customer/         # Singular: CustomerDashboardPage.tsx
            ├── customers/        # Plural: CustomersListPage.tsx
            ├── dashboard/
            ├── employees/
            ├── fleet/
            ├── home/
            ├── inspections/
            └── rentals/
```

---

## 5. Architectural Findings & Weaknesses

### 5.1 Frontend API Communication Scatter
- **Absence of a Central API Layer:** Network communication was centered around `Frontend/src/features/auth/api/authClient.ts`. Other features (`fleet`, `bookings`, `branches`, `rentals`) directly imported `authClient` across relative paths (`../../auth/api/authClient`).
- **No Domain Service Modularity:** Vehicle pricing and rental policy logic was embedded directly into `fleetApi.ts` without an independent `vehiclePricing.api.ts` module.
- **Missing Hook-Based Data Fetching Layer:** Several page components were performing manual `fetch` calls and state tracking in inline `useEffect` hooks rather than consuming centralized, testable hooks (`useVehicles`, `useVehicle`, `useBookings`, etc.).
- **Absence of Mutation Cache Invalidation:** After performing vehicle edits, status updates, or bookings, pages relied on manual re-fetch triggers rather than a coherent query cache invalidation pattern.

### 5.2 Folder & Naming Irregularities
- **`customer` vs `customers`:** Customer Portal was located in `src/features/customer/pages/CustomerDashboardPage.tsx`, whereas Admin CRM customer directory was located in `src/features/customers/pages/CustomersListPage.tsx`.
- **Obsolete Early Prototype Files:**
  - `Frontend/src/features/auth/pages/DashboardPage.tsx` (698 lines): An unrouted, early development prototype that merged customer sessions and admin audit logs into one screen prior to the implementation of `AdminDashboardPage` and `CustomerDashboardPage`.
  - `Frontend/src/features/auth/guards/RoleRoute.tsx` and `ProtectedRoute.tsx`: Unused legacy route guards superseded by `RoleMiddlewareRoute.tsx`.
- **Scaffolded Empty Folder Bloat:** Over 319 directories across `backend/src/modules/` and `backend/tests/` contained only `.gitkeep` files (e.g. `modules/fleet-management`, `modules/vehicles`, `modules/tenants`, `modules/pricing`, `modules/contracts`, `modules/billing`, `modules/damage-claims`).

---

## 6. End-to-End API Mapping (Frontend → Backend)

| Frontend Domain Call | Method | Backend Route Endpoint | Handler / Service |
|---|---|---|---|
| `auth.login` | POST | `/api/v1/auth/login` | `AuthController.login` → `AuthService.login` |
| `auth.register` | POST | `/api/v1/auth/register` | `AuthController.register` → `AuthService.register` |
| `auth.refresh` | POST | `/api/v1/auth/refresh` | `AuthController.refresh` → `AuthService.refresh` |
| `auth.logout` | POST | `/api/v1/auth/logout` | `AuthController.logout` → `AuthService.logout` |
| `auth.getMe` | GET | `/api/v1/auth/me` | `AuthController.getMe` → `AuthService.getMe` |
| `dashboard.getOverview` | GET | `/api/v1/dashboard/overview` | `DashboardController.getOverview` → Aggregated DB stats |
| `fleet.getVehicles` | GET | `/api/v1/vehicles` | `VehicleController.list` → `VehicleService.listVehicles` |
| `fleet.getMetrics` | GET | `/api/v1/vehicles/metrics` | `VehicleController.metrics` → `VehicleService.getFleetMetrics` |
| `fleet.getDashboardStats` | GET | `/api/v1/vehicles/dashboard-stats` | `VehicleController.dashboardStats` → Inventory breakdown |
| `fleet.getVehicle` | GET | `/api/v1/vehicles/:id` | `VehicleController.getById` → `VehicleService.getVehicleById` |
| `fleet.checkAvailability` | GET | `/api/v1/vehicles/:id/availability` | `VehicleController.checkAvailability` → Conflict checker |
| `fleet.createVehicle` | POST | `/api/v1/vehicles` | `VehicleController.create` → `VehicleService.createVehicle` |
| `fleet.updateVehicle` | PUT | `/api/v1/vehicles/:id` | `VehicleController.update` → `VehicleService.updateVehicle` |
| `fleet.archiveVehicle` | POST | `/api/v1/vehicles/:id/archive` | `VehicleController.archive` → Soft-archive state |
| `fleet.restoreVehicle` | POST | `/api/v1/vehicles/:id/restore` | `VehicleController.restore` → Restore active state |
| `pricing.listTiers` | GET | `/api/v1/vehicles/:id/pricing` | `VehicleController.listPricingTiers` → Tier pricing history |
| `pricing.createTier` | POST | `/api/v1/vehicles/:id/pricing` | `VehicleController.createPricingTier` → Rate plan update |
| `bookings.list` | GET | `/api/v1/bookings` | `BookingController.list` → `BookingService.listBookings` |
| `bookings.quote` | GET | `/api/v1/bookings/quote` | `BookingController.quote` → Rate & tax calculator |
| `bookings.create` | POST | `/api/v1/bookings` | `BookingController.create` → Booking engine |
| `rentals.list` | GET | `/api/v1/rentals` | `RentalController.list` → `RentalService.list` |
| `rentals.handover` | POST | `/api/v1/rentals/handover` | `RentalController.handover` → Odometer & fuel check |
| `rentals.return` | POST | `/api/v1/rentals/return` | `RentalController.return` → Return settlement & damage check |
| `inspections.list` | GET | `/api/v1/inspections` | `InspectionController.list` → Inspection list |
| `inspections.analyze` | POST | `/api/v1/inspections/analyze` | `InspectionController.analyze` → AI CV detection |
| `customers.list` | GET | `/api/v1/customers` | `CustomerController.list` → CRM customer records |
| `branches.list` | GET | `/api/v1/branches` | `branchRouter.get` → Prisma active branch directory |
| `admin.users` | GET | `/api/v1/admin/users` | `adminRouter.get` → Internal employee management |
| `admin.auditLogs` | GET | `/api/v1/admin/audit-logs` | `adminRouter.get` → Security audit trail |

---

## 7. Target Architecture & Implementation Plan

### Step 1: Centralized API Infrastructure (`Frontend/src/api/`)
- Implement `api/client.ts` with timeout policies, request cancellation (`AbortSignal`), automatic JWT bearer injection, HttpOnly cookie credentials, concurrent refresh queueing with lock, and structured error mapping.
- Implement `api/endpoints.ts` with domain endpoint constants.
- Implement `api/errors.ts` with typed error hierarchy (`ApiError`, `ValidationError`, `AuthError`, `NotFoundError`, etc.).
- Implement `api/types.ts` for unified response signatures (`ApiResponse<T>`, `PaginatedResponse<T>`).

### Step 2: Domain-Specific API Services
- `src/api/services/auth.api.ts`
- `src/api/services/dashboard.api.ts`
- `src/api/services/vehicles.api.ts`
- `src/api/services/vehiclePricing.api.ts`
- `src/api/services/bookings.api.ts`
- `src/api/services/rentals.api.ts`
- `src/api/services/inspections.api.ts`
- `src/api/services/customers.api.ts`
- `src/api/services/branches.api.ts`
- `src/api/services/admin.api.ts`

### Step 3: Reusable Data-Fetching & Mutation Hooks Layer
- Create `src/hooks/` with reactive query store & cache invalidation:
  - `useVehicles`, `useVehicle`, `useVehiclePricing`
  - `useBookings`, `useBooking`
  - `useDashboardSummary`
  - `useBranches`, `useCustomers`
  - `useVehicleAvailability`

### Step 4: Safe Repository Cleanup
- Move `CustomerDashboardPage.tsx` into `features/customers/pages/` and safely remove redundant `features/customer/` folder.
- Remove verified obsolete files:
  - `Frontend/src/features/auth/pages/DashboardPage.tsx`
  - `Frontend/src/features/auth/guards/RoleRoute.tsx`
  - `Frontend/src/features/auth/guards/ProtectedRoute.tsx`
- Remove empty redundant `.gitkeep` placeholder directories in `backend/src/modules/` that have no active code.
- Produce `docs/architecture/cleanup-report.md`.

### Step 5: Verification & Safety Guarantees
- Verify zero regression in existing routes (`/admin/cars`, `/admin/cars/:id`, `/admin/bookings`, etc.).
- Run frontend and backend builds (`npm run build`).
- Execute all tests.
