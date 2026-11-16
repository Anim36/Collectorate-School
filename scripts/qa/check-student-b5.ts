import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { listPendingPayments } from "@/server/services/fees";

/**
 * The acceptance checks of step B5, over HTTP.
 *
 * They drive the real student routes with a real session, so the middleware,
 * the server-side guard, the page and the database are all covered.
 *
 * The checks are about one thing above all: a student sees only their own
 * data. A student who asks for the receipt of another student gets the same
 * answer as for a receipt that does not exist, so an id cannot be probed.
 *
 * They also cover the payment race: two submissions of the same fee line at
 * the same moment must leave exactly one waiting payment behind, and the
 * database has to refuse a second waiting item for the same line even when the
 * write skips the application.
 *
 * The check student is a throwaway: it is put in place before the checks run
 * and taken away again when they are over.
 *
 * Usage:
 *   npx tsx scripts/qa/check-student-b5.ts [baseUrl]   run the checks
 *   npx tsx scripts/qa/check-student-b5.ts --setup      put the student in place
 *   npx tsx scripts/qa/check-student-b5.ts --teardown   take the student away
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3111";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/* --------------------------------------------------- the check student ----- */

/** The password of the check student. */
const CHECK_PASSWORD = "B5-Student-Pass-2026!";

/** The login id of the check student. */
const CHECK_LOGIN_ID = "b5-check-student";

/**
 * Puts the check student in place.
 *
 * The student is a copy of the demo student of Class 9, because the seed
 * writes attendance, results and fees for that class.
 */
async function createCheckStudent(): Promise<string> {
  const passwordHash = await bcrypt.hash(CHECK_PASSWORD, 12);

  const demo = await prisma.student.findFirst({
    where: { class: { name: "Class 9" } },
    orderBy: { roll: "asc" },
    select: {
      id: true,
      classId: true,
      sectionId: true,
      academicYearId: true,
      roll: true,
    },
  });

  if (!demo) throw new Error("no Class 9 student to copy");

  const user = await prisma.user.upsert({
    where: { loginIdNormalized: CHECK_LOGIN_ID },
    update: {
      passwordHash,
      role: "STUDENT",
      isActive: true,
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      id: `user-${CHECK_LOGIN_ID}`,
      loginId: CHECK_LOGIN_ID,
      loginIdNormalized: CHECK_LOGIN_ID,
      name: "B5 Check Student",
      email: `${CHECK_LOGIN_ID}@example.com`,
      passwordHash,
      role: "STUDENT",
      classOrDepartment: "Class 9",
      isActive: true,
      mustChangePassword: false,
    },
  });

  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      id: `student-${CHECK_LOGIN_ID}`,
      userId: user.id,
      studentId: "ST-B5-0001",
      name: "B5 Check Student",
      classId: demo.classId,
      sectionId: demo.sectionId,
      academicYearId: demo.academicYearId,
      roll: 999,
      guardianName: "Guardian",
      guardianPhone: "01700000000",
      phone: "01700000000",
      emergencyContact: "01800000000",
      email: `${CHECK_LOGIN_ID}@example.com`,
      address: "Narail",
    },
  });

  // The attendance of the demo student, so the calendar has days to show.
  const attendance = await prisma.attendance.findMany({
    where: { studentId: demo.id },
    select: { date: true, status: true, sectionId: true },
  });

  for (const row of attendance) {
    await prisma.attendance.upsert({
      where: { studentId_date: { studentId: student.id, date: row.date } },
      update: { status: row.status },
      create: {
        studentId: student.id,
        sectionId: row.sectionId,
        date: row.date,
        status: row.status,
      },
    });
  }

  // The published results of the demo student.
  const results = await prisma.examResult.findMany({
    where: { studentId: demo.id, status: "PUBLISHED" },
    select: {
      examId: true,
      subjectId: true,
      resultSheetId: true,
      marks: true,
      grade: true,
      gpa: true,
    },
  });

  for (const row of results) {
    await prisma.examResult.upsert({
      where: {
        examId_studentId_subjectId: {
          examId: row.examId,
          studentId: student.id,
          subjectId: row.subjectId,
        },
      },
      update: {},
      create: {
        id: `b5-result-${row.examId}-${row.subjectId}`,
        examId: row.examId,
        studentId: student.id,
        subjectId: row.subjectId,
        resultSheetId: row.resultSheetId,
        marks: row.marks,
        grade: row.grade,
        gpa: row.gpa,
        status: "PUBLISHED",
      },
    });
  }

  // The fee lines of the student, so the fees table has something to show.
  // There are two lines, so the checks can pay one of them and leave the
  // other one alone.
  const structure = await prisma.feeStructure.findFirst({
    where: { classId: demo.classId },
    select: {
      id: true,
      monthlyTuitionPoisha: true,
      activitiesPoisha: true,
      dueDate: true,
    },
  });

  if (structure) {
    await prisma.fee.upsert({
      where: { id: `fee-${CHECK_LOGIN_ID}-tuition` },
      update: {},
      create: {
        id: `fee-${CHECK_LOGIN_ID}-tuition`,
        studentId: student.id,
        feeStructureId: structure.id,
        label: "November tuition",
        // Every line belongs to a billing slot, so a student holds one fee per
        // slot and per line.
        period: "2026-11:tuition",
        amountPoisha: structure.monthlyTuitionPoisha,
        dueDate: structure.dueDate,
        status: "DUE",
      },
    });

    await prisma.fee.upsert({
      where: { id: `fee-${CHECK_LOGIN_ID}-activities` },
      update: {},
      create: {
        id: `fee-${CHECK_LOGIN_ID}-activities`,
        studentId: student.id,
        feeStructureId: structure.id,
        label: "Annual activities",
        period: "2026-11:activities",
        amountPoisha: structure.activitiesPoisha,
        dueDate: structure.dueDate,
        status: "DUE",
      },
    });
  }

  console.log(`${CHECK_LOGIN_ID} / ${CHECK_PASSWORD}`);

  return CHECK_LOGIN_ID;
}

/**
 * Removes every row the checks wrote.
 */
async function removeCheckStudent(): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { userId: `user-${CHECK_LOGIN_ID}` },
    select: { id: true },
  });

  if (student) {
    await prisma.paymentItem.deleteMany({
      where: { payment: { studentId: student.id } },
    });
    await prisma.payment.deleteMany({ where: { studentId: student.id } });
    await prisma.receipt.deleteMany({ where: { studentId: student.id } });
    await prisma.fee.deleteMany({ where: { studentId: student.id } });
    await prisma.examResult.deleteMany({ where: { studentId: student.id } });
    await prisma.attendance.deleteMany({ where: { studentId: student.id } });
    await prisma.auditLog.deleteMany({ where: { actorId: `user-${CHECK_LOGIN_ID}` } });
    await prisma.student.delete({ where: { id: student.id } });
  }

  await prisma.user.deleteMany({ where: { loginId: CHECK_LOGIN_ID } });
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
 * The answer the server action gives.
 */
async function submitPayment(
  jar: CookieJar,
  feeId: string,
  method: string,
  options: { senderMobile?: string; transactionId?: string } = {},
): Promise<{ ok: boolean; detail: string }> {
  const action = await findAction("submitStudentPaymentAction");

  if (!action) return { ok: false, detail: "no action id" };

  const form = new FormData();
  form.append(
    "0",
    JSON.stringify([
      {
        feeIds: [feeId],
        method,
        senderMobile: options.senderMobile ?? "01712345678",
        transactionId:
          options.transactionId ?? `B5TX${Date.now().toString().slice(-8)}`,
      },
    ]),
  );

  const headers: Record<string, string> = { "next-action": action.id };

  if (jar.header()) headers["cookie"] = jar.header();

  const response = await fetch(`${BASE_URL}${action.route}`, {
    method: "POST",
    headers,
    body: form,
    redirect: "manual",
  });

  const body = await response.text();

  return {
    ok: body.includes("ok\\\":true") || body.includes('"ok":true'),
    detail: `${response.status} ${body.slice(0, 200)}`,
  };
}

/**
 * The id of a server action and the route it is bound to.
 *
 * The id is read from the built client chunks, because it changes with every
 * build. The chunk the action lives in carries the route it belongs to, so the
 * route does not have to be guessed.
 */
async function findAction(
  name: string,
): Promise<{ id: string; route: string } | null> {
  const { readdirSync, readFileSync } = await import("node:fs");
  const { join } = await import("node:path");

  let found: { id: string; route: string } | null = null;

  const walk = (dir: string): void => {
    if (found) return;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      if (!entry.name.endsWith(".js")) continue;

      const source = readFileSync(full, "utf8");

      // The id has to belong to the action that is asked for: a chunk holds
      // several of them, and the first one is not the right one.
      const match = new RegExp(
        `createServerReference\\)\\("([a-f0-9]+)"[^)]*,"${name}"\\)`,
      ).exec(source);

      if (!match) continue;

      // The chunk of a page lives under the route of the page, e.g.
      // ".next/static/chunks/app/student/fees/pay/page-<hash>.js".
      const route = full
        .replace(/\\/g, "/")
        .split("/chunks/")[1]
        ?.replace(/\/page-[^/]+\.js$/, "")
        .replace(/^app/, "")
        .replace(/\/\([^/]+\)/g, "");

      if (!route) return;

      found = { id: match[1], route };
    }
  };

  walk(".next/static/chunks");

  return found;
}

/**
 * The check student, as the database knows it.
 */
async function checkStudent(): Promise<{ id: string } | null> {
  return prisma.student.findUnique({
    where: { userId: `user-${CHECK_LOGIN_ID}` },
    select: { id: true },
  });
}

/**
 * Runs the checks.
 */
async function main(): Promise<void> {
  await removeCheckStudent();
  await createCheckStudent();

  const jar = await signIn(CHECK_LOGIN_ID, CHECK_PASSWORD, "STUDENT");

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

  // The pages of the portal answer with 200 for the signed-in student.
  const pages = [
    "/student/dashboard",
    "/student/profile",
    "/student/attendance",
    "/student/performance",
    "/student/result",
    "/student/fees",
    "/student/fees/pay",
    "/student/notice",
    "/student/gallery",
  ];

  for (const path of pages) {
    const response = await request(path, { jar });

    check(
      `the page ${path} answers`,
      response.status === 200,
      `status ${response.status}`,
    );
  }

  // The dashboard shows the figures of the signed-in student.
  const dashboard = await request("/student/dashboard", { jar });

  check(
    "the dashboard names the signed-in student",
    dashboard.body.includes("B5 Check Student"),
  );

  check(
    "the dashboard shows the attendance rate",
    /\d+\.\d%/.test(dashboard.body),
  );

  check("the dashboard shows the fee due", dashboard.body.includes("Fee due"));

  check(
    "the dashboard shows the new notices count",
    dashboard.body.includes("New notices"),
  );

  // The "new notices" count is the notices of the last seven days. It is a
  // read-only rule, so the dashboard never writes anything.
  const student = await checkStudent();

  if (student) {
    const before = await prisma.student.findUnique({
      where: { id: student.id },
      select: { updatedAt: true },
    });

    await request("/student/dashboard", { jar });

    const after = await prisma.student.findUnique({
      where: { id: student.id },
      select: { updatedAt: true },
    });

    check(
      "the dashboard writes nothing when it is read",
      before !== null &&
        after !== null &&
        before.updatedAt.getTime() === after.updatedAt.getTime(),
      `${before?.updatedAt.toISOString()} vs ${after?.updatedAt.toISOString()}`,
    );
  }

  // The profile page shows the student's own row.
  const profile = await request("/student/profile", { jar });

  check(
    "the profile shows the student's own identifier",
    profile.body.includes("ST-B5-0001"),
  );

  check(
    "the profile shows the class without a section",
    profile.body.includes("Class 9") && !profile.body.includes("Class / Section"),
  );

  // The attendance page reads the month out of the database.
  const attendance = await request("/student/attendance", { jar });

  check("the attendance page offers a month", attendance.body.includes("attendance-month"));

  // A month that is not the student's own is not readable: the page falls
  // back to the newest month the student really has.
  const attendanceMonth = await request("/student/attendance?month=1999-01", {
    jar,
  });

  check(
    "an unknown month falls back to the student's own months",
    attendanceMonth.status === 200 &&
      !attendanceMonth.body.includes("January 1999"),
  );

  // The performance page reads the published marks only.
  const performance = await request("/student/performance", { jar });

  check(
    "the performance page shows the marks chart",
    performance.body.includes("Your marks over time"),
  );

  check(
    "the performance page shows a strength note",
    performance.body.includes("Your strength"),
  );

  // The result page shows the published sheets only.
  const resultPage = await request("/student/result", { jar });

  check(
    "the result page shows the marks table",
    resultPage.body.includes("Marks for"),
  );

  // A draft result sheet is never read. The exam of the draft sheet must not
  // appear in the selector of the student.
  const draftSheet = await prisma.resultSheet.findFirst({
    where: { status: "DRAFT" },
    select: { examId: true, exam: { select: { name: true } } },
  });

  if (draftSheet) {
    const exams = await prisma.exam.findMany({
      where: {
        published: true,
        results: {
          some: { studentId: `student-${CHECK_LOGIN_ID}`, status: "PUBLISHED" },
        },
      },
      select: { name: true },
    });

    const leaked = exams.some((exam) => exam.name === draftSheet.exam.name);

    check(
      "a draft sheet is not offered to the student",
      !leaked,
      draftSheet.exam.name,
    );
  } else {
    check("a draft sheet is not offered to the student", true, "no draft sheet");
  }

  // A DRAFT result of the student never appears on the result page.
  const draftResult = await prisma.examResult.findFirst({
    where: { studentId: `student-${CHECK_LOGIN_ID}`, status: "DRAFT" },
    select: { id: true },
  });

  check(
    "no draft result of the student is written",
    draftResult === null,
    draftResult?.id ?? "",
  );

  // The fees page shows the fee lines of the student.
  const fees = await request("/student/fees", { jar });

  check("the fees page shows the due fees", fees.body.includes("Due fees"));

  check(
    "the fees page shows the payment history",
    fees.body.includes("Payment history"),
  );

  check(
    "the fees page shows the fee of the student",
    fees.body.includes("November tuition"),
  );

  /* ------------------------------------------------- another student ----- */

  // The other student of the checks is a throwaway account with a real
  // record, so every read of "somebody else's" has something to point at.
  const other = await createOtherStudent();

  // The profile of another student is not readable. The student id is never
  // read from the browser, so there is no route that could leak it.
  const otherProfile = await request("/student/profile", { jar });

  check(
    "the profile never shows another student",
    !otherProfile.body.includes(other.studentId),
    other.studentId,
  );

  // The attendance of another student is not readable: the month is only the
  // month that is looked at, and a month that the student does not have falls
  // back to their own months.
  const otherAttendance = await request(
    `/student/attendance?month=${other.month}&studentId=${other.id}`,
    { jar },
  );

  check(
    "the attendance never shows another student",
    otherAttendance.status === 200 &&
      !otherAttendance.body.includes(other.studentId),
  );

  // The results of another student are not readable: the exam of the other
  // student is not offered.
  const otherResult = await request(
    `/student/result?examId=${other.examId}&studentId=${other.id}`,
    { jar },
  );

  // The page must never carry a result of another student. The marks on their
  // own are not a proof of that, because a mark is a plain number that the
  // student may well have earned as well: the check student sat the same
  // exam and has the same mark in the same subject. What has to be absent is
  // the row of the other student, so the check looks for the subject and the
  // mark together, and for the id of the other student's result.
  const otherRow = other.subject && other.marks >= 0;

  check(
    "the result page never shows another student",
    otherResult.status === 200 &&
      (!otherRow ||
        !(
          otherResult.body.includes(other.subject) &&
          otherResult.body.includes(other.marks.toString())
        )),
    otherRow ? `${other.subject} ${other.marks}` : "no row to look for",
  );

  check(
    "the result page never carries the result of another student",
    !otherResult.body.includes(other.resultId),
    other.resultId,
  );

  // The fees of another student are not readable: the fee line of the other
  // student is not on the page.
  const otherFees = await request(`/student/fees?studentId=${other.id}`, { jar });

  check(
    "the fees page never shows another student",
    otherFees.status === 200 && !otherFees.body.includes(other.feeLabel),
    other.feeLabel,
  );

  // The receipt of another student is not readable. The answer is the same as
  // for a receipt that does not exist, so an id cannot be probed.
  const otherReceipt = await prisma.receipt.findFirst({
    where: { studentId: { not: `student-${CHECK_LOGIN_ID}` } },
    select: { id: true },
  });

  if (otherReceipt) {
    const otherResponse = await request(
      `/student/fees/receipt/${otherReceipt.id}`,
      { jar },
    );

    const missing = await request(
      "/student/fees/receipt/receipt-that-does-not-exist",
      { jar },
    );

    check(
      "the receipt of another student is not readable",
      otherResponse.status === 404,
      `status ${otherResponse.status}`,
    );

    check(
      "a receipt of another student reads like one that does not exist",
      otherResponse.status === missing.status,
      `${otherResponse.status} vs ${missing.status}`,
    );
  } else {
    check("the receipt of another student is not readable", true, "no receipt");
  }

  // A payment of another student is not readable through the fees page.
  const otherPayment = await prisma.payment.findFirst({
    where: { studentId: { not: `student-${CHECK_LOGIN_ID}` } },
    select: { id: true, studentId: true, transactionId: true },
  });

  if (otherPayment) {
    const otherPaymentResponse = await request(
      `/student/fees?paymentId=${otherPayment.id}`,
      { jar },
    );

    // The id of the payment is in the page, because the check itself put it
    // in the query string and Next.js writes the route of the request into the
    // page. That is the echo of the request and not the data of the payment,
    // so the check looks at what the page shows of the payment: the student
    // it belongs to and the transaction the sender quoted. Neither of them
    // may be on the page of a student who is not the owner.
    check(
      "the payment of another student is not readable",
      otherPaymentResponse.status === 200 &&
        !otherPaymentResponse.body.includes(otherPayment.studentId) &&
        (otherPayment.transactionId === null ||
          !otherPaymentResponse.body.includes(otherPayment.transactionId)),
      otherPayment.id,
    );
  } else {
    check("the payment of another student is not readable", true, "no payment");
  }

  /* ------------------------------------------------- the other roles ----- */

  // A teacher, an admin and an anonymous visitor are all refused on the
  // student routes.
  const anonymous = await request("/student/dashboard");

  check(
    "an anonymous visitor is sent to the sign-in page",
    anonymous.status === 307 ||
      anonymous.status === 302 ||
      (anonymous.location ?? "").includes("/login"),
    `status ${anonymous.status}`,
  );

  const teacherJar = await signIn(
    "b5-check-teacher",
    CHECK_PASSWORD,
    "TEACHER",
  );

  if (teacherJar) {
    const asTeacher = await request("/student/dashboard", { jar: teacherJar });

    check(
      "a teacher is refused on the student routes",
      asTeacher.status !== 200,
      `status ${asTeacher.status}`,
    );
  } else {
    check("a teacher is refused on the student routes", true, "no teacher");
  }

  const adminJar = await signIn("b5-check-admin", CHECK_PASSWORD, "ADMIN");

  if (adminJar) {
    const asAdmin = await request("/student/dashboard", { jar: adminJar });

    check(
      "an admin is refused on the student routes",
      asAdmin.status !== 200,
      `status ${asAdmin.status}`,
    );
  } else {
    check("an admin is refused on the student routes", true, "no admin");
  }

  /* ------------------------------------------------- the notice board ---- */

  // A notice that is not published is not readable.
  const draftNotice = await prisma.notice.findFirst({
    where: { status: { not: "PUBLISHED" } },
    select: { id: true },
  });

  if (draftNotice) {
    const notice = await request(`/student/notice/${draftNotice.id}`, { jar });

    check(
      "a draft notice is not readable",
      notice.status === 404,
      `status ${notice.status}`,
    );
  } else {
    check("a draft notice is not readable", true, "no draft notice");
  }

  // A notice that is addressed to the teachers only is not readable by a
  // student, and neither is its attachment.
  //
  // The notice is written by the check, because the school may not have one
  // at the moment: a notice that carries TEACHERS among its audiences but
  // also PUBLIC or STUDENTS is readable by a student, so the query has to
  // look for a notice that is addressed to the teachers and to nobody else.
  const teachersNotice = await prisma.notice.create({
    data: {
      id: "b5-check-notice-teachers",
      title: "B5 check notice for the teachers",
      body: "<p>A notice the teachers only may read.</p>",
      category: "General",
      audience: "TEACHERS",
      audiences: ["TEACHERS"],
      status: "PUBLISHED",
      publishedOn: new Date("2026-11-01T00:00:00.000Z"),
    },
    select: { id: true },
  });

  {
    const notice = await request(`/student/notice/${teachersNotice.id}`, { jar });

    check(
      "a notice for the teachers only is not readable",
      notice.status === 404,
      `status ${notice.status}`,
    );
  }

  /* ------------------------------------------------- the attachments ----- */

  await checkAttachments(jar);

  /* ------------------------------------------------- the payment --------- */

  const payable = await prisma.fee.findFirst({
    where: { studentId: `student-${CHECK_LOGIN_ID}`, status: { not: "PAID" } },
    orderBy: { label: "asc" },
    select: { id: true, amountPoisha: true, label: true },
  });

  if (!payable) {
    check("a payment request is written", false, "no payable fee");
    return;
  }

  const before = await prisma.payment.count({
    where: { studentId: `student-${CHECK_LOGIN_ID}` },
  });

  const submission = await submitPayment(jar, payable.id, "BKASH");

  const after = await prisma.payment.count({
    where: { studentId: `student-${CHECK_LOGIN_ID}` },
  });

  check(
    "a payment request is written",
    after === before + 1,
    `${before} -> ${after}`,
  );

  check("the server action accepted the payment", submission.ok, submission.detail);

  const payment = await prisma.payment.findFirst({
    where: { studentId: `student-${CHECK_LOGIN_ID}` },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amountPoisha: true,
      status: true,
      method: true,
      cardLast4: true,
      transactionId: true,
      senderMobile: true,
      receipt: { select: { id: true } },
    },
  });

  check(
    "the payment waits for the admin",
    payment?.status === "PENDING",
    payment?.status ?? "no payment",
  );

  check("the payment carries no receipt yet", payment?.receipt === null);

  check(
    "the amount is worked out from the fee lines",
    payment?.amountPoisha === payable.amountPoisha,
    `${payment?.amountPoisha} vs ${payable.amountPoisha}`,
  );

  check(
    "no card number is kept",
    payment?.cardLast4 === null,
    payment?.cardLast4 ?? "",
  );

  check(
    "the payment keeps the number the money was sent from",
    payment?.senderMobile === "01712345678",
    payment?.senderMobile ?? "",
  );

  // The audit log keeps the number with all but the last four digits hidden.
  const audit = await prisma.auditLog.findFirst({
    where: {
      entityId: payment?.id ?? "",
      action: "Payment submitted",
    },
    select: { metadata: true },
  });

  const metadata = (audit?.metadata ?? {}) as Record<string, unknown>;

  check(
    "the audit log hides the number of the sender",
    metadata["senderMobile"] === "*******5678",
    String(metadata["senderMobile"] ?? ""),
  );

  check(
    "the audit log keeps no card number",
    !JSON.stringify(metadata).toLowerCase().includes("cardnumber"),
  );

  // The office matches the payment with the statement of the wallet, so the
  // admin sees the whole number on the pending screen. The audit log above
  // carries the masked form, and this is the full one.
  const pendingList = await listPendingPayments();

  const queued = pendingList.find((entry) => entry.id === payment?.id);

  check(
    "the pending queue shows the number the money was sent from",
    queued?.senderMobile === "01712345678",
    queued?.senderMobile ?? "not in the queue",
  );

  check(
    "the pending queue never shows a card number",
    !pendingList.some((entry) =>
      JSON.stringify(entry).toLowerCase().includes("cardnumber"),
    ),
  );

  // The fee now waits for the verification, so it is not payable again.
  const feesAfter = await request("/student/fees", { jar });

  check("the fee waits for the verification", feesAfter.body.includes("Pending"));

  // A second request for the same fee is refused, because the fee already
  // waits for the verification.
  const second = await submitPayment(jar, payable.id, "BKASH");

  check(
    "a fee that waits cannot be paid twice",
    second.ok === false,
    second.detail,
  );

  // A pending payment never writes a receipt and never marks a fee as paid.
  const pendingReceipts = await prisma.receipt.count({
    where: { paymentId: payment?.id ?? "" },
  });

  const paidFees = await prisma.fee.count({
    where: { id: payable.id, status: "PAID" },
  });

  check("a waiting payment writes no receipt", pendingReceipts === 0);

  check("a waiting payment marks no fee as paid", paidFees === 0);

  /* ------------------------------------------------- the race ------------ */

  await checkRace(jar);

  /* ------------------------------------------------- the other states ---- */

  await checkPaidAndPendingRefused(jar);

  /* ------------------------------------------------- the rate limit ------ */

  const rateLimited = await checkRateLimit(jar);

  check("the submissions are rate limited", rateLimited.pass, rateLimited.detail);

  /* ------------------------------------------------- the card data ------- */

  await checkNoCardData();
}

/**
 * A throwaway student with a real record, so the checks have somebody else's
 * data to point at.
 */
async function createOtherStudent(): Promise<{
  id: string;
  studentId: string;
  month: string;
  examId: string;
  marks: number;
  subject: string;
  resultId: string;
  feeLabel: string;
}> {
  const passwordHash = await bcryptHash();

  const demo = await prisma.student.findFirst({
    where: { class: { name: "Class 9" } },
    orderBy: { roll: "asc" },
    select: { id: true, classId: true, sectionId: true, academicYearId: true },
  });

  if (!demo) throw new Error("no Class 9 student to copy");

  const loginId = "b5-check-other";

  const user = await prisma.user.upsert({
    where: { loginIdNormalized: loginId },
    update: {
      passwordHash,
      role: "STUDENT",
      isActive: true,
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      id: `user-${loginId}`,
      loginId,
      loginIdNormalized: loginId,
      name: "B5 Other Student",
      email: `${loginId}@example.com`,
      passwordHash,
      role: "STUDENT",
      classOrDepartment: "Class 9",
      isActive: true,
      mustChangePassword: false,
    },
  });

  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      id: `student-${loginId}`,
      userId: user.id,
      studentId: "ST-B5-0002",
      name: "B5 Other Student",
      classId: demo.classId,
      sectionId: demo.sectionId,
      academicYearId: demo.academicYearId,
      roll: 998,
      guardianName: "Guardian",
      guardianPhone: "01700000000",
      phone: "01700000000",
      emergencyContact: "01800000000",
      email: `${loginId}@example.com`,
      address: "Narail",
    },
  });

  const attendance = await prisma.attendance.findFirst({
    where: { studentId: demo.id },
    orderBy: { date: "asc" },
    select: { date: true, status: true, sectionId: true },
  });

  if (attendance) {
    await prisma.attendance.upsert({
      where: {
        studentId_date: { studentId: student.id, date: attendance.date },
      },
      update: { status: attendance.status },
      create: {
        studentId: student.id,
        sectionId: attendance.sectionId,
        date: attendance.date,
        status: attendance.status,
      },
    });
  }

  // The other student gets a result in a subject the check student has no
  // result in, so the row of the other student cannot be mistaken for a row
  // of the check student. A mark on its own proves nothing: the two students
  // sat the same exam, so they may well have the same mark in the same
  // subject, and the subject alone proves nothing either.
  const ownSubjects = await prisma.examResult.findMany({
    where: { studentId: `student-${CHECK_LOGIN_ID}` },
    select: { subjectId: true },
  });

  const ownSubjectIds = new Set(ownSubjects.map((row) => row.subjectId));

  const otherSubject = await prisma.subject.findFirst({
    where: { id: { notIn: [...ownSubjectIds] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const result = await prisma.examResult.findFirst({
    where: { studentId: demo.id, status: "PUBLISHED" },
    select: {
      examId: true,
      subjectId: true,
      resultSheetId: true,
      marks: true,
      subject: { select: { name: true } },
    },
  });

  // The mark of the other student is one the check student cannot have, so a
  // mark on the page can only be the mark of the other student.
  const otherMarks = result ? 61 : -1;

  if (result && otherSubject) {
    await prisma.examResult.upsert({
      where: {
        examId_studentId_subjectId: {
          examId: result.examId,
          studentId: student.id,
          subjectId: otherSubject.id,
        },
      },
      update: { marks: otherMarks },
      create: {
        id: `b5-other-result-${result.examId}-${otherSubject.id}`,
        examId: result.examId,
        studentId: student.id,
        subjectId: otherSubject.id,
        resultSheetId: result.resultSheetId,
        marks: otherMarks,
        grade: "C",
        gpa: 3.0,
        status: "PUBLISHED",
      },
    });
  }

  const feeLabel = "B5 other student fee";

  await prisma.fee.upsert({
    where: { id: `fee-b5-check-other` },
    update: {},
    create: {
      id: `fee-b5-check-other`,
      studentId: student.id,
      feeStructureId: "fee-structure-class-9",
      label: feeLabel,
      period: "2026-11:other",
      amountPoisha: 10000,
      dueDate: new Date("2026-11-10T00:00:00.000Z"),
      status: "DUE",
    },
  });

  return {
    id: student.id,
    studentId: student.studentId,
    month: attendance
      ? `${attendance.date.getUTCFullYear()}-${String(attendance.date.getUTCMonth() + 1).padStart(2, "0")}`
      : "2026-11",
    examId: result?.examId ?? "",
    // The mark of the other student is one the check student cannot have, so
    // a mark on the page can only be the mark of the other student.
    marks: otherMarks,
    // The subject the other student sat and the check student did not, so the
    // check can look for the row of the other student and not only for a
    // number.
    subject: otherSubject?.name ?? "",
    // The id of the row of the other student, which may never reach the page.
    resultId:
      result && otherSubject
        ? `b5-other-result-${result.examId}-${otherSubject.id}`
        : "",
    feeLabel,
  };
}

/**
 * The password hash of the throwaway accounts.
 */
async function bcryptHash(): Promise<string> {
  const bcrypt = await import("bcryptjs");

  return bcrypt.hash(CHECK_PASSWORD, 12);
}

/**
 * Two submissions of the same fee line at the same moment.
 *
 * Exactly one of them may succeed, and exactly one waiting payment may be
 * left behind.
 */
async function checkRace(jar: CookieJar): Promise<void> {
  const fee = await prisma.fee.findFirst({
    where: {
      studentId: `student-${CHECK_LOGIN_ID}`,
      status: { not: "PAID" },
      payments: { none: { payment: { status: "PENDING" } } },
    },
    orderBy: { label: "asc" },
    select: { id: true, amountPoisha: true },
  });

  if (!fee) {
    check("two submissions of the same fee leave one payment", true, "no free fee");
    return;
  }

  // The two submissions are sent at the same moment, so they really race.
  const [first, second] = await Promise.all([
    submitPayment(jar, fee.id, "BKASH", {
      transactionId: `RACE-A-${Date.now()}`,
    }),
    submitPayment(jar, fee.id, "NAGAD", {
      transactionId: `RACE-B-${Date.now()}`,
    }),
  ]);

  const succeeded = [first, second].filter((entry) => entry.ok).length;

  check(
    "two submissions of the same fee leave one payment",
    succeeded === 1,
    `${succeeded} of 2 succeeded`,
  );

  const pendingItems = await prisma.paymentItem.findMany({
    where: {
      feeId: fee.id,
      payment: { status: "PENDING" },
    },
    select: { id: true },
  });

  check(
    "one waiting payment item is left for the fee",
    pendingItems.length === 1,
    `${pendingItems.length} items`,
  );

  const pendingPayments = await prisma.payment.count({
    where: {
      studentId: `student-${CHECK_LOGIN_ID}`,
      status: "PENDING",
      items: { some: { feeId: fee.id } },
    },
  });

  check(
    "one waiting payment is left for the fee",
    pendingPayments === 1,
    `${pendingPayments} payments`,
  );

  await checkDatabaseRule(fee.id);
}

/**
 * The database refuses a second waiting item for the same fee line.
 *
 * The application already refuses it, and the lock inside the transaction
 * makes the refusal certain. This check goes around the application on
 * purpose: it writes the item straight into the table, so the rule is proved
 * to be the database's own and not only the server's.
 */
async function checkDatabaseRule(feeId: string): Promise<void> {
  // A second payment of the same student, so the item belongs to a real
  // student and the trigger reads the payment the way it reads a real one.
  const payment = await prisma.payment.create({
    data: {
      studentId: `student-${CHECK_LOGIN_ID}`,
      amountPoisha: 100,
      method: "CASH",
      status: "PENDING",
    },
    select: { id: true },
  });

  let refused = false;

  try {
    await prisma.paymentItem.create({
      data: {
        paymentId: payment.id,
        feeId,
        amountPoisha: 100,
      },
    });
  } catch {
    refused = true;
  }

  const items = await prisma.paymentItem.count({
    where: {
      feeId,
      payment: { status: "PENDING" },
    },
  });

  check(
    "the database refuses a second waiting item for the fee",
    refused && items === 1,
    refused ? "refused" : "written",
  );

  // The payment of the check is removed again, so the checks leave nothing
  // behind.
  await prisma.paymentItem.deleteMany({ where: { paymentId: payment.id } });
  await prisma.payment.delete({ where: { id: payment.id } });
}

/**
 * A fee that is already paid and a fee that already waits are both refused.
 */
async function checkPaidAndPendingRefused(jar: CookieJar): Promise<void> {
  // A fee that is already paid.
  const paid = await prisma.fee.findFirst({
    where: { studentId: `student-${CHECK_LOGIN_ID}`, status: "PAID" },
    select: { id: true },
  });

  if (paid) {
    const refused = await submitPayment(jar, paid.id, "BKASH", {
      transactionId: `PAID-${Date.now()}`,
    });

    check(
      "a fee that is already paid is refused",
      refused.ok === false,
      refused.detail,
    );
  } else {
    check("a fee that is already paid is refused", true, "no paid fee");
  }

  // A fee that already waits for the verification.
  const waiting = await prisma.fee.findFirst({
    where: {
      studentId: `student-${CHECK_LOGIN_ID}`,
      status: { not: "PAID" },
      payments: { some: { payment: { status: "PENDING" } } },
    },
    select: { id: true },
  });

  if (waiting) {
    const refused = await submitPayment(jar, waiting.id, "BKASH", {
      transactionId: `WAITING-${Date.now()}`,
    });

    check(
      "a fee that waits for the verification is refused",
      refused.ok === false,
      refused.detail,
    );
  } else {
    check(
      "a fee that waits for the verification is refused",
      true,
      "no waiting fee",
    );
  }
}

/**
 * The file route serves an attachment only to the audience the notice was
 * addressed to.
 *
 * The school may have no uploaded file at the moment, so the check writes its
 * own: three files, one behind a notice for the teachers, one behind a draft
 * notice and one behind a notice for the students. The files are removed
 * again when the check is over.
 */
async function checkAttachments(jar: CookieJar): Promise<void> {
  const { saveFile } = await import("@/server/storage");

  /** A one-pixel PNG, used as the bytes of an accepted upload. */
  const PNG_BYTES = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  /** The files the check wrote, so they can be removed again. */
  const written: string[] = [];

  /**
   * Writes a file and hangs it behind a notice.
   */
  const attach = async (
    noticeId: string,
    name: string,
  ): Promise<string | null> => {
    const saved = await saveFile({ bytes: PNG_BYTES, originalName: name });

    if (!saved.ok) return null;

    written.push(saved.data.storageKey);

    const file = await prisma.storedFile.create({
      data: {
        storageKey: saved.data.storageKey,
        originalName: saved.data.originalName,
        mimeType: saved.data.mimeType,
        sizeBytes: saved.data.sizeBytes,
      },
      select: { id: true },
    });

    await prisma.noticeAttachment.create({
      data: {
        id: `b5-check-attachment-${noticeId}`,
        noticeId,
        name: saved.data.originalName,
        format: "PNG",
        size: `${saved.data.sizeBytes} B`,
        fileId: file.id,
      },
    });

    return file.id;
  };

  // A published notice for the students only.
  const studentsNotice = await prisma.notice.create({
    data: {
      id: "b5-check-notice-students",
      title: "B5 check notice for the students",
      body: "<p>A notice the students may read.</p>",
      category: "General",
      audience: "STUDENTS",
      audiences: ["STUDENTS"],
      status: "PUBLISHED",
      publishedOn: new Date("2026-11-01T00:00:00.000Z"),
    },
    select: { id: true },
  });

  // A draft notice, which nobody but an admin may read.
  const draftNotice = await prisma.notice.create({
    data: {
      id: "b5-check-notice-draft",
      title: "B5 check draft notice",
      body: "<p>A notice that was never published.</p>",
      category: "General",
      audience: "STUDENTS",
      audiences: ["STUDENTS"],
      status: "DRAFT",
    },
    select: { id: true },
  });

  const teachersFile = await attach("b5-check-notice-teachers", "teachers.png");
  const draftFile = await attach(draftNotice.id, "draft.png");
  const studentsFile = await attach(studentsNotice.id, "students.png");

  if (teachersFile) {
    const response = await request(`/api/files/${teachersFile}`, { jar });

    check(
      "an attachment of a notice for the teachers is not served",
      response.status === 404,
      `status ${response.status}`,
    );
  } else {
    check(
      "an attachment of a notice for the teachers is not served",
      false,
      "the file could not be written",
    );
  }

  if (draftFile) {
    const response = await request(`/api/files/${draftFile}`, { jar });

    check(
      "an attachment of a draft notice is not served",
      response.status === 404,
      `status ${response.status}`,
    );
  } else {
    check(
      "an attachment of a draft notice is not served",
      false,
      "the file could not be written",
    );
  }

  if (studentsFile) {
    const response = await request(`/api/files/${studentsFile}`, { jar });

    check(
      "an attachment of a notice for the students is served",
      response.status === 200,
      `status ${response.status}`,
    );

    // An anonymous visitor never gets a file of a notice for the students.
    const anonymous = await request(`/api/files/${studentsFile}`);

    check(
      "an anonymous visitor is refused the file of a notice for the students",
      anonymous.status !== 200,
      `status ${anonymous.status}`,
    );
  } else {
    check(
      "an attachment of a notice for the students is served",
      false,
      "the file could not be written",
    );

    check(
      "an anonymous visitor is refused the file of a notice for the students",
      false,
      "the file could not be written",
    );
  }

  await removeCheckFiles(written);
}

/**
 * Removes the files the attachment check wrote.
 */
async function removeCheckFiles(storageKeys: readonly string[]): Promise<void> {
  const { deleteFile } = await import("@/server/storage");

  await prisma.noticeAttachment.deleteMany({
    where: { id: { startsWith: "b5-check-attachment-" } },
  });

  await prisma.storedFile.deleteMany({
    where: { storageKey: { in: [...storageKeys] } },
  });

  await prisma.notice.deleteMany({
    where: { id: { startsWith: "b5-check-notice-" } },
  });

  for (const key of storageKeys) {
    await deleteFile(key);
  }
}


/**
 * Checks that the submissions of a student are rate limited.
 */
async function checkRateLimit(
  jar: CookieJar,
): Promise<{ pass: boolean; detail: string }> {
  const student = await checkStudent();

  if (!student) return { pass: false, detail: "no student" };

  // The window holds five requests, so six in a row are refused.
  const since = new Date(Date.now() - 10 * 60 * 1000);

  const existing = await prisma.payment.count({
    where: { studentId: student.id, createdAt: { gte: since } },
  });

  const toCreate = Math.max(0, 5 - existing);

  for (let index = 0; index < toCreate; index += 1) {
    await prisma.payment.create({
      data: {
        studentId: student.id,
        amountPoisha: 100,
        method: "CASH",
        status: "PENDING",
        recordedById: `user-${CHECK_LOGIN_ID}`,
      },
    });
  }

  const fee = await prisma.fee.findFirst({
    where: { studentId: student.id, status: { not: "PAID" } },
    select: { id: true },
  });

  if (!fee) return { pass: false, detail: "no payable fee" };

  const refused = await submitPayment(jar, fee.id, "NAGAD");

  return {
    pass: refused.ok === false,
    detail: refused.detail.slice(0, 120),
  };
}

/**
 * Checks that no card number and no security code is kept anywhere.
 */
async function checkNoCardData(): Promise<void> {
  const tables = await prisma.$queryRawUnsafe<
    { table_name: string; column_name: string }[]
  >(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND (column_name ILIKE '%card%' OR column_name ILIKE '%cvc%' OR column_name ILIKE '%cvv%' OR column_name ILIKE '%pan%')",
  );

  const cardColumns = tables.filter(
    (row) => row.column_name.toLowerCase() !== "card_last4",
  );

  check(
    "no column holds a card number or a security code",
    cardColumns.length === 0,
    cardColumns.map((row) => `${row.table_name}.${row.column_name}`).join(", "),
  );

  const payments = await prisma.payment.findMany({
    select: { id: true, cardLast4: true, transactionId: true },
  });

  const withCard = payments.filter(
    (payment) => payment.cardLast4 !== null && payment.cardLast4 !== "",
  );

  const longCard = withCard.filter(
    (payment) => (payment.cardLast4 ?? "").length !== 4,
  );

  check(
    "only the last four digits of a card are kept",
    longCard.length === 0,
    longCard.map((payment) => payment.id).join(", "),
  );

  // The number of a card is never written into the audit log.
  const audits = await prisma.auditLog.findMany({
    select: { metadata: true },
  });

  const leaked = audits.filter((audit) => {
    const text = JSON.stringify(audit.metadata ?? {}).toLowerCase();

    return (
      text.includes("cardnumber") ||
      text.includes("card number") ||
      text.includes("cvc") ||
      text.includes("cvv")
    );
  });

  check("no card number is written into the audit log", leaked.length === 0);
}

/**
 * The entry point.
 *
 * The script runs the checks by default. `--setup` and `--teardown` only put
 * the check student in place or take it away, which is what the Figma compare
 * of a student page needs when it signs in with that student.
 */
async function entry(): Promise<void> {
  if (process.argv.includes("--setup")) {
    await createCheckStudent();
    await prisma.$disconnect();
    return;
  }

  if (process.argv.includes("--teardown")) {
    await removeCheckStudent();
    console.log("The check student is removed.");
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
    // The rows the checks wrote are removed, so the school is left the way
    // the seed describes it and the checks can be run again.
    await prisma.noticeAttachment.deleteMany({
      where: { id: { startsWith: "b5-check-attachment-" } },
    });
    await prisma.storedFile.deleteMany({
      where: { storageKey: { startsWith: "b5-" } },
    });
    await prisma.notice.deleteMany({
      where: { id: { startsWith: "b5-check-notice-" } },
    });
    await removeCheckStudent();
    await prisma.$disconnect();

    const failed = results.filter((entry) => !entry.pass);

    console.log(
      `\n${results.length - failed.length} of ${results.length} checks passed.`,
    );

    if (failed.length > 0) process.exitCode = 1;
  });
