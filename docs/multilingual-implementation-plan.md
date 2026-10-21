# Multilingual & Translation System — Implementation Plan & Project Audit

## 1. Project Audit Summary

### 1.1 Architecture Overview
- **Frontend**: Single Page Application built with React 19 (`19.2.8`), TypeScript 5.8/6.0, Vite 8.3, React Router v7 (`7.18.4`), GSAP, Lenis Smooth Scroll, Lucide React icons, and Zod.
  - **Styling**: Pure CSS custom properties (design tokens in `src/styles/tokens.css`, `base.css`, `layout.css`). No CSS frameworks (no Tailwind, Sass, or styled-components).
  - **Routing & Layouts**:
    - `RootLayout` (`src/app/layouts/RootLayout.tsx`): Customer public shell wrapping `<Header />` and `<Footer />`.
    - `AdminLayout` (`src/app/layouts/AdminLayout.tsx`): Operations portal with collapsible responsive sidebar and topbar.
    - `AuthSplitLayout` (`src/features/auth/layouts/AuthSplitLayout.tsx`): Guest authentication pages.
  - **State Management**:
    - `AuthContext` (`src/features/auth/context/AuthContext.tsx`): Manages authenticated user state, JWT tokens, session refresh, and lifecycle events.
    - Custom fetch-based `ApiClient` (`src/api/client.ts`): Handles Bearer tokens, token refresh, error normalization, correlation IDs, and abort signals.
- **Backend**: Express.js 4 (`4.21.2`), TypeScript, Prisma ORM 6.4 with MySQL database.
  - **Authentication**: JWT access tokens (15m expiry), HttpOnly refresh cookies (7d), Argon2id password hashing, database-backed `Session` model.
  - **Architecture**: Modular layered architecture (`src/api/routes`, `src/modules/*` with controller, service, validation, and types).
  - **Error Handling**: Centralized `errorHandler` middleware converting `AppError` and validation issues into uniform JSON error payloads.
  - **Testing Framework**: `tsx` with custom node test runners (`backend/tests/unit/auth.test.ts`, `backend/tests/unit/pricing.test.ts`, and `Frontend/tests/api-architecture.test.ts`).

### 1.2 Existing Reusable Components and Actual Paths
1. `Header.tsx` (`Frontend/src/components/layout/Header.tsx`): Desktop and mobile header with navigation, already containing a placeholder for the language selector pill (`<Globe />`, `EN`, `<ChevronDown />`).
2. `Footer.tsx` (`Frontend/src/components/layout/Footer.tsx`): Public site footer with brand overview, quick links, vehicle categories, and contact info.
3. `AdminLayout.tsx` (`Frontend/src/app/layouts/AdminLayout.tsx`): Admin topbar and navigation sidebar with mobile drawer, theme toggles, search, and user profile menu.
4. `Button.tsx` (`Frontend/src/components/common/Button.tsx`): Multi-variant button (`primary`, `glass`, `ghost`, `danger`, `outline`) with size and icon support.
5. `CustomSelect.tsx` (`Frontend/src/components/common/CustomSelect/CustomSelect.tsx`): Accessible custom dropdown with keyboard navigation and smooth animation.
6. `Modal.tsx` (`Frontend/src/components/common/Modal.tsx`): Accessible modal with backdrop blur, focus trap, and escape key handling.
7. `ConfirmModal.tsx` (`Frontend/src/components/common/ConfirmModal/ConfirmModal.tsx`): Context-driven confirmation modal for destructive/critical actions.
8. `ResponsiveTable.tsx` (`Frontend/src/components/common/ResponsiveTable.tsx`): Direction-neutral tabular data display with horizontal scrolling on mobile.
9. `EmptyState.tsx` (`Frontend/src/components/common/EmptyState.tsx`): Empty list/search results component with action button.
10. `LoadingState.tsx` (`Frontend/src/components/common/LoadingState.tsx`): Loading indicator and skeleton state.
11. `PageHeader.tsx` (`Frontend/src/components/common/PageHeader.tsx`): Standard page title, description, and action button bar.
12. `FilterToolbar.tsx` (`Frontend/src/components/common/FilterToolbar.tsx`): Standard search and filter toolbar for directory/admin views.

### 1.3 Identified Integration Gaps
1. **Localization Engine**: No internationalization library (`i18next` / `react-i18next`) installed. Hardcoded English strings across customer pages, admin views, and auth screens.
2. **Document Direction & RTL Support**: No root `dir` or `lang` attribute switching; CSS contains physical directional properties (`margin-left`, `padding-left`, `border-left`, `left: 0`, `right: 0`) without RTL mirror equivalents or CSS logical property abstractions.
3. **Typography**: Google Fonts currently import only `Manrope` and `Archivo`. Missing Arabic/Urdu script font support (`Noto Sans Arabic` / `Noto Nastaliq Urdu`).
4. **Backend Translation Service**: No translation API or translation provider adapter exists in Express.
5. **Database Models**: `User` model lacks `preferredLanguage` column. No translation caching table or dynamic content translation model exists in `schema.prisma`.
6. **Guest & User Preference Synchronization**: No client-side persistence or user profile API endpoint for saving language choice to MySQL.

---

## 2. Target Architecture & Design Decisions

### 2.1 Supported Languages & Direction
| Language | Code | Direction | Locale | Font Family |
|---|---|---|---|---|
| English | `en` | LTR | `en-US` | `'Manrope', 'Archivo', sans-serif` |
| Urdu (اردو) | `ur` | RTL | `ur-PK` | `'Noto Nastaliq Urdu', 'Noto Sans Arabic', sans-serif` |
| Arabic (العربية) | `ar` | RTL | `ar` | `'Noto Sans Arabic', sans-serif` |

- **Default & Fallback**: `en` (English).
- **Direction Determination**: Controlled strictly by active interface language code via centralized registry (`src/i18n/config.ts`), never inferred from arbitrary user text.
- **Document Root**: Synchronized on language change to `<html lang="[code]" dir="[ltr|rtl]">` with corresponding class `.finovo-rtl` or `.finovo-ltr`.

### 2.2 Localization Engine
- We integrate `i18next` and `react-i18next` into `Frontend/package.json`.
- Resources partitioned into structured namespaces:
  - `common`: Global actions, buttons, pagination, status badges, confirmation dialogs, loading/empty states.
  - `nav`: Customer header, footer, admin sidebar, admin header.
  - `auth`: Login, registration, forgot password, code verification, reset password, errors.
  - `home`: Hero section, featured cars, insurance, AI inspection, testimonials, CTA.
  - `cars`: Available vehicles, car details, specifications, booking form.
  - `admin`: Fleet management, bookings, rentals, inspections, inquiries, customers, audit logs.
  - `translator`: Dedicated text translation tool (source text, target selection, swap, character counter, copy, clear, errors).

### 2.3 Language Resolution Pipeline
1. **Authenticated User Preference**: If user is logged in, use `user.preferredLanguage` from backend.
2. **Guest Storage Preference**: If guest, inspect `localStorage.getItem('finovo_language')`.
3. **Browser Preference**: Inspect `navigator.language` (e.g. `ur` or `ar`).
4. **Default Fallback**: `en`.
5. **Persistence**:
   - Updates `localStorage` immediately.
   - If authenticated, dispatches an API request to `PUT /api/v1/auth/profile/language` (or `PUT /api/v1/users/me/language`) to persist in MySQL.
   - Updates document `dir` and `lang` without full page reload.

### 2.4 RTL / LTR Layout Engine
- Addition of `src/styles/rtl.css` using CSS logical properties (`margin-inline-start`, `padding-inline-start`, `inset-inline-start`, `border-inline-start`, `text-align: start`) and explicit `[dir="rtl"]` overrides for:
  - Header & mobile drawer
  - Admin sidebar (positioned on right in RTL, drawer slides from right)
  - Breadcrumbs & navigation arrows (flipped semantically)
  - Form inputs, search adornments, icons
  - Modal headers & close buttons
  - Tables & pagination controls
  - Directional icon flipping (flip chevron-left / chevron-right, but preserve brand logos and clock/media controls)
  - Numerical and code isolation using `unicode-bidi: isolate` and `dir="ltr"` for license plates, VINs, phone numbers, and prices.

### 2.5 Backend Translation Pipeline
- **Route**: `POST /api/v1/translations/translate`
- **Request Body**:
  ```json
  {
    "text": "String (1-5000 chars)",
    "sourceLanguage": "en | ur | ar | auto",
    "targetLanguage": "en | ur | ar"
  }
  ```
- **Validation**: Zod schema validating input size, supported language codes, rejection of empty text.
- **Provider Architecture**: Pluggable provider adapter (`TranslationProvider`) supporting:
  - Google Cloud Translation API adapter (via official REST endpoint or client library when API key / credentials are provided).
  - Configurable fallback / self-hosted provider adapter.
  - Offline / mock provider for CI testing without paid credentials.
- **Optimizations & Caching**:
  - Deterministic SHA-256 cache key generated from `hash(sourceText + sourceLang + targetLang)`.
  - Database-backed `TranslationCache` model in MySQL (`schema.prisma`) with bounded TTL and indexing.
  - Identical source-equals-target short-circuiting (zero provider cost).
  - Rate limiting via Express rate limiter (`translationRateLimiter`).

### 2.6 Dynamic Content Localization
- Vehicles, categories, and inquiries dynamic content can be translated on-demand through the backend pipeline and cached in MySQL `TranslationCache`.
- The original MySQL records in `vehicles`, `vehicle_categories`, etc. remain untouched and immutable as the primary source of truth.

---

## 3. Implementation Phases

1. **Phase 1: Project Audit & Planning** (Completed - documented in this plan).
2. **Phase 2: Dependencies & Database Schema Migration**:
   - Add `i18next` & `react-i18next` to `Frontend/package.json`.
   - Update `schema.prisma` in `backend/` to add `preferredLanguage` to `User` and `TranslationCache` table.
   - Run `npx prisma db push` (or migration) and `npx prisma generate`.
3. **Phase 3: Localization Foundation**:
   - Create `src/i18n/config.ts` with language registry, RTL detection, and resolution pipeline.
   - Create translation resource dictionaries for `en`, `ur`, `ar`.
   - Initialize i18n in `main.tsx` and wrap in React tree.
   - Create `LanguageSelector` component in `src/components/common/LanguageSelector/`.
4. **Phase 4: RTL/LTR Layout Engine**:
   - Import Google Fonts for Arabic/Urdu (`Noto Sans Arabic`, `Noto Nastaliq Urdu`).
   - Create `src/styles/rtl.css` with direction-aware rules and logical properties.
   - Update `Header.tsx`, `AdminLayout.tsx`, `Footer.tsx` with dynamic direction support.
5. **Phase 5: Existing UI Migration**:
   - Localize `Header`, `Footer`, `AdminLayout` navigation.
   - Localize `LoginPage`, `RegisterPage`, `ForgotPasswordPage`.
   - Localize `HomePage`, `CarsDirectoryPage`, `BookingsListPage`, `RentalsListPage`.
6. **Phase 6: Backend Translation API & Adapter**:
   - Create `src/modules/translations/` in backend (`translation.routes.ts`, `translation.controller.ts`, `translation.service.ts`, `translation.provider.ts`, `translation.validation.ts`).
   - Register `/api/v1/translations` route in `src/bootstrap/app.ts`.
   - Implement SHA-256 caching in MySQL `TranslationCache`.
7. **Phase 7: Frontend Translation Tool & User Preferences**:
   - Create `TextTranslator` feature/modal in Frontend.
   - Wire user language preference persistence to `PUT /api/v1/auth/profile/language`.
8. **Phase 8: Responsive Verification & Testing**:
   - Verify layout on 320px, 360px, 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px.
   - Write unit tests for i18n pipeline, RTL resolver, translation cache, and API routes.
   - Run regression test suites (`npm test` in both backend and frontend).
9. **Phase 9: Documentation, Environment & Rollback Strategy**:
   - Update `.env.example`.
   - Document rollback plan and guide for adding new languages.
