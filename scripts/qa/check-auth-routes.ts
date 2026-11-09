import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

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
      where: { loginId: account.id },
      update: {
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
  await prisma.auditLog.deleteMany({
    where: { entityId: { in: Object.values(IDS) } },
  });

  await prisma.user.deleteMany({
    where: { loginId: { in: Object.values(IDS) } },
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
    "an unauthenticated request to /admin goes to /login",
    adminRoute.status === 307 &&
      (adminRoute.location ?? "").includes("/login"),
    `${adminRoute.status} ${adminRoute.location}`,
  );

  /* --- 2. The public pages stay open. ------------------------------------ */

  const publicPage = await request("/", { jar: anonymous });

  check(
    "a public page stays open",
    publicPage.status === 200,
    `${publicPage.status}`,
  );

  /* --- 3. The sign-in page is open. -------------------------------------- */

  const loginPage = await request("/login", { jar: anonymous });

  check(
    "the sign-in page is open",
    loginPage.status === 200,
    `${loginPage.status}`,
  );

  /* --- 4. A student signs in and reaches the student portal. ------------- */

  const student = await signIn(IDS.student, PASSWORD, "student");
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

  const teacher = await signIn(IDS.teacher, PASSWORD, "teacher");
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

  /* --- 7. An admin reaches the admin portal from either tab. ------------- */

  const admin = await signIn(IDS.admin, PASSWORD, "student");
  const adminSession = await readSession(admin.jar);

  check(
    "an admin signs in from the student tab and holds an admin session",
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

  /* --- 8. A signed-in user is sent away from the sign-in page. ----------- */

  const signedInAtLogin = await request("/login", { jar: admin.jar });

  check(
    "a signed-in user is sent away from /login",
    signedInAtLogin.status === 307 &&
      (signedInAtLogin.location ?? "").includes("/admin/dashboard"),
    `${signedInAtLogin.status} ${signedInAtLogin.location}`,
  );

  /* --- 9. A wrong password does not create a session. ------------------- */

  const wrong = await signIn(IDS.student, "Not-The-Password-2026!", "student");
  const wrongSession = await readSession(wrong.jar);

  check(
    "a wrong password creates no session",
    wrongSession.authenticated === false,
    JSON.stringify({ authenticated: wrongSession.authenticated }),
  );

  /* --- 10. A deactivated account cannot sign in. ------------------------ */

  const inactive = await signIn(IDS.inactive, PASSWORD, "student");
  const inactiveSession = await readSession(inactive.jar);

  check(
    "a deactivated account cannot sign in",
    inactiveSession.authenticated === false,
    JSON.stringify({ authenticated: inactiveSession.authenticated }),
  );

  /* --- 11. An account that must change its password is held at the
         password page. --------------------------------------------------- */

  const mustChange = await signIn(IDS.mustChange, PASSWORD, "student");

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

  const changing = await signIn(IDS.teacher, PASSWORD, "teacher");

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

  const deactivating = await signIn(IDS.student, PASSWORD, "student");

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

  const signingOut = await signIn(IDS.admin, PASSWORD, "teacher");

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

  await removeTestAccounts();
  await prisma.$disconnect();

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
