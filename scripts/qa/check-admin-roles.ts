import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { deleteQaAuditRows } from "./audit-cleanup";

/**
 * The role checks for the admin actions.
 *
 * They drive the server actions over HTTP, so the session and the role check
 * that every action does are covered.
 *
 * Usage: npx tsx scripts/qa/check-admin-roles.ts [baseUrl]
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3111";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PASSWORD = "Admin-Role-Pass-2026!";
const PREFIX = "admin-role";

const results: { name: string; pass: boolean; detail: string }[] = [];

function check(name: string, pass: boolean, detail = ""): void {
  results.push({ name, pass, detail });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`,
  );
}

/** The accounts the checks sign in as. */
const IDS = {
  admin: `${PREFIX}-admin`,
  teacher: `${PREFIX}-teacher`,
  student: `${PREFIX}-student`,
};

/** Removes every row the checks wrote. */
async function cleanup(): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { loginIdNormalized: { startsWith: PREFIX } },
        // The account an action creates gets a generated login id, so it is
        // found by the address it was made with.
        { email: { contains: "role-check-" } },
        { email: { contains: "should-not-exist" } },
      ],
    },
    select: { id: true },
  });

  const userIds = users.map((user) => user.id);

  await deleteQaAuditRows(prisma, { actorIds: userIds });
  await deleteQaAuditRows(prisma, { entityIds: userIds });
  await prisma.student.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.teacher.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

/** A cookie jar, so a session can be carried between requests. */
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
}

/** Makes a request and follows the cookies. */
async function request(
  path: string,
  options: { method?: string; jar?: CookieJar; body?: string } = {},
): Promise<{ status: number; location: string | null; body: string }> {
  const jar = options.jar;
  const headers: Record<string, string> = {};

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

/** Signs in and keeps the session cookie. */
async function signIn(
  loginId: string,
  role: string,
): Promise<CookieJar | null> {
  const jar = new CookieJar();

  const csrf = await request("/api/auth/csrf", { jar });
  const token = /"csrfToken":"([^"]+)"/.exec(csrf.body)?.[1] ?? "";

  if (!token) return null;

  await request("/api/auth/callback/credentials", {
    method: "POST",
    jar,
    body: new URLSearchParams({
      csrfToken: token,
      loginId,
      password: PASSWORD,
      role,
      callbackUrl: `${BASE_URL}/`,
      json: "true",
    }).toString(),
  });

  return jar;
}

/**
 * Calls a server action over the action endpoint.
 *
 * The action id is read from the built client chunks, because it changes with
 * every build.
 */
async function callAction(
  jar: CookieJar,
  actionName: string,
  args: unknown[],
): Promise<{ status: number; body: string }> {
  const actionId = await findActionId(actionName);

  if (!actionId) return { status: 0, body: "no action id" };

  const form = new FormData();
  form.append("0", JSON.stringify(args));

  // The content type is left to fetch, so the boundary of the multipart body
  // is written into the header. Setting it by hand loses the boundary and the
  // server cannot read the action arguments.
  const response = await fetch(`${BASE_URL}/admin/users`, {
    method: "POST",
    headers: {
      cookie: jar.header(),
      "next-action": actionId,
    },
    body: form,
    redirect: "manual",
  });

  return { status: response.status, body: await response.text() };
}

/** The id of a server action, read from the built client chunks. */
async function findActionId(name: string): Promise<string | null> {
  const { readdirSync, readFileSync } = await import("node:fs");
  const { join } = await import("node:path");

  let found: string | null = null;

  const walk = (dir: string): void => {
    if (found) return;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".js")) {
        const source = readFileSync(full, "utf8");

        // The id has to belong to the action that is asked for: a chunk holds
        // several of them, and the first one is not the right one.
        const match = new RegExp(
          `createServerReference\\)\\("([a-f0-9]+)"[^)]*,"${name}"\\)`,
        ).exec(source);

        if (match) found = match[1];
      }
    }
  };

  walk(".next/static/chunks");

  return found;
}

async function main(): Promise<void> {
  await cleanup();

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await prisma.user.upsert({
    where: { loginIdNormalized: IDS.admin },
    update: { passwordHash, role: "ADMIN" },
    create: {
      id: IDS.admin,
      loginId: IDS.admin,
      loginIdNormalized: IDS.admin,
      name: "Admin Role Check",
      email: `${IDS.admin}@example.com`,
      passwordHash,
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
    },
  });

  await prisma.user.upsert({
    where: { loginIdNormalized: IDS.teacher },
    update: { passwordHash, role: "TEACHER" },
    create: {
      id: IDS.teacher,
      loginId: IDS.teacher,
      loginIdNormalized: IDS.teacher,
      name: "Teacher Role Check",
      email: `${IDS.teacher}@example.com`,
      passwordHash,
      role: "TEACHER",
      isActive: true,
      mustChangePassword: false,
    },
  });

  await prisma.user.upsert({
    where: { loginIdNormalized: IDS.student },
    update: { passwordHash, role: "STUDENT" },
    create: {
      id: IDS.student,
      loginId: IDS.student,
      loginIdNormalized: IDS.student,
      name: "Student Role Check",
      email: `${IDS.student}@example.com`,
      passwordHash,
      role: "STUDENT",
      isActive: true,
      mustChangePassword: false,
    },
  });

  /* --- 1. An admin reaches the admin pages. ----------------------------- */

  const adminJar = await signIn(IDS.admin, "ADMIN");

  const adminPage = adminJar
    ? await request("/admin/users", { jar: adminJar })
    : { status: 0, location: null, body: "" };

  check(
    "an admin reaches the users page",
    adminPage.status === 200,
    `${adminPage.status}`,
  );

  const adminClasses = adminJar
    ? await request("/admin/classes", { jar: adminJar })
    : { status: 0, location: null, body: "" };

  check(
    "an admin reaches the classes page",
    adminClasses.status === 200,
    `${adminClasses.status}`,
  );

  /* --- 2. A student and a teacher are kept out of the admin pages. ------ */

  const studentJar = await signIn(IDS.student, "STUDENT");
  const teacherJar = await signIn(IDS.teacher, "TEACHER");

  const studentAdmin = studentJar
    ? await request("/admin/users", { jar: studentJar })
    : { status: 0, location: null, body: "" };

  const teacherAdmin = teacherJar
    ? await request("/admin/users", { jar: teacherJar })
    : { status: 0, location: null, body: "" };

  check(
    "a student is sent away from the admin users page",
    studentAdmin.status === 307 &&
      (studentAdmin.location ?? "").includes("/student/dashboard"),
    `${studentAdmin.status} ${studentAdmin.location}`,
  );

  check(
    "a teacher is sent away from the admin users page",
    teacherAdmin.status === 307 &&
      (teacherAdmin.location ?? "").includes("/teacher/dashboard"),
    `${teacherAdmin.status} ${teacherAdmin.location}`,
  );

  /* --- 3. An admin action is refused for a non-admin. ------------------- */

  const refused = await callAction(studentJar!, "createUserAction", [
    {
      name: "Should Not Exist",
      role: "STUDENT",
      classId: "class-9",
      email: "should-not-exist@example.com",
      password: "Should-Not-Exist-2026!",
    },
  ]);

  const notCreated = await prisma.user.count({
    where: { email: "should-not-exist@example.com" },
  });

  check(
    "a student cannot run an admin action",
    refused.status !== 200 && notCreated === 0,
    `status ${refused.status}, created ${notCreated}`,
  );

  const teacherRefused = await callAction(teacherJar!, "createUserAction", [
    {
      name: "Should Not Exist Either",
      role: "STUDENT",
      classId: "class-9",
      email: "should-not-exist-either@example.com",
      password: "Should-Not-Exist-2026!",
    },
  ]);

  const notCreatedEither = await prisma.user.count({
    where: { email: "should-not-exist-either@example.com" },
  });

  check(
    "a teacher cannot run an admin action",
    teacherRefused.status !== 200 && notCreatedEither === 0,
    `status ${teacherRefused.status}, created ${notCreatedEither}`,
  );

  /* --- 4. An admin action works for an admin. -------------------------- */

  const allowed = await callAction(adminJar!, "createUserAction", [
    {
      name: "Role Check Student",
      role: "STUDENT",
      classId: "class-9",
      email: "role-check-student@example.com",
      password: "Role-Check-Pass-2026!",
    },
  ]);

  const created = await prisma.user.count({
    where: { email: "role-check-student@example.com" },
  });

  check(
    "an admin can run an admin action",
    allowed.status === 200 && created === 1,
    `status ${allowed.status}, created ${created}, body ${allowed.body.slice(0, 200)}`,
  );

  /* --- 5. An anonymous request cannot run an admin action. ------------- */

  const anonymous = new CookieJar();

  const anonymousRefused = await callAction(anonymous, "createUserAction", [
    {
      name: "Should Not Exist At All",
      role: "STUDENT",
      classId: "class-9",
      email: "should-not-exist-at-all@example.com",
      password: "Should-Not-Exist-2026!",
    },
  ]);

  const notCreatedAtAll = await prisma.user.count({
    where: { email: "should-not-exist-at-all@example.com" },
  });

  check(
    "an anonymous request cannot run an admin action",
    anonymousRefused.status !== 200 && notCreatedAtAll === 0,
    `status ${anonymousRefused.status}, created ${notCreatedAtAll}`,
  );

  await cleanup();
  await prisma.$disconnect();

  console.log("");
  const failed = results.filter((result) => !result.pass);
  console.log(
    failed.length === 0
      ? `ALL ${results.length} ADMIN ROLE CHECKS PASS`
      : `${failed.length} of ${results.length} admin role checks failed`,
  );

  if (failed.length > 0) process.exitCode = 1;
}

void main();
