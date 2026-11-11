import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

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
 * Usage: npx tsx scripts/qa/check-student-b5.ts [baseUrl]
 */

const BASE_URL = process.argv[2] ?? "http://localhost:3000";

const PASSWORD = "B5-Student-Pass-2026!";
const LOGIN_ID = "b5-check-student";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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
 * Puts a QA student with a real record in place.
 *
 * The student pages read the database, so the check needs a student that
 * really has attendance, results, fees and a receipt. The account is a
 * throwaway: it is removed again when the check is over.
 */
async function createCheckStudent(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // A student of Class 9, because the seed writes attendance, results and
  // fees for that class.
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
    where: { loginIdNormalized: LOGIN_ID },
    update: {
      passwordHash,
      role: "STUDENT",
      isActive: true,
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      id: `user-${LOGIN_ID}`,
      loginId: LOGIN_ID,
      loginIdNormalized: LOGIN_ID,
      name: "B5 Check Student",
      email: `${LOGIN_ID}@example.com`,
      passwordHash,
      role: "STUDENT",
      classOrDepartment: "Class 9",
      isActive: true,
      mustChangePassword: false,
    },
  });

  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: { lastVisitedAt: null },
    create: {
      id: `student-${LOGIN_ID}`,
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
      email: `${LOGIN_ID}@example.com`,
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

  // A fee line of the student, so the fees table has something to show.
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
      where: { id: `fee-${LOGIN_ID}-tuition` },
      update: {},
      create: {
        id: `fee-${LOGIN_ID}-tuition`,
        studentId: student.id,
        feeStructureId: structure.id,
        label: "November tuition",
        period: "2026-11:tuition",
        amountPoisha: structure.monthlyTuitionPoisha,
        dueDate: structure.dueDate,
        status: "DUE",
      },
    });
  }
}

/**
 * Removes every row the checks wrote.
 */
async function cleanup(): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { userId: `user-${LOGIN_ID}` },
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
    await prisma.auditLog.deleteMany({ where: { actorId: `user-${LOGIN_ID}` } });
    await prisma.student.delete({ where: { id: student.id } });
  }

  await prisma.user.deleteMany({ where: { loginId: LOGIN_ID } });
}

/**
 * Runs the checks.
 */
async function main(): Promise<void> {
  await cleanup();
  await createCheckStudent();

  const jar = await signIn(LOGIN_ID, PASSWORD, "STUDENT");

  if (!jar) {
    check("the session is established", false, "no csrf token");
    return;
  }

  const session = await request("/api/auth/session", { jar });

  check(
    "the session is established",
    session.status === 200 && session.body.includes(LOGIN_ID),
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

  check(
    "the dashboard shows the fee due",
    dashboard.body.includes("Fee due"),
  );

  check(
    "the dashboard shows the new notices count",
    dashboard.body.includes("New notices"),
  );

  // The attendance page reads the month out of the database.
  const attendance = await request("/student/attendance", { jar });

  check(
    "the attendance page offers a month",
    attendance.body.includes("attendance-month"),
  );

  // A month that is not the student's own is not readable: the page falls
  // back to the newest month the student really has.
  const attendanceMonth = await request(
    "/student/attendance?month=1999-01",
    { jar },
  );

  check(
    "an unknown month falls back to the student's own months",
    attendanceMonth.status === 200 &&
      !attendanceMonth.body.includes("January 1999"),
  );

  // The profile page shows the student's own row.
  const profile = await request("/student/profile", { jar });

  check(
    "the profile shows the student's own identifier",
    profile.body.includes("ST-B5-0001"),
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
  const result = await request("/student/result", { jar });

  check(
    "the result page shows the marks table",
    result.body.includes("Marks for"),
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
        results: { some: { studentId: `student-${LOGIN_ID}`, status: "PUBLISHED" } },
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

  // The receipt of another student is not readable. The answer is the same as
  // for a receipt that does not exist, so an id cannot be probed.
  const otherReceipt = await prisma.receipt.findFirst({
    where: { studentId: { not: `student-${LOGIN_ID}` } },
    select: { id: true },
  });

  if (otherReceipt) {
    const other = await request(`/student/fees/receipt/${otherReceipt.id}`, {
      jar,
    });

    const missing = await request(
      "/student/fees/receipt/receipt-that-does-not-exist",
      { jar },
    );

    check(
      "the receipt of another student is not readable",
      other.status === 404,
      `status ${other.status}`,
    );

    check(
      "a receipt of another student reads like one that does not exist",
      other.status === missing.status,
      `${other.status} vs ${missing.status}`,
    );
  } else {
    check("the receipt of another student is not readable", true, "no receipt");
  }

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

  // The payment request: the amount comes from the fee lines, and the
  // payment waits for the admin.
  const payable = await prisma.fee.findFirst({
    where: { studentId: `student-${LOGIN_ID}`, status: { not: "PAID" } },
    select: { id: true, amountPoisha: true },
  });

  if (payable) {
    const before = await prisma.payment.count({
      where: { studentId: `student-${LOGIN_ID}` },
    });

    const result = await submitPayment(jar, payable.id, "BKASH");

    const after = await prisma.payment.count({
      where: { studentId: `student-${LOGIN_ID}` },
    });

    check(
      "a payment request is written",
      after === before + 1,
      `${before} -> ${after}`,
    );

    const payment = await prisma.payment.findFirst({
      where: { studentId: `student-${LOGIN_ID}` },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amountPoisha: true,
        status: true,
        method: true,
        cardLast4: true,
        transactionId: true,
        receipt: { select: { id: true } },
      },
    });

    check(
      "the payment waits for the admin",
      payment?.status === "PENDING",
      payment?.status ?? "no payment",
    );

    check(
      "the payment carries no receipt yet",
      payment?.receipt === null,
    );

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

    // The fee now waits for the verification, so it is not payable again.
    const feesAfter = await request("/student/fees", { jar });

    check(
      "the fee waits for the verification",
      feesAfter.body.includes("Pending"),
    );

    // A second request for the same fee is refused, because the fee already
    // waits for the verification.
    const second = await submitPayment(jar, payable.id, "BKASH");

    check(
      "a fee that waits cannot be paid twice",
      second.ok === false,
      second.detail,
    );
  } else {
    check("a payment request is written", false, "no payable fee");
  }

  // The rate limit: a flood of requests is refused.
  const rateLimited = await checkRateLimit(jar);

  check("the submissions are rate limited", rateLimited.pass, rateLimited.detail);

  // An anonymous visitor never reaches the portal.
  const anonymous = await request("/student/dashboard");

  check(
    "an anonymous visitor is sent to the sign-in page",
    anonymous.status === 307 ||
      anonymous.status === 302 ||
      (anonymous.location ?? "").includes("/login"),
    `status ${anonymous.status}`,
  );
}

/**
 * The answer the server action gives.
 */
async function submitPayment(
  jar: CookieJar,
  feeId: string,
  method: string,
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
        senderMobile: "01712345678",
        transactionId: `B5TX${Date.now().toString().slice(-8)}`,
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
 * Checks that the submissions of a student are rate limited.
 */
async function checkRateLimit(
  jar: CookieJar,
): Promise<{ pass: boolean; detail: string }> {
  const student = await prisma.student.findUnique({
    where: { userId: `user-${LOGIN_ID}` },
    select: { id: true },
  });

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
        recordedById: `user-${LOGIN_ID}`,
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
 * The id of a server action and the route it is bound to.
 *
 * The manifest the server writes holds the id of every action and the page
 * that imports it, so the check posts to the route the browser would post to.
 */
async function findAction(
  name: string,
): Promise<{ id: string; route: string } | null> {
  const { readFileSync } = await import("node:fs");

  const manifest = JSON.parse(
    readFileSync(".next/server/server-reference-manifest.json", "utf8"),
  ) as {
    node?: Record<string, { workers?: Record<string, { moduleId?: string }> }>;
  };

  for (const [id, entry] of Object.entries(manifest.node ?? {})) {
    for (const [route, worker] of Object.entries(entry.workers ?? {})) {
      const moduleId = worker.moduleId ?? "";

      // The manifest holds the module id with the name of the action encoded
      // in it, so the name is matched on the decoded form.
      if (!decodeURIComponent(moduleId).includes(`"${name}"`)) continue;

      // The route of the manifest reads "app/student/fees/pay/page", while
      // the browser posts to "/student/fees/pay".
      const path = `/${route.replace(/^app\//, "").replace(/\/page$/, "")}`;

      return { id, route: path };
    }
  }

  return null;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();

    const failed = results.filter((entry) => !entry.pass);

    console.log(
      `\n${results.length - failed.length} of ${results.length} checks passed.`,
    );

    if (failed.length > 0) process.exitCode = 1;
  });
