# Security

Decisions, controls and caveats for the backend phase (Step B7).  
Every point names the file that carries the control.

---

## 1. Audit log — append-only

The `audit_log` table is **append-only** in the database.

| Control | File |
|---|---|
| Row trigger `audit_log_no_update_or_delete` refuses UPDATE and DELETE | `prisma/migrations/20261118120000_b7_security_hardening` |
| Statement trigger `audit_log_no_truncate` refuses TRUNCATE | same migration |
| QA cleanup function `qa_delete_audit_rows(p_row_ids)` works only inside a transaction that sets `app.qa_audit_cleanup = 'on'` | same migration + `20261118121000_b7_qa_cleanup_row_ids` |
| QA scripts use `deleteQaAuditRows()` from `scripts/qa/audit-cleanup.ts` | every `check-*.ts` and `restore-seed-state.ts` |
| Proof test: UPDATE and DELETE both throw `P0001` | `scripts/qa/check-audit-append-only.ts` |

> [!IMPORTANT]
> In production, the database role the app connects with should be granted only INSERT and SELECT on `audit_log`. The trigger is a second line of defence.

---

## 2. Rate limiting

IP-based rate limiting on guarded actions, backed by the `rate_limit_attempts` table.

| Action | Limit | Window | File |
|---|---|---|---|
| `login` | 50 | 15 min | `src/server/rate-limit.ts` |
| `change-password` | 20 | 15 min | same |
| `payment-request` | 20 | 1 hour | same |
| `upload` | 40 | 1 hour | same |

**Multi-instance caveat:** the limiter is database-backed, so the limit is global across instances. If the connection pool is split (each instance uses its own database), the limit is per-instance instead.

**Wrong-tab login:** a sign-in from the wrong entry point (a student on `/admin/login`) is refused with the same generic error and timing, but it is **not** counted as a failed password attempt for lockout. This is explicit in `src/server/services/auth.ts` (comment: "A wrong tab is *not* a failed password attempt").

---

## 3. "Remember me" checkbox

**Decision: removed.** The checkbox was present in the UI but never wired. Rather than add a second session length, the checkbox was removed from the login form (`src/components/auth/login-form.tsx`). Session length is fixed by `SESSION_MAX_AGE` in `src/server/auth-types.ts`.

---

## 4. Session cookies

| Property | Value | Source |
|---|---|---|
| `httpOnly` | `true` | Auth.js default |
| `sameSite` | `lax` | Auth.js default |
| `secure` | `true` in production | `auth.config.ts` → `useSecureCookies: process.env.NODE_ENV === "production"` |

---

## 5. HTTP security headers

Applied to every route via `next.config.ts`:

| Header | Value |
|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests` (prod) |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=()` |
| Cross-Origin-Opener-Policy | `same-origin` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` (production only) |

**Source maps:** `productionBrowserSourceMaps: false` in `next.config.ts`.

---

## 6. Origin / Host validation

`src/middleware.ts` lines 48–69: every non-GET request must carry an `Origin` header that matches the allowed origin(s). A mismatch returns 403.

`allowedOrigins` is derived from `AUTH_URL` and `NEXT_PUBLIC_SITE_URL`. No wildcard CORS.

---

## 7. Error pages

| Page | File | Leaks? |
|---|---|---|
| 500 | `src/app/error.tsx` | Shows a generic message and a digest reference. No stack trace. |
| 404 | `src/app/not-found.tsx` | Generic "page not found". No path echo. |
| Global error | `src/app/global-error.tsx` | Fallback; no details. |

---

## 8. Raw SQL audit

All raw SQL uses Prisma's tagged template literals (`$queryRaw`), which are parameterised automatically. No string concatenation.

| File | Line(s) | Purpose |
|---|---|---|
| `src/server/services/student-attendance.ts` | 183 | Monthly attendance aggregate |
| `src/server/services/student-fees.ts` | 411 | Fee line totals |
| `src/server/services/fees.ts` | 804, 942 | Receipt counter |
| `scripts/qa/check-student-b5.ts` | 1665 | QA-only `$queryRawUnsafe` (not production) |

---

## 9. HTML sanitisation

`src/server/sanitize.ts` — allowlisted tags only; scripts, event handlers and styles stripped. Used on every notice body and any rich-text field before it reaches the database.

No `dangerouslySetInnerHTML` anywhere in the codebase.

---

## 10. CSV / formula injection

`csvCell()` in `src/server/services/fees.ts:1171` and `src/components/admin/admin-audit-log.tsx:250` prefixes cells starting with `=`, `+`, `-`, `@` with a single quote to prevent formula injection in spreadsheet apps.

---

## 11. File upload security

| Control | Location |
|---|---|
| Magic byte verification (JPEG, PNG, GIF, PDF, WEBP, SVG) | `src/server/storage.ts` |
| Size limits: 5 MB image, 10 MB document | same |
| Max 10 files per request | same |
| Random storage key (UUID); original filename sanitised | `sanitizeOriginalName()` strips path separators |
| Path traversal: `readFileBytes()` re-checks key against storage root | same |
| Permission-checked file route | `src/app/api/files/[id]/route.ts` |

---

## 12. Card data policy

**No card numbers, CVCs or expiry dates are ever collected, stored or logged.**

The payment form asks only for "last four digits of the card" (`cardLast4`). The schema enforces `String @db.VarChar(4)`. The `maskMobile()` helper in `src/server/services/student-fees.ts` masks all but the last 4 digits of a mobile number before it reaches the audit log.

---

## 13. Personal data inventory

| Data category | Stored where | Who can read |
|---|---|---|
| Student name, class, roll, guardian name, guardian phone, address, photo | `users`, `students` | Admin (full), Teacher (name + class only via attendance/results), Student (own profile), Public (none) |
| Staff name, designation, subject, photo | `users`, `teachers` | Admin (full), Public (name, designation, subject, photo via staff page — no email/phone) |
| Guardian phone | `students.guardian_phone` | Admin only |
| Email | `users.email` | Admin only |
| Password hash | `users.password_hash` | Never returned by any service. Redacted in audit metadata. |
| Tokens, session data | NextAuth session table / JWT | Never in audit log or API responses |

---

## 14. Audit log metadata

The audit service (`src/server/services/audit.ts`) explicitly redacts `passwordHash`, tokens, card data and secrets from metadata before writing.

**Retention:** append-only; no automatic deletion. A retention policy (e.g. 2 years) should be decided by the school administration and implemented as a scheduled job that archives rows to cold storage.

---

## 15. npm audit findings (as of 2026-11-18)

| Package | Severity | Issue | Resolution |
|---|---|---|---|
| `sanitize-html` | Moderate | 5 CVEs (SVG/SMIL, noscript bypass, meta refresh) | Run `npm audit fix` (non-breaking) |
| `minimatch` | Moderate | ReDoS via `@typescript-eslint` (devDep) | Run `npm audit fix` (non-breaking) |
| `picomatch` | High | ReDoS via `tailwindcss` v3 | Requires Tailwind v4 (breaking) — deferred |
| `postcss` | High | Via `next` | Requires Next.js v16 (breaking) — deferred |
| `zod` | High | Memory exhaustion | Requires Zod v4 (breaking) — deferred |

> [!NOTE]
> `next-auth` is pinned at `5.0.0-beta.32` in `package.json`.  
> The three "deferred" items require major-version upgrades that are outside the scope of B7.

---

## 16. Secrets and .env

- `.env` is git-ignored (`git check-ignore .env` ✓).
- `.env` has never been committed (`git log --all --full-history -- ".env"` returns nothing).
- `.env.example` has variable names only (empty string values).
- `git log -S` for database passwords, AUTH_SECRET, seed passwords: nothing found in history.
- `next-auth` pinned in `package.json`.

---

## 17. Environment validation

`src/server/env.ts` validates all required environment variables at startup with Zod:

- `DATABASE_URL` (required, must start with `postgresql://` or `postgres://`)
- `AUTH_SECRET` (required in production, min 32 chars)
- `NODE_ENV`
- `AUTH_URL`
- `NEXT_PUBLIC_API_BASE_URL`

`instrumentation.ts` calls `validateEnv()` on Node.js runtime startup. Failure prints variable **names** only, never values.

---

## 18. Production seed and destructive-operation guard

| Control | File |
|---|---|
| Production seed (`seed:prod`): creates only Admin + 12 classes + sections + subjects, no demo data | `prisma/seed-prod.ts` |
| Destructive guard: `db:reset` and demo seed refuse when `NODE_ENV=production` or `DATABASE_URL` is not localhost | `scripts/db-guard.ts` |
| Override: `ALLOW_NON_LOCAL_DB=1` | same |

---

## 19. Admin password recovery

`scripts/admin-reset-password.ts`:
- Reads credentials from `ADMIN_RESET_LOGIN` / `ADMIN_RESET_PASSWORD` env vars, or interactive prompt.
- Requires `--confirm` flag.
- Validates password (12+ chars with digit).
- Increments `sessionVersion` (invalidates all existing sessions).
- Writes an audit row.
- Never prints the password.

Script: `npm run admin:reset-password -- --confirm`

---

## 20. Database indexes (B7)

Added in `20261118120000_b7_security_hardening`:

| Index | Table | Columns |
|---|---|---|
| Composite | `users` | `role, is_active` |
| Composite | `fees` | `status, due_date` |
| Composite | `payments` | `status, paid_at` |
| Composite | `audit_log` | `action, created_at` |

---

## 21. Foreign key delete rules

All critical entities use `onDelete: Restrict`:
- Students, attendance records, exam results, fees, payments, receipts, classes, sections, subjects.

`SetNull` for optional references (markers, reviewers, authors).  
`Cascade` only where it is safe: notice → attachments, album → photos, routine → periods.

---

## 22. Dropped tables

`navigation_items` and `portal_nav_items` were unused — the navbar is built in code, not from a database table. Both were dropped in the B7 migration.
