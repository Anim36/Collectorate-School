# Narail Collectorate School — web

The school website and the three role portals: public, student, teacher and
admin. Built with Next.js 15 (App Router), React 19, TypeScript and Tailwind
CSS.

The design comes from a Figma file. Every page is measured against the frame
it was built from, at 1440, 768 and 375 pixels, in the light and the dark
theme. The verification scripts that do this live in `scripts/` and are
documented in [`scripts/README.md`](scripts/README.md).

The app runs on mock data today. [`docs/BACKEND_HANDOFF.md`](docs/BACKEND_HANDOFF.md)
names the table each mock file becomes and every endpoint the in-memory
changes will need.

---

## Setup

```bash
npm install
npm run dev
```

The dev server runs on <http://localhost:3000>.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | The dev server on port 3000. |
| `npm run build` | The production build. |
| `npm run start` | Serves the production build. |
| `npm run lint` | ESLint over the whole project. |
| `npm run type-check` | `tsc --noEmit`. |
| `npm run db:generate` | Generates the Prisma client into `src/generated/prisma`. |
| `npm run db:validate` | Checks the Prisma schema. |
| `npm run db:migrate` | Applies the migrations to the database and generates the client. |
| `npm run db:deploy` | Applies the migrations without a shadow database. |
| `npm run db:seed` | Writes the school structure and the demo data. Safe to run twice. |
| `npm run db:reset` | Drops the database, applies the migrations and seeds it again. |
| `npm run db:studio` | Opens Prisma Studio. |
| `npm run db:check` | Reads a few tables to prove the client reaches PostgreSQL. |
| `npm run db:counts` | Prints the row count of every seeded table. |

### Environment

Nothing is required to run the app. `.env.example` lists the variables the
backend will need; copy it to `.env` and fill them in when there is something
to put in it.

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | The PostgreSQL database the Prisma client connects to. |
| `SHADOW_DATABASE_URL` | The database Prisma replays the migrations on to work out the next one. It is dropped and rebuilt every time. |
| `SEED_ADMIN_LOGIN` | The login of the admin account the seed creates. |
| `SEED_ADMIN_PASSWORD` | Its password. |
| `SEED_DEMO_PASSWORD` | The password every demo account gets. |

### The database

The schema lives in [`prisma/schema.prisma`](prisma/schema.prisma) and covers
every entity the UI renders — the mock files in `src/data` become rows of
these tables, as [`docs/BACKEND_HANDOFF.md`](docs/BACKEND_HANDOFF.md) maps
them. `DATABASE_URL` in `.env` points at the PostgreSQL database.

```powershell
npm run db:generate   # after a schema change
npm run db:migrate    # apply the migrations
npm run db:seed       # write the school structure and the demo data
npm run db:counts     # see what was written
npm run db:check      # confirm the client reaches the database
```

The seed is idempotent: it writes every row with an upsert on its unique key,
so running it twice leaves the database as running it once did.

#### The school

The school runs from Nursery to Class 10 and every class is a single group:
there are no A/B/C sections, no boy/girl split and no shifts.

| | |
| --- | --- |
| Classes | Nursery, KG, Class 1 … Class 10 — twelve classes, ordered by `sortOrder` (0 for Nursery, 11 for Class 10) |
| Sections | One per class, named "Default" and flagged `isDefault` |
| Grading | `GPA` for Class 1 to Class 10, `GRADE_ONLY` for Nursery and KG |

The server-side client is `src/server/db.ts`. It reads `DATABASE_URL` when the
first query runs and parks the connection pool on `globalThis`, so the dev
server does not open a new pool on every reload.

### Signing in

The portals are behind Auth.js, with a credentials provider. There is no
public signup: an admin creates every account, and the seed creates the demo
ones.

| | |
| --- | --- |
| Sign-in | `loginId` and a password. A student signs in with their student id, a teacher or the admin with their email or staff id. |
| Session | A signed cookie that lasts eight hours. It carries the user id, the role, the name, the password-change flag and the session version — never the password hash. |
| Lockout | Five wrong passwords lock the account for fifteen minutes. |
| Errors | Every failure shows the same message, so the form cannot be used to work out which ids exist. |
| The tabs | The Student and Teacher tabs are a hint. An admin may sign in from either one; anyone else has to use the tab that matches their role. |
| Forgotten passwords | Handled by the admin. There is no self-service reset. |

The files:

| File | What it holds |
| --- | --- |
| `auth.config.ts` | The configuration the middleware loads. It holds nothing that needs the Node runtime. |
| `auth.ts` | The full configuration, with the credentials provider. |
| `src/middleware.ts` | The route protection. |
| `src/server/auth-guard.ts` | `getCurrentUser` and `requireRole`, which re-read the user from the database on every protected request. |
| `src/server/services/auth.ts` | The credentials check, the lockout and the audit trail. |
| `src/app/(auth)/actions.ts` | The sign-in, password change and sign-out server actions. |

The session version on the user row moves whenever the password changes or
the account is deactivated or reset. A session made before that no longer
matches the row, so it stops working straight away.

---

## The routes

Every route is listed by the role that reaches it.

### Public

| Route | The page |
| --- | --- |
| `/` | The home page: the hero, what is happening, quick access, the head's message, the gallery preview and the vision. |
| `/about` | About the school: the introduction, the vision and mission, the facilities and the timeline. |
| `/admission` | The admission steps and the fee table. |
| `/teachers` | The staff directory, with the search and the filters. |
| `/calendar` | The academic calendar, with the month switcher and the events. |
| `/routine` | The class routine. |
| `/notice` | The notice board, with the category, the date range and the pagination. |
| `/notice/[id]` | One notice in full. |
| `/gallery` | The gallery albums. |
| `/gallery/[albumId]` | The photographs of one album. |

### Authentication

| Route | The page |
| --- | --- |
| `/login` | The sign-in form, beside the campus photograph. |
| `/change-password` | The change-password form. |

### Student portal

| Route | The page |
| --- | --- |
| `/student/dashboard` | The greeting, the metrics, the attendance chart and the notices. |
| `/student/attendance` | The attendance calendar and the month history. |
| `/student/performance` | The metrics, the marks-over-time chart and the subject-wise marks. |
| `/student/result` | The exam results and the subject summary. |
| `/student/profile` | The identity card and the profile details. |
| `/student/fees` | The fee table, the summary and the payment history. |
| `/student/fees/pay` | The payment method page. |
| `/student/fees/receipt/[id]` | The printable receipt. |
| `/student/notice` | The notices published for the student. |
| `/student/notice/[id]` | One notice in full. |
| `/student/gallery` | The albums the student can see. |
| `/student/gallery/[albumId]` | The photographs of one album. |

### Teacher portal

| Route | The page |
| --- | --- |
| `/teacher/dashboard` | The greeting, the metrics and the class summary. |
| `/teacher/attendance` | The marking sheet and the history, with the month switcher. |
| `/teacher/results` | The marks of a class, with the validation panel and the publish action. |
| `/teacher/notice` | The notice board for teachers. |
| `/teacher/gallery` | The gallery upload page and the album preview. |

### Admin portal

| Route | The page |
| --- | --- |
| `/admin/dashboard` | The greeting, the metrics, the fee chart and the two tables. |
| `/admin/users` | The user list, with the search, the filters, the pagination, the add-user form and the CSV import. |
| `/admin/classes` | The classes, the subjects and the allocations. |
| `/admin/notices` | The notice editor and the notice list. |
| `/admin/gallery` | The albums and the photo approval queue. |
| `/admin/routine` | The routine of a class, with the period times and the subject picker. |
| `/admin/calendar` | The calendar events, with the month switcher and the filters. |
| `/admin/fees` | The payments, the fee structure and the mark-as-paid action. |
| `/admin/audit-log` | The audit log, with the search, the action filter and the pagination. |

### Internal

| Route | The page |
| --- | --- |
| `/design-system` | The tokens, the colours, the type scale and the components. |
| `/student`, `/teacher`, `/admin` | The role landing pages, which redirect to the dashboard. |

---

## The folder structure

```
src/
  app/                     The routes. The (public) and (auth) groups do not
                           appear in the URL.
    (public)/              The public pages and their layout.
    (auth)/                The login and change-password pages.
    student/               The student portal.
    teacher/               The teacher portal.
    admin/                 The admin portal.
    design-system/         The design-system page.
    globals.css            The theme tokens, the base layer and the print
                           stylesheet.
    fonts.ts               The fonts, loaded through next/font.
    layout.tsx             The root layout and the theme provider.
  components/
    layout/                The navbar, the footer, the portal shell: the top
                           bar, the sidebar, the bottom tab bar and the More
                           menu.
    ui/                    The primitives: the button, the input, the select,
                           the modal, the tabs, the table and the rest.
    shared/                The pieces several pages share: the cards, the
                           empty state, the table, the pagination, the toast.
    home/ admission/ about/ teachers/ notice/ gallery/ calendar/ routine/
                           The components of the public pages.
    student/ teacher/ admin/ auth/
                           The components of the portals.
  data/                    The mock data. Each file becomes a backend table;
                           see docs/BACKEND_HANDOFF.md.
  hooks/                   use-toast and use-focus-trap.
  lib/                     The cn helper and the theme scope.
  types/                   The shared types.
public/images/             The photographs.
scripts/                   The verification scripts. See scripts/README.md.
docs/                      The backend handoff.
```

---

## The design tokens

The colours live in `src/app/globals.css` as CSS variables, with one set for
the light theme and one for the dark theme. A component never names a hex
value; it names a token such as `bg-surface`, `text-ink`, `text-muted` or
`border-border`. That is what makes the dark theme a variable swap rather than
a second set of styles.

The type scale, the spacing scale and the radius scale are Tailwind
extensions in `tailwind.config.ts`, so a heading is `text-title` and a caption
is `text-caption` everywhere.

---

## The verification

Three things are checked on every change:

**The build.** `npm run build` runs the lint and the type check, and reports
the size of every route.

**The geometry.** `scripts/qa/figma-deviation.mjs` runs the compare scripts
for every route that has a Figma reference, at 1440, 768 and 375, in both
themes, and reports the largest deviation per route and breakpoint.

**The behaviour.** `scripts/qa/route-inventory.mjs` checks that every route
returns 200 and renders without console errors at each breakpoint in both
themes, and that every navbar, footer, sidebar, bottom tab and More-menu link
points at a route the app serves. `scripts/qa/dark-a11y-audit.mjs` checks the
contrast, the borders and the labels. `scripts/qa/keyboard-check.mjs` drives
the interactive parts with the keyboard only.

To run them, start the debug browser and the server first:

```powershell
powershell -File scripts/start-cdp.ps1
powershell -File scripts/rebuild-and-restart.ps1

node scripts/qa/route-inventory.mjs
node scripts/qa/figma-deviation.mjs
node scripts/qa/dark-a11y-audit.mjs
node scripts/qa/keyboard-check.mjs
```
