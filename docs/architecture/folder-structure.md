# Finovo AI Car Rental — Project Folder Structure & Module Guidelines

**Document Version:** 1.0.0  
**Status:** Canonical Reference  
**Date:** 2026-10-18  

---

## 1. High-Level Monorepo Layout

```text
Finovo_Ai_Car_Rental/
├── backend/                  # Node.js + Express + Prisma + MySQL Backend Service
├── Frontend/                 # React 19 + TypeScript + Vite Frontend Web App
├── docs/                     # Architectural Documentation & Runbooks
│   └── architecture/         # System architecture, API, cleanup, audit reports
└── README.md                 # Project root documentation & quickstart
```

---

## 2. Frontend Structure (`Frontend/`)

The frontend adheres strictly to modern feature-sliced modularity with a centralized API communication and hook layer:

```text
Frontend/
├── public/
│   ├── assets/               # Static public assets
│   └── cars/                 # High-resolution vehicle gallery assets
├── src/
│   ├── main.tsx              # React DOM 19 bootstrap mount
│   ├── App.tsx               # Root application shell wrapping AppRouter
│   ├── App.css               # Global application styling
│   ├── index.css             # Entry reset styling
│   │
│   ├── api/                  # CENTRALIZED API LAYER (Part D)
│   │   ├── client.ts         # Enterprise ApiClient (timeouts, token refresh, correlation)
│   │   ├── endpoints.ts      # Typed endpoint dictionary
│   │   ├── errors.ts         # Error classification hierarchy & normalizer
│   │   ├── types.ts          # Common API request/response contracts
│   │   ├── cache.ts          # Reactive in-memory QueryCache with mutation invalidation
│   │   ├── index.ts          # Central barrel export
│   │   └── services/         # Domain-Specific API Services (Part D Section 14)
│   │       ├── auth.api.ts
│   │       ├── dashboard.api.ts
│   │       ├── vehicles.api.ts
│   │       ├── vehiclePricing.api.ts
│   │       ├── bookings.api.ts
│   │       ├── rentals.api.ts
│   │       ├── inspections.api.ts
│   │       ├── customers.api.ts
│   │       ├── branches.api.ts
│   │       ├── admin.api.ts
│   │       └── index.ts
│   │
│   ├── hooks/                # REUSABLE DATA-FETCHING HOOKS (Part D Section 15)
│   │   ├── useVehicles.ts    # Fleet list, pagination, and filter querying
│   │   ├── useVehicle.ts     # Single vehicle details and lifecycle mutations
│   │   ├── useVehiclePricing.ts # Pricing tier management & mutations
│   │   ├── useBookings.ts    # Reservations list and status updates
│   │   ├── useDashboardSummary.ts # Aggregated platform metrics
│   │   ├── useBranches.ts    # Branch directory
│   │   ├── useCustomers.ts   # Customer CRM querying & verification
│   │   ├── useVehicleAvailability.ts # Live booking conflict test
│   │   └── index.ts
│   │
│   ├── app/                  # Application Shell & Routing
│   │   ├── layouts/          # RootLayout (Public), AdminLayout (Operations)
│   │   ├── providers/        # Context providers
│   │   └── router/           # AppRouter.tsx with complete route table
│   │
│   ├── components/           # Shared Design System Components
│   │   ├── common/           # BrandLogo, Button, Badge, SectionHeading
│   │   └── layout/           # Header, Footer
│   │
│   ├── features/             # Business Domains
│   │   ├── auth/             # Login, Register, Forgot Password, Guards
│   │   ├── dashboard/        # Executive operational admin dashboard
│   │   ├── fleet/            # CarsDirectoryPage, CarDetailPage, AddCarPage, EditCarPage
│   │   ├── bookings/         # BookingsListPage, CreateBookingPage, BookingCalendarPage
│   │   ├── rentals/          # RentalsListPage, HandoverVehiclePage, ReturnVehiclePage
│   │   ├── inspections/      # InspectionsListPage, NewInspectionPage, InspectionDetailPage
│   │   ├── customers/        # CustomerDashboardPage (portal) & CustomersListPage (CRM)
│   │   ├── branches/         # BranchesListPage
│   │   ├── employees/        # EmployeesListPage
│   │   ├── audit-logs/       # AuditLogsPage
│   │   └── home/             # Public landing page sections & interactive cards
│   │
│   ├── styles/               # Design Tokens & Theming
│   │   ├── tokens.css        # Palette, typography, and spacing variables
│   │   └── base.css          # Baseline utility classes
│   └── types/                # Global ambient TypeScript definitions
│
├── tests/                    # Automated Frontend Tests
│   └── api-architecture.test.ts # API client, cache, and error test suite
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Backend Structure (`backend/`)

The backend follows an Express modular monolith pattern with explicit route registrations:

```text
backend/
├── prisma/
│   └── schema.prisma         # 18 Prisma relational models & enums
├── uploads/                  # Permanent vehicle image upload destination
├── tests/                    # Automated Tests
│   └── unit/auth.test.ts     # Security & auth test suite
└── src/
    ├── server.ts             # Application entry point & graceful shutdown
    ├── bootstrap/
    │   └── app.ts            # Express setup, CORS, static uploads, routers
    ├── config/
    │   └── env.config.ts     # Validated environment configuration (dotenv + zod)
    ├── infrastructure/
    │   ├── prisma/           # Prisma client, seed.ts, seed_operational.ts
    │   └── email/            # Email verification & password reset OTP delivery
    ├── middleware/
    │   ├── authenticate.ts   # Bearer JWT verification & session validation
    │   ├── authorize.ts      # Role-based access control (RBAC) guard
    │   ├── error-handler.ts  # Global AppError handler & logger
    │   └── rate-limiter.ts   # Anti-brute force limiter for auth endpoints
    ├── security/
    │   ├── password/         # Argon2id password hashing service
    │   └── tokens/           # JWT issuance and SHA-256 token hashing
    ├── shared/
    │   └── errors/app-error.ts # Base domain error hierarchy
    ├── api/
    │   └── routes/           # REST router definitions
    │       ├── admin.routes.ts
    │       ├── auth.routes.ts
    │       ├── booking.routes.ts
    │       ├── branch.routes.ts
    │       ├── customer.routes.ts
    │       ├── dashboard.routes.ts
    │       ├── inspection.routes.ts
    │       ├── rental.routes.ts
    │       ├── session.routes.ts
    │       └── vehicle.routes.ts
    └── modules/              # Core Business Domain Services & Controllers
        ├── audit/            # Audit logging service
        ├── auth/             # Auth controller, service, validation
        ├── bookings/         # Booking controller, quote engine, service
        ├── customers/        # Customer CRM controller and service
        ├── dashboard/        # Platform aggregate overview controller
        ├── fleet/            # Vehicle controller, service, validation, images
        ├── identity/         # Role service
        ├── inspections/      # Inspection controller and computer vision service
        ├── rentals/          # Rental handover and return controller
        └── sessions/         # User device session controller and service
```

---

## 4. Module Ownership & Naming Conventions

### File Naming Conventions:
- **Components & Pages:** PascalCase (e.g., `CarDetailPage.tsx`, `BrandLogo.tsx`).
- **Hooks:** camelCase prefixed with `use` (e.g., `useVehicles.ts`, `useVehiclePricing.ts`).
- **Domain API Services:** camelCase ending with `.api.ts` (e.g., `vehicles.api.ts`, `bookings.api.ts`).
- **Backend Routes:** kebab-case ending with `.routes.ts` (e.g., `vehicle.routes.ts`).
- **Backend Controllers:** kebab-case ending with `.controller.ts` (e.g., `vehicle.controller.ts`).
- **Backend Services:** kebab-case ending with `.service.ts` (e.g., `vehicle.service.ts`).

### Guidelines for Adding New Code:
1. **New UI Screen:** Create the page component under `Frontend/src/features/<domain>/pages/` and register the route in `Frontend/src/app/router/AppRouter.tsx`.
2. **New API Call:** 
   - Add endpoint constant to `Frontend/src/api/endpoints.ts`.
   - Add typed function to `Frontend/src/api/services/<domain>.api.ts`.
   - Wrap in a reusable hook under `Frontend/src/hooks/` with query cache management.
3. **New Backend Endpoint:**
   - Define controller action in `backend/src/modules/<domain>/<domain>.controller.ts`.
   - Implement business logic in `backend/src/modules/<domain>/<domain>.service.ts`.
   - Register the HTTP verb in `backend/src/api/routes/<domain>.routes.ts`.
