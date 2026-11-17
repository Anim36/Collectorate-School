# Verification scripts

The scripts here measure the app against the Figma frames, check its behaviour
in a real browser and keep the build honest. They are not part of the app and
nothing in `src/` imports them.

Every script that drives a browser talks to Chrome over the DevTools Protocol
on `http://localhost:9222`, and every script that measures a page expects the
app on `http://localhost:3111`.

## Getting a browser and a server up

```powershell
# Start Chrome with the DevTools Protocol on port 9222.
powershell -File scripts/start-cdp.ps1

# Build the app and serve it on port 3111.
powershell -File scripts/rebuild-and-restart.ps1
```

| Script | What it does |
| --- | --- |
| `scripts/start-cdp.ps1` | Starts Chrome with `--remote-debugging-port=9222`. |
| `scripts/stop-cdp.ps1` | Stops that Chrome. |
| `scripts/start-server.ps1` | Starts `next start` on port 3111. |
| `scripts/stop-server.ps1` | Stops the server on port 3111. |
| `scripts/restart-server.ps1` | Stops and starts the server on port 3111. |
| `scripts/rebuild.ps1` | Builds the app and starts the server. |
| `scripts/rebuild-and-restart.ps1` | Builds the app and restarts the server, so the compare scripts measure the current source. |
| `scripts/find-browser.ps1` | Prints the path of the Chrome install the scripts use. |
| `scripts/capture.mjs` | Captures a full-page screenshot of a route. `node scripts/capture.mjs <route> <width> <outFile> [theme]` |
| `scripts/screenshot.ps1` | The same, with headless Chrome instead of the debug browser. |

---

## The compare scripts

Each one renders a route in the debug browser and compares the measured
geometry with the Figma frame the mockup came from. They all take the route
and the width, and the optional `--dark` flag for the dark frames.

| Script | Routes it owns |
| --- | --- |
| `scripts/compare-home.mjs` | `/` |
| `scripts/compare-page.mjs` | `/admission`, `/teachers`, `/about` |
| `scripts/compare-auth.mjs` | `/login`, `/change-password` |
| `scripts/compare-step6.mjs` | `/notice`, `/notice/:id`, `/gallery`, `/gallery/:albumId`, `/calendar`, `/routine` |
| `scripts/compare-student.mjs` | The student, teacher and admin portal routes. |
| `scripts/compare-11b.mjs` | `/admin/notices`, `/admin/gallery`, `/admin/routine`, `/admin/calendar` |
| `scripts/compare-11c.mjs` | `/admin/fees`, `/admin/audit-log` |
| `scripts/compare-portal.mjs` | The portal shell of the three dashboards. |
| `scripts/compare-11c-notice.mjs` | The empty state of the public notice board. |
| `scripts/compare-layout.ps1` | The horizontal bands of a page, by colour. |

`scripts/student-9d-probes.mjs` holds the probes the fee pages are measured
with, and `scripts/open-csv-import.js` opens the bulk CSV import panel so its
geometry can be measured.

---

## The behaviour checks

These drive the app in the debug browser and report what each interaction
produced.

| Script | What it checks |
| --- | --- |
| `scripts/check-interactions.mjs` | The navbar dropdown, the mobile drawer and the active link. |
| `scripts/check-dropdown.mjs` | The desktop "Admission" dropdown, opened with a real mouse click. |
| `scripts/check-portal-tabs.mjs` | The bottom tab icons and the "More" menu entries. |
| `scripts/check-admin.mjs` | The users page and the classes page. |
| `scripts/check-admin-11b.mjs` | The notice editor, the gallery albums, the routine cells and the calendar filters. |
| `scripts/check-admin-11c.mjs` | The fees filters, the fee structure editor, mark-as-paid and the audit log. |
| `scripts/check-admin-toast.mjs` | That the admin actions raise a toast. |
| `scripts/check-admin-toasts-flow.mjs` | The add-user, deactivate, activate and reset-password toasts. |
| `scripts/check-add-user-validation.mjs` | The add-user validation rules. |
| `scripts/check-csv-picker.mjs` | That a picked CSV file fills the preview table. |
| `scripts/check-empty.mjs` | The empty state when no staff match the filters. |
| `scripts/check-filters.mjs` | The `/teachers` filters. |
| `scripts/check-gallery-approval.mjs` | How a teacher upload and the admin approval queue relate. |
| `scripts/check-month-switch.mjs` | The attendance month selector. |
| `scripts/check-notice-editor.mjs` | That the notice editor loads its chunk on demand and works. |
| `scripts/check-notice-editor-typing.mjs` | Typing into the notice editor and opening another notice. |
| `scripts/check-routine-subject.mjs` | The routine "Selected period" dropdown, opened with a real mouse click. |
| `scripts/check-student-9b.mjs` | The result exam selector and the fee payment modal. |
| `scripts/check-student-9d.mjs` | The payment method page and the receipt page. |
| `scripts/check-student-9d-flow.mjs` | The payment flow from the details to the receipt. |
| `scripts/check-student-9d-answers.mjs` | The print run of the receipt, the fee links and the card number. |
| `scripts/check-student-nav.mjs` | That each portal route marks the right sidebar row and bottom tab. |
| `scripts/check-teacher.mjs` | The teacher portal routes in the debug browser. |
| `scripts/check-9c-interactions.mjs` | The student notice filters and the album lightbox. |
| `scripts/check-users-pagination.mjs` | That the pagination count follows the filtered data. |
| `scripts/check-console.mjs` | The console errors and the failed requests of a route. `node scripts/check-console.mjs <route> [width]` |
| `scripts/check-bundle.mjs` | Which chunk carries a library, and whether it loads with the page. `node scripts/check-bundle.mjs <route> <needle>` |
| `scripts/verify-*.mjs` and `scripts/verify-student.ps1` | Run a compare script across a set of routes and print a pass/fail summary. |

---

## The QA scripts

`scripts/qa/` holds the one-off measuring and inspection scripts, and the
step 12 audits.

| Script | What it does |
| --- | --- |
| `scripts/qa/route-inventory.mjs` | Walks every route in `src/app`, loads it at 1440, 768 and 375 in both themes, and reports the status, the console errors and the links that point at a route the app does not serve. |
| `scripts/qa/figma-deviation.mjs` | Runs the compare scripts for every route that has a Figma reference, at every breakpoint and in both themes, and reports the largest deviation per route and breakpoint. It signs in with the role each portal page needs, so a portal page is measured and not the dashboard of the session that is open. |
| `scripts/qa/session.mjs` | Signs the debug browser in with the role a portal page needs, or signs it out. `node scripts/qa/session.mjs STUDENT` |
| `scripts/qa/qa-portal-accounts.ts` | Puts a QA student and a QA teacher in place, so the portal pages can be measured with a session of the right role. |
| `scripts/qa/dark-a11y-audit.mjs` | Walks every route in both themes and reports text below the AA contrast ratio, invisible borders, chart and calendar colours too close to the surface, missing alt text, inputs without a label and icon-only buttons without an accessible name. |
| `scripts/qa/keyboard-check.mjs` | Drives the interactive parts of the app with the keyboard only: the navbar dropdown, the mobile drawer, the modal focus trap, the tabs and the lightbox. |
| `scripts/qa/anchor-targets.mjs` | Checks every in-page anchor link against the anchors the target page renders. |
| `scripts/qa/measure-notice-board.mjs` | Measures the blocks of the public notice board on mobile. |
| `scripts/qa/measure-navbar.mjs` | Measures the sticky navbar band, the brand, the navigation pill and the utility group at 1440, 1366, 1280, 1024, 768 and 375. |
| `scripts/qa/measure-navbar-style.mjs` | Reads the computed style of the parts of the sticky navbar that carry the glass look: the divider, the notice badge and the underline under the open page. |
| `scripts/qa/measure-navbar-utility.mjs` | Reads the computed style of the utility group, so a button that keeps its own surface over the photograph shows up. |
| `scripts/qa/measure-navbar-dark.mjs` | Reads the sticky navbar in the dark theme. |
| `scripts/qa/check-navbar.mjs` | Checks that the band stays at the top while the page scrolls, that the mobile drawer opens with every link visible and that the drawer closes itself on a route change. |
| `scripts/qa/crop-band.mjs` | Cuts the top band out of a page screenshot, so the navbar can be looked at on its own. |
| `scripts/qa/ping.mjs` | Reports whether the server and the debug browser are reachable. |
| `scripts/qa/data-exports.mjs` | Lists the exports of every file in `src/data`, for the backend handoff. |
| `scripts/qa/dead-references.mjs` | Reports the scripts that name a file which does not exist. |
| `scripts/qa/script-headers.mjs` | Prints the header of every script. |
| `scripts/qa/script-refs.mjs` | Lists the cross-script references. |

## The backend checks

These run against the real PostgreSQL database and clean up after themselves,
so they can be run again without changing the school.

| Script | What it does |
| --- | --- |
| `npm run qa:auth` | The credentials check, the lockout and the audit trail. |
| `npm run qa:auth-routes` | The route protection: who reaches which portal. |
| `npm run qa:auth-password` | The change-password form, driven in the debug browser. |
| `npm run qa:auth-logout` | The sign-out control, driven in the debug browser. |
| `npm run qa:admin` | The admin services: the accounts, the classes, the subjects, the allocations and the CSV import. |
| `npm run qa:admin-roles` | The admin server actions over HTTP: an admin may run them, nobody else may. |
| `npm run qa:admin-11b` | The admin notices, gallery, routine and calendar services, the uploads and the audit trail. |
| `npm run qa:admin-11b-security` | The upload rules, the file names and the sanitizing of the notice body. |
| `npm run qa:admin-11b-http` | The admin server actions and the file route over HTTP: who may run them and who may see a file. |
| `npm run qa:admin-11c` | The admin fees, audit log and dashboard services: the filters, the pagination, the issue of a billing slot, the payment, the receipt and the export. |
| `npm run qa:student-b5` | The student portal: every student route over HTTP with a real session, the isolation of one student's data from another's, the read-only rule of the dashboard and the payment race — two submissions of the same fee line at the same moment leave exactly one waiting payment behind. |
| `npm run qa:teacher-b6` | The teacher portal: every teacher route over HTTP with a real session, the isolation of one teacher's classes and subjects from another's, the read-only rule of the dashboard and the notice board, and the rule that a day that has not come yet cannot be marked. |

`npm run qa:auth-password` and `npm run qa:auth-logout` drive the debug
browser, so it has to be up. `npm run qa:admin-roles` and
`npm run qa:admin-11b-http` talk to the server on port 3111, so a build has to
be running there. `npm run qa:student-b5` and `npm run qa:teacher-b6` talk to
the server on port 3111 as well, and they need the seeded database, because the
checks write to it.

The student checks make a throwaway student of their own, so they can be run
again at any time. The same script puts the student in place or takes it away
on its own:

```powershell
npx tsx scripts/qa/check-student-b5.ts --setup
npx tsx scripts/qa/check-student-b5.ts --teardown
```

The teacher checks make a throwaway teacher of their own, and they work the
same way:

```powershell
npx tsx scripts/qa/check-teacher-b6.ts --setup
npx tsx scripts/qa/check-teacher-b6.ts --teardown
```

The QA teacher of the portal comparisons takes over the class teacher of Class
9 and the allocation of Science in it, so that the pages have something to show.
The teardown puts those rows back the way the seed describes them:

```powershell
npx tsx scripts/qa/qa-portal-accounts.ts --teardown
```

The checks write to the real database, so they clean up after themselves. The
browser check `scripts/check-admin-11b.mjs` changes rows of the school, so it
puts them back the way the seed describes them when it is done; the same is
true of `scripts/qa/restore-seed-state.ts`, which can be run on its own to put
the database back after a check that was interrupted.

The rest of `scripts/qa/` are the single-purpose probes: `measure-*.mjs`
prints the geometry of a page, `inspect-*.mjs` prints the computed style of an
element, `dump-*.mjs` prints the markup of a Figma node, and `extract-*.mjs`
pulls a frame out of the cached Figma payload. They take their arguments from
the command line and are described in their own header.

---

## Running the whole step 12 audit

```powershell
# The dev server and the debug browser have to be up.
powershell -File scripts/start-cdp.ps1
powershell -File scripts/rebuild-and-restart.ps1

# The accounts the portal pages are measured with.
npx tsx scripts/qa/qa-admin-account.ts
npx tsx scripts/qa/qa-portal-accounts.ts
npx tsx scripts/qa/seed-compare-account.ts

node scripts/qa/route-inventory.mjs
node scripts/qa/figma-deviation.mjs
node scripts/qa/dark-a11y-audit.mjs
node scripts/qa/keyboard-check.mjs
node scripts/qa/anchor-targets.mjs
```

Each of them exits non-zero when it finds a problem, so they can be chained in
a pipeline.

## The scratch files

The scripts write their output to `.tmp-*` files in the project root and to
`figma-pages/` and `figma-tmp/`. All three are in `.gitignore`, so they stay
out of the repository.
