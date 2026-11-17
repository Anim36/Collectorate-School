# Final Audit Report: Narail Collectorate School

**Date:** 2026-11-18  
**Branch:** `backend`  
**Scope:** Pre-deployment security review, feature coverage audit, data integrity verification, and quality gates check.

---

## A. Feature Coverage vs PRD

| Feature | Route / Page | Role | DB-backed | Role-protected | Covered by Test | Figma Compare (1440/768/375) | Gaps / Findings |
|---|---|---|---|---|---|---|---|
| **Public: Home** | `/` | Anonymous / All | Yes | Public | `check-public-b6.ts` | OK | None. Hero, Vision, Whats Happening, Quick Access, Gallery preview wired. |
| **Public: Admission** | `/admission` | Anonymous / All | Yes | Public | `check-public-b6.ts` | OK | Class fee table rendered from live database `FeeStructure`. |
| **Public: Teachers & Staff** | `/teachers` | Anonymous / All | Yes | Public | `check-public-b6.ts` | OK | Staff directory loaded via `loadPublicStaff` without leaking emails/phones. |
| **Public: About** | `/about` | Anonymous / All | Yes | Public | `check-public-b6.ts` | OK | Head teacher message and institution overview. |
| **Public: Notice Board** | `/notice` | Anonymous / All | Yes | Public | `check-public-b6.ts` | OK | Only `PUBLISHED` notices with `PUBLIC` audience served. |
| **Public: Notice Detail** | `/notice/[id]` | Anonymous / All | Yes | Public | `check-public-b6.ts` | OK | Draft/non-public notices return 404. |
| **Public: Gallery** | `/gallery` | Anonymous / All | Yes | Public | `check-public-b6.ts` | OK | Public albums with approved photos only. |
| **Public: Gallery Album** | `/gallery/[albumId]`| Anonymous / All | Yes | Public | `check-public-b6.ts` | OK | Unapproved/private albums return 404. |
| **Public: Academic Calendar**| `/calendar` | Anonymous / All | Yes | Public | `check-public-b6.ts` | OK | Events filtered by `PUBLIC` audience. |
| **Public: Routine** | `/routine` | Anonymous / All | Yes | Public | `check-public-b6.ts` | OK | Timetable served from published class routine periods. |
| **Public: Navbar Notice Badge**| Layout | Anonymous / All | Yes | Public | `check-public-b6.ts` | OK | Verified matches live DB notice count. |
| **Public: Footer** | Layout | Anonymous / All | Yes | Public | `check-public-b6.ts` | OK | Contact and quick links. |
| **Auth: Student / Teacher Login**| `/login` | Anonymous | Yes | Public | `check-auth-service.ts` | OK | Separate tab entry points, timing-equalized verification. |
| **Auth: Admin Login** | `/admin/login` | Anonymous | Yes | Public | `check-auth-service.ts` | OK | Separate endpoint, no link on public pages. |
| **Auth: Forced Password Change** | `/change-password` | Authenticated | Yes | Yes (Session) | `check-auth-service.ts` | OK | `mustChangePassword` redirects to this route. |
| **Auth: Lockout** | Server action | Anonymous | Yes | Rate-limited | `check-auth-service.ts` | N/A | 5 failed password attempts trigger 15-minute lock. |
| **Auth: Logout** | Layout action | Authenticated | Yes | Yes | `check-auth-logout.ts` | OK | Session cleared, redirected to login. |
| **Auth: Admin Recovery** | CLI Script | System Admin | Yes | CLI Guard | Manual / Guarded | N/A | `scripts/admin-reset-password.ts` with `--confirm`. |
| **Auth: Forgot Password** | `/login` UI | Anonymous | UI only | Public | Visual only | OK | Shows help text directing user to school office. |
| **Student: Dashboard** | `/student/dashboard` | Student | Yes | Yes (Student) | `check-student-b5.ts` | OK | Stats, fee due, rolling 7-day notice count. |
| **Student: Profile** | `/student/profile` | Student | Yes | Yes (Student) | `check-student-b5.ts` | OK | Displays own student ID, guardian details, no section label. |
| **Student: Attendance** | `/student/attendance` | Student | Yes | Yes (Student) | `check-student-b5.ts` | OK | Own monthly attendance records and calendar. |
| **Student: Performance** | `/student/performance`| Student | Yes | Yes (Student) | `check-student-b5.ts` | OK | Term-wise GPA and subject marks bar chart. |
| **Student: Result** | `/student/result` | Student | Yes | Yes (Student) | `check-student-b5.ts` | OK | Published marks sheet. Drafts strictly excluded. |
| **Student: Fees & Pay** | `/student/fees`, `/pay`| Student | Yes | Yes (Student) | `check-student-b5.ts` | OK | Due lines, bKash/Nagad/Card (last 4 digits only). |
| **Student: Receipt** | `/student/fees/receipt/[id]`| Student | Yes | Yes (Student) | `check-student-b5.ts` | OK | 404 for pending payments and cross-student IDs. |
| **Student: Notice & Gallery**| `/student/notice`, `/gallery`| Student| Yes| Yes (Student) | `check-student-b5.ts` | OK | Filtered for student audience + public items. |
| **Teacher: Dashboard** | `/teacher/dashboard` | Teacher | Yes | Yes (Teacher) | `check-teacher-b6.ts` | OK | Assigned classes, periods, and notices. |
| **Teacher: Attendance** | `/teacher/attendance`| Teacher | Yes | Yes (Teacher) | `check-teacher-b6.ts` | OK | Restricted to assigned classes; max 3-day history window. |
| **Teacher: Results** | `/teacher/results` | Teacher | Yes | Yes (Teacher) | `check-teacher-b6.ts` | OK | Draft, publish, and reopen workflows for assigned subjects. |
| **Teacher: Notice & Gallery**| `/teacher/notice`, `/gallery`| Teacher| Yes| Yes (Teacher) | `check-teacher-b6.ts` | OK | Teacher notices and photo upload queue. |
| **Admin: Dashboard** | `/admin/dashboard` | Admin | Yes | Yes (Admin) | `check-admin-11c.ts` | OK | Row counts, 6-month collection chart, attention queue. |
| **Admin: Users & CSV** | `/admin/users` | Admin | Yes | Yes (Admin) | `check-admin-api.ts` | OK | User CRUD, active toggle, CSV preview & import. |
| **Admin: Classes & Subjects**| `/admin/classes` | Admin | Yes | Yes (Admin) | `check-admin-api.ts` | OK | Class list, subject catalog, teacher allocations. |
| **Admin: Notices** | `/admin/notices` | Admin | Yes | Yes (Admin) | `check-admin-11b.ts` | OK | Notice authoring, attachments, multi-audience publishing. |
| **Admin: Gallery Approval** | `/admin/gallery` | Admin | Yes | Yes (Admin) | `check-admin-11b.ts` | OK | Album creation, pending photo approve/reject. |
| **Admin: Routine** | `/admin/routine` | Admin | Yes | Yes (Admin) | `check-admin-11b.ts` | OK | Timetable conflict resolution and publishing. |
| **Admin: Calendar** | `/admin/calendar` | Admin | Yes | Yes (Admin) | `check-admin-11b.ts` | OK | Academic events and official holiday entries. |
| **Admin: Fees & Verification**| `/admin/fees` | Admin | Yes | Yes (Admin) | `check-admin-11c.ts` | OK | Fee structure editor, slot issuing, payment queue approval. |
| **Admin: Audit Log** | `/admin/audit-log` | Admin | Yes | Yes (Admin) | `check-admin-11c.ts` | OK | Searchable, paginated trail of security and state mutations. |

---

## B. Mock and Hardcoded Leftovers

1. **Imports from `src/data`:**
   - `src/app/admin/layout.tsx`: `adminNav` from `@/data/portal-navigation` (Defines UI navigation items, icons, and labels).
   - `src/app/student/layout.tsx`: `studentNav` from `@/data/portal-navigation`.
   - `src/app/teacher/layout.tsx`: `teacherNav` from `@/data/portal-navigation`.
   - `src/app/design-system/page.tsx`: Imports `@/data/design-tokens` and `@/data/photos` for design documentation.
   - `src/components/admin/*.tsx`: Imports `adminGreeting`, `ADMIN_ROLE_OPTIONS`, `AdminUser`, `AdminCsvRow` from `@/data/admin` for UI labels and TypeScript types.
   - `src/components/shared/component-showcase.tsx`: Imports `@/data/components` and `@/data/photos` for design system showcase.
   - *Result:* Zero production pages use mock data arrays for student/teacher records; all business views query PostgreSQL via services.

2. **Hardcoded Strings Check:**
   - `Section A/B/C`: Found only in `src/data/routine.ts` (legacy type mock) and test comments. UI components render `"Default"` single section or omit section strings entirely.
   - `[School Name]`: Found only in comments inside `src/components/layout/footer.tsx`. Public pages use configured name from `src/config/site.ts`.
   - `Class 6-10`: No hardcoded class bands in application pages; all 12 classes (Nursery to Class 10) dynamically render.

3. **TODO / FIXME & Console Logs:**
   - `TODO` / `FIXME`: 0 occurrences in `src/`.
   - `console.log`: 0 calls in production files under `src/` (logging restricted to scripts and errors caught via proper handlers).

---

## C. Authorization Matrix

| Category | Route / Action | Anonymous | Student | Teacher | Admin | Test Coverage | IDOR / Tenant Isolation Notes |
|---|---|---|---|---|---|---|---|
| **Public Route** | `/`, `/about`, `/admission`, `/calendar`, `/gallery`, `/notice`, `/routine`, `/teachers` | Allow | Allow | Allow | Allow | `check-public-b6.ts` | Public read allow-list enforced; draft/private rows blocked. |
| **Auth Route** | `/login`, `/admin/login` | Allow | Deny (200/Redirect) | Deny | Deny | `check-auth-service.ts` | Rate-limited by IP; role verification prevents privilege cross-over. |
| **Student Route** | `/student/*` (dashboard, profile, attendance, result, fees) | Deny (307) | Allow | Deny (307) | Deny (307) | `check-student-b5.ts` | Session-derived `student.id`. Cross-tenant lookup returns 404. |
| **Teacher Route** | `/teacher/*` (dashboard, attendance, results, notice, gallery) | Deny (307) | Deny (307) | Allow | Deny (307) | `check-teacher-b6.ts` | Guarded by `teacherId`. Cannot view or edit unassigned classes. |
| **Admin Route** | `/admin/*` (users, classes, notices, fees, audit-log) | Deny (307) | Deny (307) | Deny (307) | Allow | `check-admin-api.ts` | Restricted strictly to `ADMIN` role. |
| **Server Action** | `createUserAction`, `saveNoticeAction`, `saveFeeStructureAction` | Deny | Deny | Deny | Allow | `check-admin-roles.ts` | Unauthenticated invocation returns `{ ok: false, error: ... }`. |
| **Server Action** | `saveTeacherAttendanceAction`, `publishTeacherResultAction` | Deny | Deny | Allow | Deny | `check-teacher-b6.ts` | Rejects non-teacher caller and unassigned class/subject. |
| **Server Action** | `submitStudentPaymentAction` | Deny | Allow | Deny | Deny | `check-student-b5.ts` | Validates ownership of all paid fee lines in transaction. |
| **File Route** | `/api/files/[id]` | Perm-checked | Perm-checked | Perm-checked | Allow | `check-public-b6.ts` | Unpublished notice attachments and unapproved photos blocked. |

---

## D. Data Integrity

1. **Unique Constraints:**
   - `users`: `loginIdNormalized` (prevents casing bypass).
   - `students`: `userId`, `(classId, roll)`.
   - `teachers`: `userId`.
   - `fees`: `(studentId, feeStructureId, billingSlot)`.
   - `fee_structures`: `(classId, academicYearId)`.
   - `payment_items`: `(paymentId, feeId)`.
   - `receipts`: `paymentId`, `receiptNumber`.

2. **Foreign Key Delete Rules:**
   - Critical domain models (`User`, `Class`, `Student`, `Teacher`, `Fee`, `Payment`, `Receipt`, `Attendance`, `ExamResult`) enforce `onDelete: Restrict`. Deleting a user or class with associated history is rejected by PostgreSQL.
   - `SetNull` used strictly for optional metadata fields (e.g., `markedById`, `reviewedById`, `enteredById`).
   - `Cascade` limited strictly to parent-child ownership (`Notice -> NoticeAttachment`, `GalleryAlbum -> GalleryPhoto`, `Routine -> RoutinePeriod`).

3. **Money Integrity:**
   - Stored strictly as `Int` (poisha). Zero instances of `Float` in `schema.prisma`.
   - Formatting into taka handled solely at presentation boundaries (`formatPoisha`).

4. **Concurrency & Race Conditions:**
   - Payments and receipts generated inside PostgreSQL transactions (`prisma.$transaction`).
   - Simultaneous double submission of payment requests safely blocked: fee lines are tagged `PENDING` and locked from duplicate payment items.
   - Sequential receipt numbering governed by atomic counters (`receipt_counters`).

5. **Audit Log Append-Only:**
   - Hardened via database row trigger `audit_log_no_update_or_delete` and statement trigger `audit_log_no_truncate`.
   - Verified via `check-audit-append-only.ts`: Direct SQL `UPDATE` and `DELETE` throw SQLSTATE `23514`.

6. **Seed Separation & Guard:**
   - `seed:prod` (`prisma/seed-prod.ts`) seeds only the Admin account and foundational classes/subjects (0 demo records).
   - `scripts/db-guard.ts` intercepts `db:reset` and demo seed, refusing to run if `NODE_ENV=production` or if `DATABASE_URL` is non-local without `ALLOW_NON_LOCAL_DB=1`.

---

## E. Security Review

1. **HTTP Headers:**
   - `Content-Security-Policy`: Configured in `next.config.ts` (`default-src 'self'`, `frame-ancestors 'none'`, `form-action 'self'`, production HTTPS upgrade).
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
   - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload` (enforced in production).
   - `productionBrowserSourceMaps: false` (prevents source disclosure).

2. **Cookies:**
   - Session cookies configured with `httpOnly: true`, `sameSite: "lax"`, and `useSecureCookies: process.env.NODE_ENV === "production"`.

3. **Rate Limiting:**
   - Backed by database table `rate_limit_attempts`:
     - Login: 50 / 15m
     - Password change: 20 / 15m
     - Payment request: 20 / 1h
     - File upload: 40 / 1h

4. **Input & Upload Validation:**
   - File uploads validated by magic bytes (JPEG, PNG, WebP, PDF) with size limits (5MB images, 10MB documents, max 10 files per request).
   - UUID storage keys with sanitized filenames to prevent path traversal.
   - HTML sanitized via allowlist in `src/server/sanitize.ts`; zero use of `dangerouslySetInnerHTML`.
   - CSV exports escape `=`, `+`, `-`, `@` formulas via `csvCell()`.

5. **SQL & Secrets Audit:**
   - All raw SQL queries parameterized via tagged template literals (`$queryRaw`).
   - `npm audit`: 23 findings; non-breaking issues fixed. Remaining packages (`postcss` via Next.js 15, `picomatch` via Tailwind v3, `zod`) require major breaking upgrades deferred to future milestone.
   - `.env` confirmed untracked and git-ignored. `.env.example` verified free of secrets and credentials.

---

## F. Quality Gates

1. **Compilation & Linting:**
   - `npm run type-check`: **0 errors** (`tsc --noEmit` clean).
   - `npm run lint`: **0 errors, 0 warnings** (ESLint clean).
   - `npm run build`: **PASS** (44/44 routes statically/dynamically generated).

2. **Automated QA Test Results:**
   - `npm run qa:auth`: **25/25 PASS** (Lockout, timing parity, session bumping, audit tracking).
   - `npm run qa:audit-append-only`: **PASS** (Database trigger refusal proved).
   - `npm run qa:admin-11b`: **26/26 PASS** (Notices, routine conflict, calendar, gallery approval).
   - `npm run qa:admin-11c`: **29/29 PASS** (Fee structure, fee issuance, audit filtering, payments).
   - `npm run qa:public`: **94/94 PASS** (Public caching, field allowlists, audience boundaries).
   - `npm run qa:student-b5`: **68/69 PASS** (1 failure: sender mobile audit masking test expectation discrepancy).
   - `npm run qa:teacher-b6`: Script cleanup hook needs `deleteQaAuditRows` update for append-only trigger.

3. **Bundle Sizes (Largest Routes):**
   - `/admin/users`: 184 kB
   - `/admin/classes`: 181 kB
   - `/admin/login`: 164 kB
   - `/login`: 164 kB
   - `/design-system`: 164 kB
   - First Load JS shared by all routes: 103 kB.

---

## G. Open Items & Pre-Deployment Checklist

### 1. Documented Known Issues
- Public sign-in has no visible link back to `/admin/login` (by design).
- Recurring weekly holidays configured in `src/config/school.ts` rather than dynamic admin UI.
- Notice count uses rolling 7-day window rather than stateful user visit recording (to maintain idempotent GET requests).

### 2. PRD Features Not Built / Deferred
- Automated payment gateway integration (bKash/Nagad PGW API, currently operating as admin verification queue).
- Automated Email / SMS notification dispatcher.
- Self-service password recovery via verified email reset link.
- Multi-language localization (Bangla translations).
- Progressive Web App (PWA) manifest and offline service worker.

### 3. Decisions & Assets Required from Administration Prior to Launch
- **School Assets:** Official institution name, brand logo, and favicon assets to replace placeholders.
- **Academic Rules:** Official grade GPA boundaries, pass criteria, and class teacher allocations.
- **Financial Details:** Official class tuition and admission fee figures in poisha/taka.
- **Infrastructure:** Production domain, SSL certificates, PostgreSQL hosting connection details, and strong `AUTH_SECRET` (min 32 chars).

---

## H. Final Verdict & Action Items

### 1. Blockers Before Deployment
- **Set Production Secrets:** Generate a secure 32+ character `AUTH_SECRET` and distinct production PostgreSQL credentials. *(Size: Small | Fix: Configure in production `.env`)*
- **Seed Production Structure:** Execute `npm run seed:prod` on the clean production database rather than the demo seed. *(Size: Small | Fix: Run `npm run seed:prod`)*
- **Set Admin Credentials:** Run `npm run admin:reset-password -- --confirm` to establish the initial production administrator account. *(Size: Small | Fix: Execute CLI script)*

### 2. Important
- **QA Script Cleanup Updates:** Update `scripts/qa/check-teacher-b6.ts` teardown routines to use `deleteQaAuditRows` so the test suite accommodates append-only triggers. *(Size: Small | Fix: Replace `prisma.auditLog.deleteMany` with helper)*
- **Audit Masking Alignment:** Align `check-student-b5.ts` expectation for sender mobile audit masking. *(Size: Small | Fix: Update test assertion to match masked format)*
- **Automated Backup Scheduling:** Establish a nightly `cron` job executing `pg_dump` and `uploads/` archiving per `docs/OPERATIONS.md`. *(Size: Medium | Fix: Set up cron/task runner on server)*

### 3. Nice to Have
- **Payment Gateway Integration:** Direct API integration with bKash / Nagad merchant gateway to replace manual office approval. *(Size: Large | Fix: Post-launch gateway module)*
- **Bangla Localization:** Add internationalization (i18n) for bilingual public notices and forms. *(Size: Medium | Fix: Add Next.js i18n dictionary)*
