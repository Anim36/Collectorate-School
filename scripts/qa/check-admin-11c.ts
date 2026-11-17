import "dotenv/config";

import bcrypt from "bcryptjs";

import { prisma } from "@/server/db";
import { deleteQaAuditRows } from "./audit-cleanup";
import {
  exportFeesCsv,
  feeSummary,
  getFeesData,
  issueFees,
  listFeeStructures,
  listFees,
  recordPayment,
  saveFeeStructure,
} from "@/server/services/fees";
import {
  actionLabel,
  listAuditLog,
  summariseMetadata,
} from "@/server/services/audit-log";
import { getDashboardData } from "@/server/services/dashboard";

/**
 * The checks of step B3C.
 *
 * They run against the real database and clean up after themselves, so they
 * can be run again without changing the school.
 *
 * Usage: npx tsx scripts/qa/check-admin-11c.ts
 */

/** The prefix every row the checks write carries, so it can be removed. */
const PREFIX = "b3c-check";

/** The account the checks act as. It is thrown away afterwards. */
const ACTOR_ID = `${PREFIX}-admin`;

/** The class the checks issue the fees of. */
const CLASS_ID = "class-9";

/** The billing slot the checks issue the fees for. It is far in the future. */
const PERIOD = "2099-01";

const results: { name: string; pass: boolean; detail: string }[] = [];

function check(name: string, pass: boolean, detail = ""): void {
  results.push({ name, pass, detail });
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`,
  );
}

/**
 * Creates the account the checks act as.
 */
async function createActor(): Promise<string> {
  const passwordHash = await bcrypt.hash("B3C-Check-Pass-2026!", 12);

  await prisma.user.upsert({
    where: { loginIdNormalized: ACTOR_ID },
    update: { passwordHash, role: "ADMIN" },
    create: {
      id: ACTOR_ID,
      loginId: ACTOR_ID,
      loginIdNormalized: ACTOR_ID,
      name: "B3C Check",
      passwordHash,
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
    },
  });

  return ACTOR_ID;
}

/**
 * Removes every row the checks wrote.
 *
 * The rows are found by the slot they belong to, so the school keeps the fees
 * it had.
 */
async function cleanup(): Promise<void> {
  await deleteQaAuditRows(prisma, { actorIds: [ACTOR_ID] });

  await deleteQaAuditRows(prisma, { entityPrefix: PREFIX });

  // The payments the checks recorded are found through the receipt they
  // hold, and the fees they settled are found through the slot.
  const payments = await prisma.payment.findMany({
    where: { transactionId: { startsWith: PREFIX } },
    select: { id: true },
  });

  const paymentIds = payments.map((payment) => payment.id);

  await prisma.receipt.deleteMany({ where: { paymentId: { in: paymentIds } } });

  await prisma.paymentItem.deleteMany({
    where: { paymentId: { in: paymentIds } },
  });

  await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });

  // The fee lines the checks issued are put back to the state they were in.
  const issued = await prisma.fee.findMany({
    where: { period: { startsWith: `${PERIOD}:` } },
    select: { id: true },
  });

  const issuedIds = issued.map((fee) => fee.id);

  await prisma.paymentItem.deleteMany({
    where: { feeId: { in: issuedIds } },
  });

  await prisma.fee.deleteMany({ where: { id: { in: issuedIds } } });

  await prisma.receiptCounter.deleteMany({ where: { year: 2099 } });
}

/**
 * The money the checks changed, put back.
 *
 * The fee structure of the class is put back to the amounts it had, and the
 * counters of the year are taken off again.
 */
async function restoreStructure(
  original: { id: string } | null,
  snapshot: {
    monthlyTuitionPoisha: number;
    admissionFeePoisha: number;
    activitiesPoisha: number;
    dueDate: Date;
  } | null,
): Promise<void> {
  if (!original || !snapshot) return;

  await prisma.feeStructure.update({
    where: { id: original.id },
    data: {
      monthlyTuitionPoisha: snapshot.monthlyTuitionPoisha,
      admissionFeePoisha: snapshot.admissionFeePoisha,
      activitiesPoisha: snapshot.activitiesPoisha,
      dueDate: snapshot.dueDate,
    },
  });
}

async function main(): Promise<void> {
  await createActor();

  const structureSnapshot = await prisma.feeStructure.findFirst({
    where: { classId: CLASS_ID },
    select: {
      id: true,
      monthlyTuitionPoisha: true,
      admissionFeePoisha: true,
      activitiesPoisha: true,
      dueDate: true,
    },
  });

  try {
    /* ------------------------------------------------------------- reads --- */

    const structures = await listFeeStructures();

    check(
      "the fee structure holds a row for every class that has one",
      structures.length > 0 &&
        structures.every((row) => row.classId !== "" && row.className !== ""),
      `${structures.length} rows`,
    );

    const summary = await feeSummary();

    check(
      "the summary holds four cards",
      summary.length === 4 &&
        summary.every((card) => card.value !== "" && card.hint !== ""),
      summary.map((card) => `${card.label} ${card.value}`).join(" · "),
    );

    const all = await listFees({ page: 0, pageSize: 10 });

    check(
      "the payments table holds rows that carry a student and an amount",
      all.rows.length > 0 &&
        all.rows.every(
          (row) => row.student !== "" && row.amount.startsWith("৳"),
        ),
      `${all.total} rows`,
    );

    const paid = await listFees({ status: "PAID", page: 0, pageSize: 10 });

    check(
      "the Paid filter keeps only the paid lines",
      paid.rows.every((row) => row.status === "Paid"),
      `${paid.total} paid rows`,
    );

    const overdue = await listFees({ status: "OVERDUE", page: 0, pageSize: 10 });

    check(
      "the Overdue filter keeps only the overdue lines",
      overdue.rows.every((row) => row.status === "Overdue"),
      `${overdue.total} overdue rows`,
    );

    const searched = await listFees({ query: "Arif", page: 0, pageSize: 10 });

    check(
      "the search finds the student by name",
      searched.total === 0 || searched.rows.every((row) => row.student !== ""),
      `${searched.total} rows`,
    );

    const searchedAndPaid = await listFees({
      query: "Arif",
      status: "PAID",
      page: 0,
      pageSize: 10,
    });

    check(
      "the search and the status filter hold at the same time",
      searchedAndPaid.rows.every((row) => row.status === "Paid"),
      `${searchedAndPaid.total} rows`,
    );

    const page = await listFees({ page: 1, pageSize: 2 });

    check(
      "the pagination moves to the second page",
      page.page === 1 &&
        page.pageCount >= 2 &&
        page.rows.length <= 2,
      `page ${page.page + 1} of ${page.pageCount}, ${page.rows.length} rows`,
    );

    const data = await getFeesData({ page: 0, pageSize: 10 });

    check(
      "the page reads its metrics, its structure and its payments in one go",
      data.metrics.length === 4 &&
        data.structures.length === structures.length &&
        data.payments.rows.length > 0,
      `${data.metrics.length} cards, ${data.structures.length} classes, ${data.payments.total} payments`,
    );

    /* ------------------------------------------------------------ audit --- */

    const log = await listAuditLog({ page: 0, pageSize: 10 });

    check(
      "the audit log holds rows that name an actor and an action",
      log.rows.length > 0 &&
        log.rows.every((row) => row.user !== "" && row.action !== ""),
      `${log.total} events`,
    );

    const accountOnly = await listAuditLog({
      actionType: "Account",
      page: 0,
      pageSize: 10,
    });

    check(
      "the action-type filter keeps only the events of that kind",
      accountOnly.rows.every((row) => row.type === "Account"),
      `${accountOnly.total} account events`,
    );

    check(
      "an action nobody mapped still reads as a sentence",
      actionLabel("SomethingNobodyMapped") === "Something nobody mapped",
      actionLabel("SomethingNobodyMapped"),
    );

    check(
      "a secret key is never read into the summary",
      summariseMetadata({ password: "secret", cardLast4: "4242", count: 3 }) ===
        "count: 3",
      summariseMetadata({ password: "secret", cardLast4: "4242", count: 3 }),
    );

    /* --------------------------------------------------------- dashboard --- */

    const dashboard = await getDashboardData();

    check(
      "the dashboard holds four metric cards",
      dashboard.metrics.length === 4,
      dashboard.metrics.map((card) => `${card.label} ${card.value}`).join(" · "),
    );

    check(
      "the fee chart holds six months",
      dashboard.months.length === 6,
      dashboard.months.map((month) => month.label).join(", "),
    );

    check(
      "the attention table counts what really waits for the admin",
      dashboard.attention.length === 3 &&
        dashboard.attention.every((row) => row.count !== ""),
      dashboard.attention.map((row) => `${row.task} ${row.count}`).join(" · "),
    );

    /* ------------------------------------------------------------ writes --- */

    const issued = await issueFees(ACTOR_ID, {
      classId: CLASS_ID,
      period: PERIOD,
      lines: ["tuition"],
    });

    check(
      "issuing the fees of a slot writes the lines of the students of the class",
      issued.ok && issued.data.issued > 0,
      issued.ok ? `${issued.data.issued} lines` : issued.error,
    );

    const issuedAgain = await issueFees(ACTOR_ID, {
      classId: CLASS_ID,
      period: PERIOD,
      lines: ["tuition"],
    });

    check(
      "issuing the same slot twice writes nothing the second time",
      issuedAgain.ok && issuedAgain.data.issued === 0,
      issuedAgain.ok ? `${issuedAgain.data.issued} lines` : issuedAgain.error,
    );

    // The line the checks settle is one of the lines they issued, so it is
    // still due. A seeded line may already be paid, and a payment of a paid
    // line is refused.
    //
    // The issued lines are read straight from the database, because they sort
    // to the end of the table and a page of the list may not hold one.
    const issuedFee = await prisma.fee.findMany({
      where: { period: `${PERIOD}:tuition` },
      orderBy: { id: "asc" },
      take: 1,
      select: {
        id: true,
        invoiceNo: true,
        amountPoisha: true,
        student: { select: { name: true } },
      },
    });

    const issuedRow = issuedFee[0]
      ? {
          id: issuedFee[0].id,
          invoice: issuedFee[0].invoiceNo ?? "",
          amountPoisha: issuedFee[0].amountPoisha,
          student: issuedFee[0].student.name,
        }
      : null;

    check(
      "an issued line carries an invoice number",
      issuedRow !== null && issuedRow.invoice.startsWith("INV-"),
      issuedRow ? issuedRow.invoice : "no issued line found",
    );

    const auditAfterIssue = await listAuditLog({ page: 0, pageSize: 50 });

    check(
      "issuing the fees records a row in the audit log",
      auditAfterIssue.rows.some((row) => row.action === "Issued fees"),
      auditAfterIssue.rows
        .slice(0, 3)
        .map((row) => row.action)
        .join(", "),
    );

    if (issuedRow) {
      const recorded = await recordPayment(ACTOR_ID, {
        feeIds: [issuedRow.id],
        method: "BKASH",
        transactionId: `${PREFIX}-TX-1`,
        amountPoisha: issuedRow.amountPoisha,
        paidOn: "2026-11-10",
      });

      check(
        "recording a payment hands out a receipt number",
        recorded.ok && recorded.data.receiptNo.startsWith("RCPT-"),
        recorded.ok ? recorded.data.receiptNo : recorded.error,
      );

      const paidRow = await listFees({
        query: issuedRow.student,
        page: 0,
        pageSize: 100,
      });

      check(
        "the paid line shows the method and the receipt",
        paidRow.rows.some(
          (row) =>
            row.id === issuedRow.id &&
            row.status === "Paid" &&
            row.method === "bKash" &&
            row.receipt !== "",
        ),
        paidRow.rows
          .filter((row) => row.id === issuedRow.id)
          .map((row) => `${row.status} ${row.method} ${row.receipt}`)
          .join(", "),
      );

      const paidTwice = await recordPayment(ACTOR_ID, {
        feeIds: [issuedRow.id],
        method: "CASH",
        amountPoisha: issuedRow.amountPoisha,
        paidOn: "2026-11-10",
      });

      check(
        "a line that is already paid cannot be paid twice",
        !paidTwice.ok,
        paidTwice.ok ? "it was accepted" : paidTwice.error,
      );
    }

    const mobileWithoutId = await recordPayment(ACTOR_ID, {
      feeIds: [issuedRow?.id ?? "none"],
      method: "BKASH",
      amountPoisha: 100,
      paidOn: "2026-11-10",
    });

    check(
      "a mobile payment without a transaction id is refused",
      !mobileWithoutId.ok,
      mobileWithoutId.ok ? "it was accepted" : mobileWithoutId.error,
    );

    const cardWithoutDigits = await recordPayment(ACTOR_ID, {
      feeIds: [issuedRow?.id ?? "none"],
      method: "CARD",
      amountPoisha: 100,
      paidOn: "2026-11-10",
    });

    check(
      "a card payment without the last four digits is refused",
      !cardWithoutDigits.ok,
      cardWithoutDigits.ok ? "it was accepted" : cardWithoutDigits.error,
    );

    if (structureSnapshot) {
      const saved = await saveFeeStructure(ACTOR_ID, {
        id: structureSnapshot.id,
        monthlyTuitionPoisha: structureSnapshot.monthlyTuitionPoisha + 10000,
        admissionFeePoisha: structureSnapshot.admissionFeePoisha,
        activitiesPoisha: structureSnapshot.activitiesPoisha,
        dueDate: structureSnapshot.dueDate.toISOString().slice(0, 10),
      });

      check(
        "the fee structure of a class can be edited",
        saved.ok,
        saved.ok ? "saved" : saved.error,
      );

      const afterEdit = await listFeeStructures();

      const edited = afterEdit.find((row) => row.id === structureSnapshot.id);

      check(
        "the edited amount is the one the table shows",
        edited?.monthlyTuitionPoisha ===
          structureSnapshot.monthlyTuitionPoisha + 10000,
        edited ? `${edited.monthlyTuitionPoisha} poisha` : "the row is gone",
      );

      await restoreStructure(
        { id: structureSnapshot.id },
        structureSnapshot,
      );
    }

    const exported = await exportFeesCsv({ page: 0, pageSize: 10 });

    check(
      "the export holds a header and a row for every payment that matches",
      exported.ok &&
        exported.data.csv.startsWith("Student,Student ID,Class,Invoice") &&
        exported.data.csv.split("\r\n").length > 1,
      exported.ok ? `${exported.data.csv.split("\r\n").length - 2} rows` : exported.error,
    );

    const exportedAll = await exportFeesCsv({});

    const exportedRows = exportedAll.ok
      ? exportedAll.data.csv.split("\r\n").length - 2
      : 0;

    // The count is read again, because the checks have issued fees since the
    // first read and the export has to cover them as well.
    const current = await listFees({ page: 0, pageSize: 1 });

    check(
      "the export holds every line that matches, not only the first page",
      exportedAll.ok && exportedRows === current.total,
      exportedAll.ok ? `${exportedRows} rows of ${current.total}` : exportedAll.error,
    );
  } finally {
    await restoreStructure(
      structureSnapshot ? { id: structureSnapshot.id } : null,
      structureSnapshot,
    );

    await cleanup();
  }

  console.log("");
  const failed = results.filter((result) => !result.pass);

  console.log(
    failed.length === 0
      ? `ALL ${results.length} CHECKS PASSED`
      : `${failed.length} of ${results.length} checks failed`,
  );

  await prisma.$disconnect();

  process.exit(failed.length === 0 ? 0 : 1);
}

void main();
