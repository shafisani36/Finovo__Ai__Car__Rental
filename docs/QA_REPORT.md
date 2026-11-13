# Finovo AI Car Rental: QA Test Report

**Date:** 13 November 2026
**Scope:** Backend API (Express + Prisma + MySQL), frontend (React + Vite), public website, customer portal, admin panel
**Environment:** Local test stack (MariaDB 10.11, seeded data, real backend, real frontend in headless Chrome)

## Overall rating

| | Score |
|---|---|
| Before this round of fixes | **5.5 / 10** |
| After the fixes in this report | **8 / 10** |

The product works well and looks finished. The low starting score came from a handful of serious security issues, not from the user experience. They were:

- Customer data leaking to other customers and to anonymous visitors.
- One upload endpoint that could write files anywhere on the server.

All critical and high issues found are now fixed and re-tested.

## What was tested

| Area | How | Result after fixes |
|---|---|---|
| Unit tests | Existing suites (auth, pricing, booking availability, inspection assessment, inspection consistency, translation) against a real database | 59 / 59 passed |
| Access control | Every API route called as guest, customer, second customer and admin (IDOR, role checks, privilege escalation) | All private data now restricted |
| Injection and input | SQL and NoSQL style payloads, objects in place of strings, malformed JSON, 2 MB bodies, oversized fields | Rejected with 400 / 413, no 500s |
| Authentication | JWT tampering, `alg: none`, garbage tokens, token reuse after logout, brute force, OTP guessing | All rejected; login locks after 20 tries per 15 minutes |
| File uploads | Path traversal, HTML disguised as PNG, `javascript:` links, file type spoofing | Blocked |
| Headers and CORS | Security headers, foreign origin pre-flight | Strict CORS, HSTS, nosniff, frame and CSP for uploads |
| Concurrency | 15 to 20 customers booking the same car and dates at the same instant | Exactly 1 booking succeeds, the rest get a clear 409 |
| Stress | autocannon, 50 to 100 concurrent connections | No errors, no timeouts, memory stable (around 57 MB) |
| Functional UI | Headless Chrome crawl of 43 pages (public, customer, admin) as each role | No crashes, no JavaScript errors, no failed API calls |
| Responsive | All pages at 390, 768 and 1366 px | No horizontal overflow |

### Stress results (single Node process)

| Endpoint | Requests per second | p99 latency |
|---|---|---|
| `GET /api/v1/public/stats` | about 9,500 | 24 ms |
| `GET /api/v1/public/reviews` | about 9,600 | 26 ms |
| `GET /api/v1/vehicles` (public catalog) | 167 before, **2,850 after** the cache | 958 ms before, **79 ms after** |
| `GET /api/v1/bookings/quote` | about 330 | 219 ms |
| `POST /api/v1/auth/login` | about 11 (Argon2 hashing by design) | 1.9 s |

## Issues found and fixed

### Critical

1. **Any customer could read every other customer's bookings.** `GET /bookings`, `GET /bookings/:id` and `GET /bookings/calendar` returned all bookings. Each one included the customer's name, email, phone number and driving licence number.
   *Fix:* customers now only see their own bookings, and other ids return 404. The calendar is staff-only.
2. **The public car details endpoint leaked private data to anonymous visitors.** `GET /vehicles/:id` returned, without login:
   - the car's last 10 bookings, with customer contact details;
   - inspections, audit logs, GPS location logs, documents and maintenance records;
   - internal fields: purchase cost, insurance policy number and tracker id.

   *Fix:* guests and customers get a public view only; staff get the full record.
3. **Internal fleet endpoints were open to anyone.** The affected endpoints were metrics, dashboard stats, and each vehicle's documents, maintenance, damage reports, odometer, GPS locations, audit logs and bookings.
   *Fix:* these endpoints are staff-only.
4. **Path traversal in customer document upload.** A crafted `documentType` such as `/../../x` wrote files outside the uploads folder. This was proven on the test server.
   *Fix:* the following safeguards were added:
   - the document type must be on an allow-list;
   - files get random names;
   - files are stored only in `uploads/documents`.
5. **Customer document upload trusted the client.** It accepted any file content and any `fileUrl` string, including `javascript:` links shown to staff.
   *Fix:* the following safeguards were added:
   - the real file type is detected from the file's first bytes, and only JPG, PNG, WEBP and PDF are accepted;
   - files are limited to 10 MB;
   - a client-supplied URL is never stored.

### High

6. **All rental records were readable by any logged-in customer** (`GET /rentals`). *Fix:* staff-only.
7. **Session revocation had no ownership check.** Any user could sign out any other user's session by id. *Fix:* users can only revoke their own sessions.
8. **Admin privilege escalation.** An `ADMIN` could create a `SUPER_ADMIN`, promote themselves, or edit and delete a super admin. The "cannot delete yourself" check never worked because it read `user.id` instead of `user.userId`.
   *Fix:* only a super admin can manage super admins, and nobody can change their own role or suspend or delete themselves. Suspending a user or changing their role or password now signs them out of all devices.
9. **Refresh and session tokens were returned in the login JSON.** This made them readable by page scripts. *Fix:* they now live only in httpOnly cookies, which the frontend already used.

### Medium

10. **Simultaneous bookings returned 500 errors.** When customers booked the same car at the same moment, there was no double booking, but MySQL serialization conflicts surfaced as 500s. *Fix:* the transaction is retried automatically, and a real conflict returns a clear 409 message.
11. **Bookings had no limits.** A customer could book a car for 10 years or several years ahead. *Fix:* online bookings are limited to 90 days and up to 365 days in advance. Staff can still make longer bookings.
12. **Reviews had no validation.** A missing booking id caused a 500, and a client could attach a review to any car. *Fix:* the following rules were added:
    - the rating must be a whole number from 1 to 5;
    - comments are limited to 1,000 characters;
    - a review always belongs to the car that was actually rented.
13. **The contact form had no rate limit or validation.** 40 spam messages in a row were accepted, and oversized input caused a 500. *Fix:* the form allows 10 messages per hour per connection and validates email, phone and field lengths.
14. **Invalid data that reached the database returned 500.** *Fix:* it now returns 400 with a clear message.
15. **Fake trust signals.**
    - Every car showed "4.8 ★ (120+ verified bookings)" and 5 stars on cards.
    - The AI page showed "Confidence 99.8%".

    *Fix:* ratings now come from real approved reviews and are hidden until a car has one. The fake percentage was removed.
16. **The public catalog was slow under load** (167 requests per second). *Fix:* guests share a 10-second response cache, which gives about 2,850 requests per second.

### Low

17. **Uploaded files could run scripts.** An uploaded SVG could run scripts if opened directly. *Fix:* `/uploads` is now served with a sandboxing Content-Security-Policy.
18. **Login IP addresses were read from a spoofable header.** *Fix:* they now use Express `req.ip`, which respects `TRUST_PROXY`.
19. **`brand.service.ts` created its own Prisma client and connection pool.** *Fix:* it now uses the shared client.
20. **Admin pages overflowed horizontally on phones.** This affected Cars, New Booking and Users. *Fix:* the grids now shrink correctly.
21. **The AI assistant crashed on non-text input.** *Fix:* the input is converted to text and limited to 1,000 characters.

## Remaining recommendations (not blockers)

- **Access token in `localStorage`.** It is short-lived (15 minutes) and the refresh token is httpOnly, but moving the access token to memory only would further reduce the impact of any future XSS.
- ~~Registration reveals whether an email exists~~ **Done:** signup now gives the same answer for every email, and the real owner gets an email notice.
- ~~Email verification is sent but not enforced~~ **Done:** booking and payment need a verified email; there is a `/verify-email` page and a "Resend" banner on the dashboard.
- ~~Automated tests in CI~~ **Done:** `.github/workflows/ci.yml` runs type checks, the unit tests against MySQL, lint and builds on every push and pull request. A next step would be to add the security checks from this report as API integration tests.
- ~~Monitoring~~ **Done (needs a DSN):** Sentry is built in for backend and frontend and turns on when `SENTRY_DSN` / `VITE_SENTRY_DSN` are set. `GET /api/health/ready` checks the database for uptime monitors.
- **Frontend bundle size.** The main JavaScript file is about 1.8 MB (467 KB gzip). Lazy-loading the admin and customer pages per route would make the first visit noticeably faster on mobile data.
- **Not testable in this environment:** live Stripe payments and the Gemini inspection call. Both were verified earlier on the developer machine and should get one more end-to-end run on staging with test keys.
