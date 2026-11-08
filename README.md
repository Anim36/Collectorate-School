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

### Environment

Nothing is required to run the app. `.env.example` lists the variables the
backend will need; copy it to `.env.local` when there is something to put in
it.

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
