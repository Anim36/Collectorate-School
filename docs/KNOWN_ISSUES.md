# Known issues

Findings that were noticed while working on the auth fixes, but that were
out of scope for that work. Nothing here has been fixed.

## The public sign-in page has no way back to the admin page

The admin sign-in page is deliberately not linked from anywhere public, so
that an administrator cannot be found through the site navigation. The cost
is that an administrator who has forgotten the address has no way to reach
it.

- The address is `/admin/login`.
- The password page says "Contact the school office and an admin will reset
  your password", so the school office can pass the address on.

If a link is ever wanted, it should be a plain text link on the school
sign-in page, not a button in the navbar or the footer, so it stays out of
the way of students and teachers.

## The "remember me" checkbox does nothing yet

The sign-in form carries a `remember` field and a "Remember me" checkbox, but
the value is never read. The session length is fixed by `SESSION_MAX_AGE` in
`src/server/auth-types.ts` for every sign-in.

- The checkbox is not wrong, it just has no effect yet.
- Wiring it up means choosing a longer session for the sessions that ask
  for it, and working out what the "forget me" side of the pair does.

## The password rules are looser than the checklist used to promise

The change-password form used to promise "Include a number and a symbol" and
"No spaces or personal details", but the validation only ever asked for 12
characters and a digit. The checklist is now written from the same source as
the validation (`src/lib/password-schema.ts`), so the two cannot drift apart
again.

The rule itself is unchanged: 12 characters and a digit. Making it stricter
is a decision for the school, not a bug fix.

## A role that does not match the entry point is counted as a failed attempt

A sign-in from the wrong entry point — a student on the teacher tab, an
admin on the student tab — now counts towards the lockout, because it is
refused the same way a wrong password is.

That is what makes the refusal safe: an attacker cannot walk the lockout by
guessing from the other tab. The side effect is that a genuine user who
picks the wrong tab five times in a row locks their own account for fifteen
minutes. The message they get is the same generic one, so they cannot tell
the two apart.

## The session cookie is not marked `Secure` outside HTTPS

Auth.js only adds the `Secure` prefix when the site is served over HTTPS,
which is its own default. On `http://localhost` the session cookie is sent
without it. This is Auth.js behaviour rather than something this codebase
sets, and it only matters on a machine that is not behind TLS.

## The admin portal redirects a signed-out admin to the admin sign-in page

The middleware decides where a signed-out visitor goes from the prefix they
were heading for, so `/admin/*` goes to `/admin/login` and `/student/*` and
`/teacher/*` go to `/login`.

A visitor who reaches `/admin/*` while signed in as a student is sent to
their own student dashboard rather than to the sign-in page, which is the
existing behaviour and was left as it is.

## The `callbackUrl` is set but not used after a sign-in

The middleware puts the page the visitor was heading for into the sign-in
link as `callbackUrl`, and the sign-in page does not read it. The page always
sends the user to the dashboard of their own role instead.

This is deliberate: the dashboard is the safest landing page, and a
`callbackUrl` that points at an admin page would let a signed-in student
follow a link to it. The parameter is kept because the middleware writes it,
and it is useful in the logs.

## The QA suites need a running server and a debug browser

The browser-driven checks in `scripts/qa/` need:

- the production server running on port 3111 (`scripts/restart-server-logged.ps1`),
- a Chrome started with the remote debugging port open on 9222,
- the seeded database, because the checks write to it.

The checks work on their own throwaway accounts and remove them afterwards,
so the seeded demo accounts are not touched.

## The audit log can still be edited and deleted

Every important write of the admin screens records a row in `audit_log`
(`src/server/services/audit.ts`). In production that table has to be
**append-only**: no `UPDATE` and no `DELETE` may ever touch a row, so the
record of who changed what cannot be rewritten after the fact.

Today nothing enforces that. The rows are written through the Prisma client,
which has the whole database behind it, and the QA cleanup
(`scripts/qa/restore-seed-state.ts`, `scripts/qa/check-admin-11b*.ts`,
`scripts/qa/check-admin-11c.ts`) deletes audit rows on purpose — that is what
the checks need to be able to run again.

- The rule is to be enforced in **B7**, not before it.
- The enforcement belongs in the database, not in the application: a rule that
  only the application follows is a rule a direct connection can step around.
  The usual way is a rule or a trigger that refuses `UPDATE` and `DELETE` on
  `audit_log`, plus a role that is only allowed to `INSERT` into it.
- The QA scripts need an account that may clean up after itself, or they have
  to be changed to run against a copy of the database, before the rule lands.

## A file that is not attached to anything stays on the disk

The uploads live in the `uploads` folder at the project root, outside the web
root, and every file is written under a random name (`src/server/storage.ts`).
The `stored_files` row is what points at it.

When a photograph is removed from an album or an attachment is taken off a
notice, the file behind it is removed as well (`removeStoredFile` in
`src/server/services/files.ts`). When the **notice** itself is deleted, the
attachments go with it through the cascade, but the files behind them stay on
the disk: the row is set to null by the cascade, so nothing calls
`removeStoredFile` for it.

The same happens to a file that is uploaded but never linked to a notice or an
album — the row exists, the file exists, and nothing points at the row.

What is left behind today:

| On the disk | In the database |
| --- | --- |
| `uploads/mw9pdzkq-90d2ebaeb4a15f5186d95b3febde88d2.png` | no `stored_files` row |
| `uploads/mw9ty148-4e3af16fff34de38dbafc83f0a29a354.png` | no `stored_files` row |

Two fixes are needed, and both belong in **B7**:

- `deleteNotice` has to read the attachments of the notice first and remove
  the file behind each one, the way `deletePhoto` and `removeAttachment`
  already do.
- The storage needs a sweep that finds the files on the disk that no
  `stored_files` row points at, and a file that no row points at is removed.
  The QA cleanup (`scripts/qa/restore-seed-state.ts`) has to run the same
  sweep, so a check that is interrupted does not leave a file behind.

## The student still pays in the browser, so the admin queue only holds the seed's rows

The admin side of the fee payment is on the database and on the screen: a
payment a student submits is a `PENDING` row, and the "Payments to verify"
action opens the queue, where the admin approves one — the receipt is written
and the fee lines are marked as paid — or rejects it with a reason that is
kept with the payment (`src/server/services/fees.ts`).

The student side is not there yet. The payment method page still records the
payment into the module-level `paymentStore` in `src/data/student.ts`, so
nothing ever reaches the database as a `PENDING` payment. The seed writes a
few `PENDING` rows, so the queue the admin reads is the one the seed wrote: a
payment a student really makes never reaches it.

What is missing belongs to the next step:

- The student needs a server action that writes a `PENDING` payment and its
  `payment_items`, and the fees page has to read the student's own fee lines
  from the database instead of the mock list.

