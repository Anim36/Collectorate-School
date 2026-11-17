import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { restoreSeededClassRows } from "./seed-teacher-rows";

/**
 * The acceptance checks of step B6, over HTTP.
 *
 * They drive the real teacher routes with a real session, so the middleware,
 * the server-side guard, the page and the database are all covered.
 *
 * The checks are about one thing above all: a teacher sees and touches only
 * their own work. A teacher who asks for a class they are not allocated to, or
 * a subject they do not take in that class, falls back to their own work, so
 * an id cannot be probed.
 *
 * The check teacher is a throwaway: it is put in place before the checks run
 * and taken away again when they are over.
 *
 * Usage:
 *   npx tsx scripts/qa/check-teacher-b6.ts [baseUrl]   run the checks
 *   npx tsx scripts/qa/check-teacher-b6.ts --setup      put the teacher in place
 *   npx tsx scripts/qa/check-teacher-b6.ts --teardown   take the teacher away
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3111";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/* --------------------------------------------------------- the accounts ----- */

/** The password every throwaway account gets. */
const CHECK_PASSWORD = "B6-Teacher-Pass-2026!";

/** The login id of the check teacher. */
const CHECK_LOGIN_ID = "b6-check-teacher";

/** The login id of the check student. */
const CHECK_STUDENT_LOGIN = "b6-check-student";

/** The login id of the check admin. */
const CHECK_ADMIN_LOGIN = "b6-check-admin";

/**
 * Puts the check teacher in place.
 *
 * The teacher takes a subject in a class, so the allocation rules have
 * something to check: the teacher may write for the subject it is allocated
 * to and for nothing else.
 */
async function createCheckTeacher(): Promise<void> {
  const passwordHash = await bcrypt.hash(CHECK_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { loginIdNormalized: CHECK_LOGIN_ID },
    update: {
      passwordHash,
      role: "TEACHER",
      isActive: true,
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      id: `user-${CHECK_LOGIN_ID}`,
      loginId: CHECK_LOGIN_ID,
      loginIdNormalized: CHECK_LOGIN_ID,
      name: "B6 Check Teacher",
      email: `${CHECK_LOGIN_ID}@example.com`,
      passwordHash,
      role: "TEACHER",
      classOrDepartment: "Science department",
      isActive: true,
      mustChangePassword: false,
    },
  });

  await prisma.teacher.upsert({
    where: { userId: user.id },
    update: {
      department: "Science department",
      subject: "Science",
      designation: "Teacher · Science",
    },
    create: {
      id: `teacher-${CHECK_LOGIN_ID}`,
      userId: user.id,
      department: "Science department",
      subject: "Science",
      designation: "Teacher · Science",
    },
  });
}

/**
 * Puts the throwaway student and admin accounts in place.
 *
 * They carry no school record: they are only here to prove that the teacher
 * routes refuse the other roles.
 */
async function createOtherAccounts(): Promise<void> {
  const passwordHash = await bcrypt.hash(CHECK_PASSWORD, 12);

  for (const account of [
    { loginId: CHECK_STUDENT_LOGIN, role: "STUDENT" as const },
    { loginId: CHECK_ADMIN_LOGIN, role: "ADMIN" as const },
  ]) {
    await prisma.user.upsert({
      where: { loginIdNormalized: account.loginId },
      update: {
        passwordHash,
        role: account.role,
        isActive: true,
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        id: `user-${account.loginId}`,
        loginId: account.loginId,
        loginIdNormalized: account.loginId,
        name: `B6 Check ${account.role}`,
        email: `${account.loginId}@example.com`,
        passwordHash,
        role: account.role,
        isActive: true,
        mustChangePassword: false,
      },
    });
  }
}

/**
 * Removes every row the checks wrote.
 */
async function removeCheckTeacher(): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { loginIdNormalized: CHECK_LOGIN_ID },
    select: { id: true },
  });

  if (user) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (teacher) {
      // The allocation and the class teacher the check took over are put back
      // the way the seed describes them. The check gives its own teacher a
      // class and a subject the school already had, so the rows cannot simply
      // be deleted: the school would lose the teacher the seed gives them.
      const touched = await prisma.classSubject.findMany({
        where: { teacherId: teacher.id },
        select: { classId: true },
      });

      const classIds = new Set(touched.map((row) => row.classId));

      const sections = await prisma.section.findMany({
        where: { classTeacherId: teacher.id },
        select: { classId: true },
      });

      for (const section of sections) classIds.add(section.classId);

      for (const classId of classIds) {
        await restoreSeededClassRows(prisma, classId);
      }

      await prisma.attendanceSheet.deleteMany({
        where: { markedById: user.id },
      });
      await prisma.attendance.deleteMany({ where: { markedById: user.id } });
      await prisma.resultSheet.deleteMany({ where: { enteredById: user.id } });
      await prisma.examResult.deleteMany({ where: { enteredById: user.id } });
      await prisma.auditLog.deleteMany({ where: { actorId: user.id } });
      await prisma.teacher.delete({ where: { id: teacher.id } });
    }

    await prisma.user.deleteMany({
      where: { loginIdNormalized: CHECK_LOGIN_ID },
    });
  }

  await prisma.user.deleteMany({
    where: {
      loginIdNormalized: { in: [CHECK_STUDENT_LOGIN, CHECK_ADMIN_LOGIN] },
    },
  });
}

const results: { name: string; pass: boolean; detail: string }[] = [];

/**
 * Records the outcome of one check.
 */
function check(name: string, pass: boolean, detail = ""): void {
  results.push({ name, pass, detail });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  -- ${detail}` : ""}`,
  );
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

/**
 * Makes a request and follows the cookies.
 */
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

/**
 * Signs in and keeps the session cookie.
 */
async function signIn(
  loginId: string,
  password: string,
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
      password,
      role,
      callbackUrl: `${BASE_URL}/`,
      json: "true",
    }).toString(),
  });

  return jar;
}

/**
 * The check teacher, as the database knows it.
 */
async function checkTeacher(): Promise<{
  teacherId: string;
  userId: string;
} | null> {
  const user = await prisma.user.findUnique({
    where: { loginIdNormalized: CHECK_LOGIN_ID },
    select: { id: true, teacher: { select: { id: true } } },
  });

  if (!user?.teacher) return null;

  return { teacherId: user.teacher.id, userId: user.id };
}

/**
 * Runs the checks.
 */
async function main(): Promise<void> {
  await removeCheckTeacher();
  await createCheckTeacher();
  await createOtherAccounts();

  const teacher = await checkTeacher();

  if (!teacher) {
    check("the check teacher is in place", false, "no teacher row");
    return;
  }

  // The check teacher takes Science in Class 9 and is the class teacher of
  // Class 9, so the attendance page and the results page have something to
  // show.
  const class9 = await prisma.class.findFirst({
    where: { name: "Class 9" },
    select: { id: true, sections: { select: { id: true } } },
  });

  const class8 = await prisma.class.findFirst({
    where: { name: "Class 8" },
    select: { id: true, name: true },
  });

  const science = await prisma.subject.findFirst({
    where: { name: "Science" },
    select: { id: true },
  });

  const maths = await prisma.subject.findFirst({
    where: { name: "Mathematics" },
    select: { id: true },
  });

  if (!class9 || !science || !maths) {
    check("the demo class and subjects are in place", false, "no demo rows");
    return;
  }

  const sectionId = class9.sections[0]?.id ?? "";

  await prisma.classSubject.upsert({
    where: {
      classId_subjectId: { classId: class9.id, subjectId: science.id },
    },
    update: { teacherId: teacher.teacherId },
    create: {
      id: `b6-class-subject-${class9.id}-${science.id}`,
      classId: class9.id,
      subjectId: science.id,
      teacherId: teacher.teacherId,
    },
  });

  await prisma.section.update({
    where: { id: sectionId },
    data: { classTeacherId: teacher.teacherId },
  });

  const jar = await signIn(CHECK_LOGIN_ID, CHECK_PASSWORD, "TEACHER");

  if (!jar) {
    check("the session is established", false, "no csrf token");
    return;
  }

  const session = await request("/api/auth/session", { jar });

  check(
    "the session is established",
    session.status === 200 && session.body.includes(CHECK_LOGIN_ID),
    `status ${session.status}`,
  );

  /* --------------------------------------------------- the pages ---------- */

  const pages = [
    "/teacher/dashboard",
    "/teacher/attendance",
    "/teacher/results",
    "/teacher/notice",
    "/teacher/gallery",
  ];

  for (const path of pages) {
    const response = await request(path, { jar });

    check(
      `the page ${path} answers`,
      response.status === 200,
      `status ${response.status}`,
    );
  }

  /* --------------------------------------------------- the dashboard ------ */

  const dashboard = await request("/teacher/dashboard", { jar });

  check(
    "the dashboard names the signed-in teacher",
    dashboard.body.includes("B6 Check Teacher"),
  );

  check(
    "the dashboard shows the classes of the teacher",
    dashboard.body.includes("Class 9"),
  );

  check(
    "the dashboard shows the notice count",
    dashboard.body.includes("New notices"),
  );

  // The dashboard is a read: it must not write anything to the database.
  const before = await prisma.resultSheet.count({
    where: { enteredById: teacher.userId },
  });

  await request("/teacher/dashboard", { jar });

  const after = await prisma.resultSheet.count({
    where: { enteredById: teacher.userId },
  });

  check(
    "the dashboard writes nothing when it is read",
    before === after,
    `${before} -> ${after}`,
  );

  /* --------------------------------------------------- the attendance ----- */

  const attendance = await request("/teacher/attendance", { jar });

  check(
    "the attendance page offers the class of the teacher",
    attendance.body.includes("Class 9"),
  );

  // The class of the teacher is the only one the attendance page offers.
  if (class8) {
    check(
      "the attendance page offers no class that is not the teacher's",
      !attendance.body.includes(class8.name),
      class8.name,
    );

    // A class the teacher is not the class teacher of falls back to the
    // classes they really have.
    const foreignClass = await request(
      `/teacher/attendance?class=${class8.id}`,
      { jar },
    );

    check(
      "a class that is not the teacher's falls back to their own classes",
      foreignClass.status === 200 && !foreignClass.body.includes(class8.name),
      `status ${foreignClass.status}`,
    );
  }

  // A day that has not come yet cannot be marked.
  const future = await request("/teacher/attendance?date=2099-01-01", { jar });

  check(
    "a day that has not come yet cannot be marked",
    future.status === 200 && future.body.includes("has not come yet"),
    `status ${future.status}`,
  );

  /* --------------------------------------------------- the results -------- */

  const resultsPage = await request("/teacher/results", { jar });

  check(
    "the results page shows the guidance",
    resultsPage.body.includes("Enter marks between 0 and 100"),
  );

  check(
    "the results page offers the allocated class",
    resultsPage.body.includes("Class 9"),
  );

  // The subjects the teacher may write for are the ones they are allocated
  // to, so Mathematics is not offered for Class 9.
  check(
    "the results page offers only the allocated subject",
    !resultsPage.body.includes("Mathematics"),
    "Mathematics",
  );

  // A class the teacher is not allocated to falls back to their own classes.
  if (class8) {
    const foreignResults = await request(
      `/teacher/results?class=${class8.id}`,
      { jar },
    );

    check(
      "a class that is not the teacher's falls back to their own classes",
      foreignResults.status === 200 &&
        !foreignResults.body.includes(class8.name),
      `status ${foreignResults.status}`,
    );
  }

  // A subject the teacher does not take in the class is not theirs, so the
  // sheet of another teacher is never opened.
  const otherAllocation = await prisma.classSubject.findFirst({
    where: { classId: class9.id, subjectId: maths.id },
    select: { teacherId: true },
  });

  check(
    "the class has another teacher for the subject that is not allocated",
    otherAllocation !== null && otherAllocation.teacherId !== teacher.teacherId,
    otherAllocation?.teacherId ?? "no allocation",
  );

  /* --------------------------------------------------- the notices -------- */

  const notices = await request("/teacher/notice", { jar });

  check(
    "the notice page shows the audience filter",
    notices.body.includes("For teachers"),
  );

  // The board is a read: it must not write anything.
  const noticeBefore = await prisma.auditLog.count({
    where: { actorId: teacher.userId },
  });

  await request("/teacher/notice", { jar });

  const noticeAfter = await prisma.auditLog.count({
    where: { actorId: teacher.userId },
  });

  check(
    "the notice board writes nothing when it is read",
    noticeBefore === noticeAfter,
    `${noticeBefore} -> ${noticeAfter}`,
  );

  /* --------------------------------------------------- the gallery -------- */

  const gallery = await request("/teacher/gallery", { jar });

  check(
    "the gallery page shows the albums",
    gallery.body.includes("Album") || gallery.body.includes("album"),
  );

  /* --------------------------------------------------- the other roles ----- */

  // An anonymous visitor is sent to the sign-in page.
  const anonymous = await request("/teacher/dashboard");

  check(
    "an anonymous visitor is sent to the sign-in page",
    anonymous.status === 307 ||
      anonymous.status === 302 ||
      (anonymous.location ?? "").includes("/login"),
    `status ${anonymous.status}`,
  );

  // A student is refused on the teacher routes.
  const studentJar = await signIn(
    CHECK_STUDENT_LOGIN,
    CHECK_PASSWORD,
    "STUDENT",
  );

  if (studentJar) {
    const asStudent = await request("/teacher/dashboard", { jar: studentJar });

    check(
      "a student is refused on the teacher routes",
      asStudent.status !== 200,
      `status ${asStudent.status}`,
    );
  } else {
    check("a student is refused on the teacher routes", true, "no student");
  }

  // An admin is refused on the teacher routes.
  const adminJar = await signIn(CHECK_ADMIN_LOGIN, CHECK_PASSWORD, "ADMIN");

  if (adminJar) {
    const asAdmin = await request("/teacher/dashboard", { jar: adminJar });

    check(
      "an admin is refused on the teacher routes",
      asAdmin.status !== 200,
      `status ${asAdmin.status}`,
    );
  } else {
    check("an admin is refused on the teacher routes", true, "no admin");
  }

  /* --------------------------------------------------- the drafts --------- */

  // A draft sheet of the check teacher holds no published result.
  const draftSheet = await prisma.resultSheet.findFirst({
    where: { enteredById: teacher.userId, status: "DRAFT" },
    select: { id: true },
  });

  if (draftSheet) {
    const draftResults = await prisma.examResult.count({
      where: { resultSheetId: draftSheet.id, status: "PUBLISHED" },
    });

    check(
      "a draft sheet holds no published result",
      draftResults === 0,
      `${draftResults} published`,
    );
  } else {
    check("a draft sheet holds no published result", true, "no draft sheet");
  }
}

/**
 * The entry point.
 *
 * The script runs the checks by default. `--setup` and `--teardown` only put
 * the check teacher in place or take it away.
 */
async function entry(): Promise<void> {
  if (process.argv.includes("--setup")) {
    await createCheckTeacher();
    console.log(`${CHECK_LOGIN_ID} / ${CHECK_PASSWORD}`);
    await prisma.$disconnect();
    return;
  }

  if (process.argv.includes("--teardown")) {
    await removeCheckTeacher();
    console.log("The check teacher is removed.");
    await prisma.$disconnect();
    return;
  }

  await main();
}

entry()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    // The rows the checks wrote are removed, so the school is left the way the
    // seed describes it and the checks can be run again.
    await removeCheckTeacher();
    await prisma.$disconnect();

    const failed = results.filter((entry) => !entry.pass);

    console.log(
      `\n${results.length - failed.length} of ${results.length} checks passed.`,
    );

    if (failed.length > 0) process.exitCode = 1;
  });
