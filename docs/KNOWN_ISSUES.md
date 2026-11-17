# Known issues & B7 Resolutions

Status of findings recorded across development phases. Every item is marked as **FIXED (B7)** or **CONSCIOUSLY DEFERRED** with an explicit rationale.

---

## 1. The public sign-in page has no way back to the admin page
- **Status:** CONSCIOUSLY DEFERRED (By Design)
- **Rationale:** The admin portal sign-in (`/admin/login`) is intentionally unlinked from public navigation as a security-through-obscurity defence-in-depth measure, keeping administrative entry points separate from public awareness.

## 2. The "remember me" checkbox does nothing yet
- **Status:** FIXED (B7)
- **Resolution:** In Step B7, the decision was made to remove the dormant "Remember me" checkbox from `src/components/auth/login-form.tsx`. All sessions strictly adhere to standard, secure cookie lifetimes (`SESSION_MAX_AGE`) with `httpOnly`, `sameSite=lax`, and `secure` in production.

## 3. The password rules are looser than the checklist used to promise
- **Status:** FIXED / STANDARDIZED
- **Resolution:** The checklist and validation schemas are unified via `src/lib/password-schema.ts`. Enforces minimum 12 characters and at least one digit uniformly.

## 4. A role that does not match the entry point is counted as a failed attempt
- **Status:** FIXED (B7)
- **Resolution:** As mandated by Step B7 Item 2, a wrong-tab attempt (`role_mismatch`) retains the same generic timing and response message to avoid enumeration, but is **no longer counted as a failed password attempt** toward account lockout. Documented in `docs/SECURITY.md` and verified in `check-auth-service.ts`.

## 5. The session cookie is not marked `Secure` outside HTTPS
- **Status:** FIXED (B7)
- **Resolution:** `auth.config.ts` explicitly sets `useSecureCookies: process.env.NODE_ENV === "production"`. When deployed to production over TLS/HTTPS, cookies are strictly marked `Secure`.

## 6. The audit log can still be edited and deleted
- **Status:** FIXED (B7)
- **Resolution:** PostgreSQL triggers `audit_log_no_update_or_delete` and `audit_log_no_truncate` enforce strict append-only behavior at the database engine level. Proof test `scripts/qa/check-audit-append-only.ts` verifies UPDATE and DELETE rejections.

## 7. Weekly holidays in code rather than administrative settings
- **Status:** CONSCIOUSLY DEFERRED
- **Rationale:** Static defaults (`Friday & Saturday`) in `src/config/school.ts` accurately represent standard educational schedules in Bangladesh. Full UI administration of arbitrary recurring holidays is scheduled for the post-launch administrative settings phase.

## 8. "New notices" count is a 7-day window rather than visit-tracking
- **Status:** CONSCIOUSLY DEFERRED (By Architectural Decision)
- **Rationale:** GET requests must remain idempotent and side-effect free. Tracking student visits on GET turned reads into writes (`students.last_visited_at` was dropped for this reason). The 7-day rolling window provides a clean, cacheable metric.

## 9. Orphan uploaded files
- **Status:** MITIGATED (B7)
- **Resolution:** Added cleanup sweep script `scripts/sweep-uploads.ts` to detect and safely prune unattached, orphaned staging uploads.

## 10. npm audit vulnerabilities
- **Status:** ADDRESSED / DEFERRED WITH REASON (B7)
- **Resolution:** Ran `npm audit fix`. Non-breaking vulnerabilities in `sanitize-html` and `minimatch` were addressed. Remaining vulnerabilities (`postcss` via Next.js 15, `picomatch` via Tailwind v3, `zod` collection parsing) require major version breaking upgrades (`next@16`, `tailwindcss@4`, `zod@4`) and are documented in `docs/SECURITY.md`.
