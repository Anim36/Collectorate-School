# Decisions

The standing decisions of the backend phase. Each one is a rule the code
already follows; a change to any of them is a change to the code that carries
it, not just to this file.

## School structure

- The school teaches 12 classes: Nursery, KG and Class 1 to Class 10.
- Every class carries one default section ("Default", `isDefault: true`). The
  `sections` table stays because attendance, routines and the class teacher
  are recorded against a section, but the UI never shows a section.
- Class labels are the plain names the database keeps — "Class 9", never
  "9/A". No section string appears anywhere in the public or portal UI.
- Nursery and KG are graded `GRADE_ONLY` (letter grades only); Class 1 to
  Class 10 are graded `GPA` (grade point computed).
- Classes are always ordered by `sortOrder` (0 for Nursery through 11 for
  Class 10).

## Accounts

- There is no public signup. An Admin creates every account.
- A new account has `mustChangePassword` set, so the first sign-in lands on
  `/change-password` before anything else.
- The admin panel signs in through a separate `/admin/login`; the public
  `/login` never grants an admin role.
- Sign-in is by `loginId`; role is decided by the account row, and the route
  guards enforce a strict role-to-portal mapping.
- Repeated failed sign-ins lock the account (`failedLoginCount`,
  `lockedUntil`) instead of letting guesses continue.

## Payments

- Money is stored as integers of poisha. No float ever holds an amount;
  taka formatting happens only at the edge (`src/lib/money.ts`,
  `formatPoisha`).
- No card data is stored anywhere.
- A payment a student submits is `PENDING`. It becomes `PAID` only when an
  Admin approves it, or when a gateway confirms it. See
  `docs/KNOWN_ISSUES.md` for the payment-verification decision.

## Attendance

- A teacher edits attendance for the current day and the last 3 days.
- An Admin edits attendance for any day.

## Files

- Uploaded files live in `uploads/` outside the web root, so nothing is
  served until the file route decides the visitor may have it.
- `/api/files/[id]` is permission-checked: an approved photograph of a public
  album is public; an attachment of a published notice follows the notice's
  audience; drafts and pending photographs are admin-only.

## Architecture

- Every read and write goes page → server action → service → Prisma. Pages
  never touch the database directly.
- Every action checks the session, the role and (where it applies)
  ownership, and validates its input with Zod before it reaches a service.
- Important writes append to the audit log.
- No service ever returns a `passwordHash`.
- Public reads (`src/server/services/public-*.ts`) select an explicit
  allow-list of fields only: no phone, no email, no address, no guardian or
  user data. The public notice board serves `PUBLISHED` notices addressed to
  `PUBLIC`; the gallery serves approved photographs in public albums; the
  routine serves published routines; the staff directory shows name,
  designation, subject and photo — an email only when the school publishes
  one (there is no public-contact flag yet, so none is shown).
- Public pages are statically rendered with `revalidate = 300` and read
  through `unstable_cache` tagged by kind (`src/server/cache-tags.ts`). The
  admin actions call `revalidatePublicCache(tag)` after every successful
  write, so a change reaches the public pages immediately.
- Money crosses the UI only through `formatPoisha`; fee tables for all 12
  classes come from `FeeStructure` of the current academic year.

## Process

- The backend phase does not change frontend visuals: components keep their
  Figma geometry; only their data sources were replaced.
- Nothing is committed or pushed without the user's instruction; scratch and
  QA files live only in `scripts/qa/`.

## Committed so far

- **B1b** — schema, migrations, generated client, DB helpers.
- **B2** — auth: NextAuth credentials, guards, lockout, change-password.
- **B3** — admin users, classes and subjects services + actions.
- **B3B** — admin notices, gallery, routine, calendar, fees services +
  actions; audit log on writes.
- **B3C** (`7658e91`) — admin portal pages wired to the database.
- **B4** — teacher portal services, actions and pages (uncommitted at the
  time of writing).
- **B5** — student portal wired to the database (`836624e` + `bc60170`, on
  both `backend` and `b5-wip`).
- **B6** — public pages wired to the database (this step; uncommitted).

## Remaining order

1. **B3C** — admin portal on the database. *(done)*
2. **B4** — teacher portal on the database. *(done, uncommitted)*
3. **B5** — student portal on the database. *(done)*
4. **B6** — public pages on the database. *(this step)*
5. **B7** — final hardening pass (rate limits, upload edge cases, remaining
   polish).
6. **Final Audit** — full-pass review of privacy, counts, and the seed, with
   every QA script green.
