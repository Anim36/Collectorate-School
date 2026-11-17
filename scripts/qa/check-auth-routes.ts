import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { deleteQaAuditRows } from "./audit-cleanup";
import {
  connectBrowser,
  sleep,
  SET_VALUE_HELPER,
} from "./browser";

/**
 * The route protection checks.
 *
 * They drive the running server over HTTP with a cookie jar, so they cover
 * the middleware, the server-side guards and the session cookie itself.
 *
 * The tests work on their own throwaway accounts, so the seeded demo
 * accounts are never touched.
 *
 * Usage: npx tsx scripts/qa/check-auth-routes.ts [baseUrl]
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3111";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PASSWORD = "Route-Test-Pass-2026!";

const results: { name: string; pass: boolean; detail: string }[] = [];

function check(name: string, pass: boolean, detail = ""): void {
  results.push({ name, pass, detail });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`,
  );
}

/** Reads a string field out of a page result. */
function text(result: { value?: unknown; error?: string }, key: string): string {
  if (result.value && typeof result.value === "object" && key in result.value) {
    return String((result.value as Record<string, unknown>)[key]);
  }

  return "";
}

/** Reads a boolean field out of a page result. */
function flag(result: { value?: unknown; error?: string }, key: string): boolean {
  if (result.value && typeof result.value === "object" && key in result.value) {
    return Boolean((result.value as Record<string, unknown>)[key]);
  }

  return false;
}

/** The ids of the accounts the tests sign in with. */
const IDS = {
  student: "route-test-student",
  teacher: "route-test-teacher",
  admin: "route-test-admin",
  inactive: "route-test-inactive",
  mustChange: "route-test-must-change",
};

async function createTestAccounts(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const accounts = [
    { id: IDS.student, role: "STUDENT" as const, mustChange: false },
    { id: IDS.teacher, role: "TEACHER" as const, mustChange: false },
    { id: IDS.admin, role: "ADMIN" as const, mustChange: false },
    { id: IDS.inactive, role: "STUDENT" as const, mustChange: false },
    { id: IDS.mustChange, role: "STUDENT" as const, mustChange: true },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { loginIdNormalized: account.id.toLowerCase() },
      update: {
        loginId: account.id,
        passwordHash,
        role: account.role,
        isActive: account.id !== IDS.inactive,
        mustChangePassword: account.mustChange,
        failedLoginCount: 0,
        lockedUntil: null,
        sessionVersion: 0,
      },
      create: {
        id: account.id,
        loginId: account.id,
        loginIdNormalized: account.id.toLowerCase(),
        name: `Route Test ${account.role}`,
        email: `${account.id}@example.com`,
        passwordHash,
        role: account.role,
        isActive: account.id !== IDS.inactive,
        mustChangePassword: account.mustChange,
      },
    });
  }
}

async function removeTestAccounts(): Promise<void> {
  await deleteQaAuditRows(prisma, { entityIds: Object.values(IDS) });

  await prisma.user.deleteMany({
    where: { loginId: { in: Object.values(IDS) } },
  });
}

/**
 * Clears the failed login count of an account.
 *
 * The mismatch checks count a refusal, so the counter has to be put back to
 * zero before and after them.
 */
async function resetFailedCount(loginId: string): Promise<void> {
  await prisma.user.update({
    where: { loginId },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
}

/**
 * A cookie jar, so a signed-in session can be carried between requests.
 */
class CookieJar {
  private cookies = new Map<string, string>();

  store(setCookie: string[] | undefined): void {
    for (const entry of setCookie ?? []) {
      const [pair] = entry.split(";");
      const index = pair.indexOf("=");

      if (index < 0) continue;

      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();

      if (value === "") {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  header(): string {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  clear(): void {
    this.cookies.clear();
  }
}

/** The answer to a request. */
interface Response {
  status: number;
  location: string | null;
  body: string;
}

/** Makes a request and follows the cookies. */
async function request(
  path: string,
  options: { method?: string; jar?: CookieJar; body?: string; headers?: Record<string, string> } = {},
): Promise<Response> {
  const jar = options.jar;
  const headers: Record<string, string> = { ...options.headers };

  if (jar && jar.header()) headers["cookie"] = jar.header();
  if (options.body) headers["content-type"] = "application/x-www-form-urlencoded";

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body,
    redirect: "manual",
  });

  jar?.store(response.headers.getSetCookie());

  return {
    status: response.status,
    location: response.headers.get("location"),
    body: await response.text(),
  };
}

/**
 * Signs in through the Auth.js endpoint and keeps the session cookie.
 */
async function signIn(
  loginId: string,
  password: string,
  role: string,
): Promise<{ jar: CookieJar; signedIn: boolean }> {
  const jar = new CookieJar();

  // The CSRF token has to be fetched first.
  const csrf = await request("/api/auth/csrf", { jar });
  const token = /"csrfToken":"([^"]+)"/.exec(csrf.body)?.[1] ?? "";

  const response = await request("/api/auth/callback/credentials", {
    method: "POST",
    jar,
    body: new URLSearchParams({
      csrfToken: token,
      loginId,
      password,
      role,
      callbackUrl: `${BASE_URL}/`,
      json: "true",
    }).toString(),
  });

  // Auth.js answers a successful sign-in with a redirect to the callback.
  const signedIn =
    response.status === 200 &&
    (response.body.includes('"url"') || response.location !== null);

  return { jar, signedIn };
}

/** Reads the session the server holds for a cookie jar. */
async function readSession(jar: CookieJar): Promise<{
  authenticated: boolean;
  role: string | null;
  name: string | null;
  hasHash: boolean;
  body: string;
}> {
  const response = await request("/api/auth/session", { jar });

  return {
    authenticated: response.status === 200 && response.body.includes('"user"'),
    role: /"role":"([^"]+)"/.exec(response.body)?.[1] ?? null,
    name: /"name":"([^"]+)"/.exec(response.body)?.[1] ?? null,
    hasHash: response.body.includes("passwordHash") || response.body.includes("$2b$"),
    body: response.body,
  };
}

async function main(): Promise<void> {
  await createTestAccounts();

  // The browser is used for the checks that read the rendered page, such as
  // the label and the placeholder of the id field.
  const browser = await connectBrowser();
  await browser.send("Network.clearBrowserCookies");

  /* --- 1. An unauthenticated request to a portal goes to the sign-in page. */

  const anonymous = new CookieJar();

  const studentRoute = await request("/student/dashboard", { jar: anonymous });
  const teacherRoute = await request("/teacher/dashboard", { jar: anonymous });
  const adminRoute = await request("/admin/dashboard", { jar: anonymous });

  check(
    "an unauthenticated request to /student goes to /login",
    studentRoute.status === 307 &&
      (studentRoute.location ?? "").includes("/login"),
    `${studentRoute.status} ${studentRoute.location}`,
  );

  check(
    "an unauthenticated request to /teacher goes to /login",
    teacherRoute.status === 307 &&
      (teacherRoute.location ?? "").includes("/login"),
    `${teacherRoute.status} ${teacherRoute.location}`,
  );

  check(
    "an unauthenticated request to /admin goes to /admin/login",
    adminRoute.status === 307 &&
      (adminRoute.location ?? "").includes("/admin/login"),
    `${adminRoute.status} ${adminRoute.location}`,
  );

  /* --- 2. The public pages stay open. ------------------------------------ */

  const publicPage = await request("/", { jar: anonymous });

  check(
    "a public page stays open",
    publicPage.status === 200,
    `${publicPage.status}`,
  );

  /* --- 3. The sign-in pages are open. ------------------------------------ */

  const loginPage = await request("/login", { jar: anonymous });

  check(
    "the sign-in page is open",
    loginPage.status === 200,
    `${loginPage.status}`,
  );

  const adminLoginPage = await request("/admin/login", { jar: anonymous });

  check(
    "the admin sign-in page is open",
    adminLoginPage.status === 200,
    `${adminLoginPage.status}`,
  );

  check(
    "the admin sign-in page is not linked from the school sign-in page",
    !loginPage.body.includes("/admin/login"),
    loginPage.body.includes("/admin/login") ? "linked" : "not linked",
  );

  /* --- 4. A student signs in and reaches the student portal. ------------- */

  const student = await signIn(IDS.student, PASSWORD, "STUDENT");
  const studentSession = await readSession(student.jar);

  check(
    "a student signs in and holds a session",
    studentSession.authenticated && studentSession.role === "STUDENT",
    JSON.stringify({
      role: studentSession.role,
      name: studentSession.name,
    }),
  );

  check(
    "the session never carries the password hash",
    studentSession.hasHash === false,
    studentSession.hasHash ? "hash found" : "no hash",
  );

  const studentDashboard = await request("/student/dashboard", {
    jar: student.jar,
  });

  check(
    "the student reaches the student dashboard",
    studentDashboard.status === 200,
    `${studentDashboard.status}`,
  );

  check(
    "the student dashboard shows the real name from the database",
    studentDashboard.body.includes("Route Test STUDENT"),
    studentDashboard.body.includes("Route Test STUDENT") ? "found" : "missing",
  );

  /* --- 5. A student cannot reach the teacher or admin portal. ----------- */

  const studentToTeacher = await request("/teacher/dashboard", {
    jar: student.jar,
  });
  const studentToAdmin = await request("/admin/dashboard", { jar: student.jar });

  check(
    "a student is sent away from the teacher portal",
    studentToTeacher.status === 307 &&
      (studentToTeacher.location ?? "").includes("/student/dashboard"),
    `${studentToTeacher.status} ${studentToTeacher.location}`,
  );

  check(
    "a student is sent away from the admin portal",
    studentToAdmin.status === 307 &&
      (studentToAdmin.location ?? "").includes("/student/dashboard"),
    `${studentToAdmin.status} ${studentToAdmin.location}`,
  );

  /* --- 6. A teacher reaches the teacher portal. -------------------------- */

  const teacher = await signIn(IDS.teacher, PASSWORD, "TEACHER");
  const teacherSession = await readSession(teacher.jar);

  check(
    "a teacher signs in and holds a session",
    teacherSession.authenticated && teacherSession.role === "TEACHER",
    JSON.stringify({ role: teacherSession.role }),
  );

  const teacherDashboard = await request("/teacher/dashboard", {
    jar: teacher.jar,
  });

  check(
    "the teacher reaches the teacher dashboard",
    teacherDashboard.status === 200,
    `${teacherDashboard.status}`,
  );

  const teacherToStudent = await request("/student/dashboard", {
    jar: teacher.jar,
  });

  check(
    "a teacher is sent away from the student portal",
    teacherToStudent.status === 307 &&
      (teacherToStudent.location ?? "").includes("/teacher/dashboard"),
    `${teacherToStudent.status} ${teacherToStudent.location}`,
  );

  /* --- 7. An admin reaches the admin portal from the admin page. --------- */

  const admin = await signIn(IDS.admin, PASSWORD, "ADMIN");
  const adminSession = await readSession(admin.jar);

  check(
    "an admin signs in from the admin page and holds an admin session",
    adminSession.authenticated && adminSession.role === "ADMIN",
    JSON.stringify({ role: adminSession.role }),
  );

  const adminDashboard = await request("/admin/dashboard", { jar: admin.jar });

  check(
    "the admin reaches the admin dashboard",
    adminDashboard.status === 200,
    `${adminDashboard.status}`,
  );

  const adminToStudent = await request("/student/dashboard", { jar: admin.jar });

  check(
    "an admin is sent away from the student portal",
    adminToStudent.status === 307 &&
      (adminToStudent.location ?? "").includes("/admin/dashboard"),
    `${adminToStudent.status} ${adminToStudent.location}`,
  );

  /* --- 7b. Each role signs in only from its own entry. -------------------- */

  const studentOnTeacherTab = await signIn(IDS.student, PASSWORD, "TEACHER");
  const studentOnTeacherSession = await readSession(studentOnTeacherTab.jar);

  check(
    "a student is refused on the teacher tab",
    studentOnTeacherSession.authenticated === false,
    JSON.stringify({ authenticated: studentOnTeacherSession.authenticated }),
  );

  const teacherOnStudentTab = await signIn(IDS.teacher, PASSWORD, "STUDENT");
  const teacherOnStudentSession = await readSession(teacherOnStudentTab.jar);

  check(
    "a teacher is refused on the student tab",
    teacherOnStudentSession.authenticated === false,
    JSON.stringify({ authenticated: teacherOnStudentSession.authenticated }),
  );

  const adminOnStudentTab = await signIn(IDS.admin, PASSWORD, "STUDENT");
  const adminOnStudentSession = await readSession(adminOnStudentTab.jar);

  check(
    "an admin is refused on the student tab",
    adminOnStudentSession.authenticated === false,
    JSON.stringify({ authenticated: adminOnStudentSession.authenticated }),
  );

  const adminOnTeacherTab = await signIn(IDS.admin, PASSWORD, "TEACHER");
  const adminOnTeacherSession = await readSession(adminOnTeacherTab.jar);

  check(
    "an admin is refused on the teacher tab",
    adminOnTeacherSession.authenticated === false,
    JSON.stringify({ authenticated: adminOnTeacherSession.authenticated }),
  );

  const studentOnAdminTab = await signIn(IDS.student, PASSWORD, "ADMIN");
  const studentOnAdminSession = await readSession(studentOnAdminTab.jar);

  check(
    "a student is refused on the admin page",
    studentOnAdminSession.authenticated === false,
    JSON.stringify({ authenticated: studentOnAdminSession.authenticated }),
  );

  /* --- 7c. A mismatch counts as a failed attempt. ------------------------- */

  await resetFailedCount(IDS.student);

  await signIn(IDS.student, PASSWORD, "TEACHER");

  const afterMismatch = await prisma.user.findUnique({
    where: { loginId: IDS.student },
    select: { failedLoginCount: true },
  });

  check(
    "a role mismatch increases the failed login count",
    afterMismatch?.failedLoginCount === 1,
    JSON.stringify(afterMismatch),
  );

  await resetFailedCount(IDS.student);

  /* --- 8. A signed-in user is sent away from the sign-in page. ----------- */

  const signedInAtLogin = await request("/login", { jar: admin.jar });

  check(
    "a signed-in user is sent away from /login",
    signedInAtLogin.status === 307 &&
      (signedInAtLogin.location ?? "").includes("/admin/dashboard"),
    `${signedInAtLogin.status} ${signedInAtLogin.location}`,
  );

  const signedInAtAdminLogin = await request("/admin/login", { jar: admin.jar });

  check(
    "a signed-in admin is sent away from /admin/login",
    signedInAtAdminLogin.status === 307 &&
      (signedInAtAdminLogin.location ?? "").includes("/admin/dashboard"),
    `${signedInAtAdminLogin.status} ${signedInAtAdminLogin.location}`,
  );

  /* --- 9. A wrong password does not create a session. ------------------- */

  const wrong = await signIn(IDS.student, "Not-The-Password-2026!", "STUDENT");
  const wrongSession = await readSession(wrong.jar);

  check(
    "a wrong password creates no session",
    wrongSession.authenticated === false,
    JSON.stringify({ authenticated: wrongSession.authenticated }),
  );

  /* --- 10. A deactivated account cannot sign in. ------------------------ */

  const inactive = await signIn(IDS.inactive, PASSWORD, "STUDENT");
  const inactiveSession = await readSession(inactive.jar);

  check(
    "a deactivated account cannot sign in",
    inactiveSession.authenticated === false,
    JSON.stringify({ authenticated: inactiveSession.authenticated }),
  );

  /* --- 11. An account that must change its password is held at the
         password page. --------------------------------------------------- */

  const mustChange = await signIn(IDS.mustChange, PASSWORD, "STUDENT");

  const mustChangeRoute = await request("/student/dashboard", {
    jar: mustChange.jar,
  });

  check(
    "an account that must change its password is sent to /change-password",
    mustChangeRoute.status === 307 &&
      (mustChangeRoute.location ?? "").includes("/change-password"),
    `${mustChangeRoute.status} ${mustChangeRoute.location}`,
  );

  const passwordPage = await request("/change-password", { jar: mustChange.jar });

  check(
    "the password page is reachable for a signed-in user",
    passwordPage.status === 200,
    `${passwordPage.status}`,
  );

  /* --- 12. A session made before a password change stops working. ------- */

  const changing = await signIn(IDS.teacher, PASSWORD, "TEACHER");

  const beforeChange = await request("/teacher/dashboard", { jar: changing.jar });
  check(
    "the teacher reaches the portal before the password change",
    beforeChange.status === 200,
    `${beforeChange.status}`,
  );

  // The password change bumps the session version, so the session that is
  // open no longer matches the row.
  await prisma.user.update({
    where: { loginId: IDS.teacher },
    data: { sessionVersion: { increment: 1 } },
  });

  const afterChange = await request("/teacher/dashboard", { jar: changing.jar });

  check(
    "a session made before the password change stops working",
    afterChange.status === 307 &&
      (afterChange.location ?? "").includes("/login"),
    `${afterChange.status} ${afterChange.location}`,
  );

  /* --- 13. A deactivated account loses its session at once. ------------- */

  const deactivating = await signIn(IDS.student, PASSWORD, "STUDENT");

  const beforeDeactivate = await request("/student/dashboard", {
    jar: deactivating.jar,
  });
  check(
    "the student reaches the portal before the deactivation",
    beforeDeactivate.status === 200,
    `${beforeDeactivate.status}`,
  );

  await prisma.user.update({
    where: { loginId: IDS.student },
    data: { isActive: false },
  });

  const afterDeactivate = await request("/student/dashboard", {
    jar: deactivating.jar,
  });

  check(
    "a deactivated account is refused straight away",
    afterDeactivate.status === 307 &&
      (afterDeactivate.location ?? "").includes("/login"),
    `${afterDeactivate.status} ${afterDeactivate.location}`,
  );

  /* --- 14. Signing out clears the session. ------------------------------ */

  const signingOut = await signIn(IDS.admin, PASSWORD, "ADMIN");

  const beforeLogout = await readSession(signingOut.jar);
  check(
    "the admin holds a session before signing out",
    beforeLogout.authenticated === true,
    JSON.stringify({ authenticated: beforeLogout.authenticated }),
  );

  // The sign-out needs a CSRF token, so one is fetched first.
  const logoutCsrf = await request("/api/auth/csrf", { jar: signingOut.jar });
  const logoutToken =
    /"csrfToken":"([^"]+)"/.exec(logoutCsrf.body)?.[1] ?? "";

  await request("/api/auth/signout", {
    method: "POST",
    jar: signingOut.jar,
    body: new URLSearchParams({
      csrfToken: logoutToken,
      callbackUrl: `${BASE_URL}/login`,
    }).toString(),
  });

  const afterLogout = await readSession(signingOut.jar);

  check(
    "signing out clears the session",
    afterLogout.authenticated === false,
    JSON.stringify({ authenticated: afterLogout.authenticated }),
  );

  /* --- 15. The label and the placeholder follow the tab. ----------------- */

  // The browser is used here, because the label and the placeholder are
  // read from the page as it is rendered.
  await browser.send("Network.clearBrowserCookies");
  await browser.send("Page.navigate", { url: `${BASE_URL}/login` });
  await sleep(3000);

  const studentTab = await browser.evaluate(
    `(() => {
      const field = document.querySelector('div[data-auth="identifier"] input');
      if (!field) return { label: '', placeholder: '' };

      const block = field.closest('div[data-auth="identifier"]');
      const label = block ? block.querySelector('label') : null;

      return {
        label: label ? label.textContent.trim() : '',
        placeholder: field.getAttribute('placeholder') || '',
        height: Math.round(field.getBoundingClientRect().height),
      };
    })()`,
  );

  check(
    "the student tab asks for a student id",
    text(studentTab, "label") === "Student ID / email" &&
      text(studentTab, "placeholder") === "e.g. ST-2026-0042",
    JSON.stringify(studentTab),
  );

  const teacherTab = await browser.evaluate(
    `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      ${SET_VALUE_HELPER}

      const id = document.querySelector('div[data-auth="identifier"] input');
      const pw = document.querySelector('div[data-auth="password"] input');
      if (!id || !pw) return { label: '', placeholder: '', error: 'no fields' };

      setValue(id, 'ST-2026-0042');
      setValue(pw, 'Some-Password-2026!');
      await sleep(300);

      const teacher = [...document.querySelectorAll('button')].find(
        (b) => b.textContent.trim() === 'Teacher',
      );
      if (!teacher) return { label: '', placeholder: '', error: 'no teacher tab' };

      // The tab row changes on the pointer press, so the press is what is
      // sent here rather than a click.
      teacher.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
      );
      await sleep(800);

      const field = document.querySelector('div[data-auth="identifier"] input');
      const block = field ? field.closest('div[data-auth="identifier"]') : null;
      const label = block ? block.querySelector('label') : null;

      return {
        label: label ? label.textContent.trim() : '',
        placeholder: field ? field.getAttribute('placeholder') || '' : '',
        height: field ? Math.round(field.getBoundingClientRect().height) : 0,
        identifierCleared: field ? field.value === '' : false,
        passwordCleared: pw ? pw.value === '' : false,
        errorCleared: !document.body.innerText.includes(
          'Enter your student ID or email address',
        ) && !document.body.innerText.includes(
          'Enter a valid student ID or email address',
        ),
      };
    })()`,
  );

  check(
    "the teacher tab asks for a teacher id",
    text(teacherTab, "label") === "Teacher ID / email" &&
      text(teacherTab, "placeholder") === "e.g. teacher-nusrat-jahan",
    JSON.stringify(teacherTab),
  );

  check(
    "switching tabs clears the id and the password",
    flag(teacherTab, "identifierCleared") && flag(teacherTab, "passwordCleared"),
    JSON.stringify(teacherTab),
  );

  check(
    "switching tabs clears the error",
    flag(teacherTab, "errorCleared"),
    JSON.stringify(teacherTab),
  );

  check(
    "the id field keeps the same height on both tabs",
    Number(text(teacherTab, "height")) === Number(text(studentTab, "height")),
    JSON.stringify({ student: text(studentTab, "height"), teacher: text(teacherTab, "height") }),
  );

  /* --- 16. The admin page has no tab row. -------------------------------- */

  await browser.send("Page.navigate", { url: `${BASE_URL}/admin/login` });
  await sleep(3000);

  const adminPage = await browser.evaluate(
    `(() => {
      const field = document.querySelector('div[data-auth="identifier"] input');
      if (!field) return { label: '', placeholder: '', hasTabs: false };

      const block = field.closest('div[data-auth="identifier"]');
      const label = block ? block.querySelector('label') : null;

      return {
        label: label ? label.textContent.trim() : '',
        placeholder: field.getAttribute('placeholder') || '',
        hasTabs: Boolean(document.querySelector('[data-auth="tabs"]')),
        heading: (document.querySelector('[data-auth="heading"]') || {}).textContent || '',
      };
    })()`,
  );

  check(
    "the admin page asks for an admin id",
    text(adminPage, "label") === "Admin ID / email" &&
      text(adminPage, "placeholder") === "e.g. admin",
    JSON.stringify(adminPage),
  );

  check(
    "the admin page has no tab row",
    flag(adminPage, "hasTabs") === false,
    JSON.stringify(adminPage),
  );

  /* --- 17. The tab sends its own role. ----------------------------------- */

  // The role the form sends is read from the form itself, so the check
  // covers the whole path from the tab to the server.
  await browser.send("Page.navigate", { url: `${BASE_URL}/login` });
  await sleep(3000);

  const sentRole = await browser.evaluate(
    `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      const teacher = [...document.querySelectorAll('button')].find(
        (b) => b.textContent.trim() === 'Teacher',
      );
      if (!teacher) return { role: '' };

      teacher.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
      );
      await sleep(500);

      const hidden = document.querySelector('input[name="role"]');
      return { role: hidden ? hidden.value : '' };
    })()`,
  );

  check(
    "the teacher tab sends the teacher role",
    text(sentRole, "role") === "TEACHER",
    JSON.stringify(sentRole),
  );

  await removeTestAccounts();
  await prisma.$disconnect();
  browser.close();

  console.log("");
  const failed = results.filter((result) => !result.pass);
  console.log(
    failed.length === 0
      ? `ALL ${results.length} ROUTE CHECKS PASS`
      : `${failed.length} of ${results.length} route checks failed`,
  );

  if (failed.length > 0) process.exitCode = 1;
}

void main();
