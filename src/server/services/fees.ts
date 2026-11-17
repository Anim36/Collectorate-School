import { prisma } from "@/server/db";
import { MAX_LIST_ROWS } from "@/server/limits";
import {
  issueFeesSchema,
  listPaymentsSchema,
  recordPaymentSchema,
  saveFeeStructureSchema,
  type IssueFeesInput,
  type ListPaymentsInput,
  type RecordPaymentInput,
  type SaveFeeStructureInput,
} from "@/server/services/admin-11c-schemas";
import { writeAudit } from "@/server/services/audit";
import { formatPoisha, formatPoishaCompact } from "@/lib/money";
import type {
  AdminFeeList,
  AdminFeeMetric,
  AdminFeeRow,
  AdminFeeStatus,
  AdminFeeStructureRow,
  AdminFeesData,
  AdminPendingPayment,
} from "@/types/admin-11c";

/**
 * The fees of the school.
 *
 * Every read and every write goes through this service, so the page never
 * touches the database itself and the rules hold in one place:
 *
 * - money is an integer number of poisha and never a float,
 * - a fee that is issued twice is not issued again,
 * - a payment, its receipt and the fee statuses are written in one
 *   transaction,
 * - no card number and no security code is ever taken or stored.
 */

/** The number of poisha in one taka. */
export const POISHA_PER_TAKA = 100;

/** The prefix of a receipt number. */
export const RECEIPT_PREFIX = "RCPT";

/**
 * The lines a fee structure holds.
 *
 * Every line belongs to a billing slot, so a student holds one fee per slot
 * and per line.
 */
const FEE_LINES = [
  { key: "tuition", label: "tuition", column: "monthlyTuitionPoisha" },
  { key: "admission", label: "admission", column: "admissionFeePoisha" },
  { key: "activities", label: "activities", column: "activitiesPoisha" },
] as const;

/** The kind of fee line a slot holds. */
type FeeLineKey = (typeof FEE_LINES)[number]["key"];

/* -------------------------------------------------------------- utilities --- */

/**
 * Formats a taka amount the way the tables show it, e.g. "৳ 1,500".
 *
 * The amount is an integer number of poisha, so it is turned into taka here
 * and never anywhere else.
 */
export function formatTaka(poisha: number): string {
  return formatPoisha(poisha);
}

/**
 * The state of a fee line, worked out from its due date.
 *
 * The status column of the table is never stored as a stale value: a fee that
 * is due before today and is still unpaid is overdue.
 */
function statusOf(status: string, dueDate: Date, today: Date): AdminFeeStatus {
  if (status === "PAID") return "Paid";
  if (status === "OVERDUE") return "Overdue";
  if (dueDate.getTime() < today.getTime()) return "Overdue";
  return "Due";
}

/** Today, at midnight. */
function startOfToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * The name a payment method is shown under.
 */
export function methodLabel(method: string): string {
  switch (method) {
    case "BKASH":
      return "bKash";
    case "NAGAD":
      return "Nagad";
    case "CARD":
      return "Card";
    case "BANK_TRANSFER":
      return "Bank transfer";
    default:
      return "Cash";
  }
}

/**
 * The lines of a slot, in the order they are shown.
 */
function linesFor(keys: readonly FeeLineKey[]): {
  key: FeeLineKey;
  label: string;
  column: (typeof FEE_LINES)[number]["column"];
}[] {
  return FEE_LINES.filter((line) => keys.includes(line.key));
}

/* ----------------------------------------------------------------- reads --- */

/**
 * The fee structure of every class of the school.
 *
 * The classes come back in school order, from Nursery to Class 10.
 */
export async function listFeeStructures(): Promise<AdminFeeStructureRow[]> {
  const structures = await prisma.feeStructure.findMany({
    orderBy: { class: { sortOrder: "asc" } },
    select: {
      id: true,
      classId: true,
      monthlyTuitionPoisha: true,
      admissionFeePoisha: true,
      activitiesPoisha: true,
      dueDate: true,
      class: { select: { name: true } },
    },
  });

  return structures.map((structure) => ({
    id: structure.id,
    classId: structure.classId,
    className: structure.class.name,
    monthlyTuitionPoisha: structure.monthlyTuitionPoisha,
    admissionFeePoisha: structure.admissionFeePoisha,
    activitiesPoisha: structure.activitiesPoisha,
    dueDate: structure.dueDate.toISOString().slice(0, 10),
  }));
}

/**
 * The summary of the fees of the school.
 *
 * Every figure is worked out by the database, so the cards show the real
 * numbers and not the ones of a mock file.
 */
export async function feeSummary(): Promise<AdminFeeMetric[]> {
  const today = startOfToday();

  const [billed, collected, outstanding, overdue] = await Promise.all([
    prisma.fee.aggregate({ _sum: { amountPoisha: true } }),
    prisma.fee.aggregate({
      where: { status: "PAID" },
      _sum: { amountPoisha: true },
    }),
    prisma.fee.aggregate({
      where: { status: { not: "PAID" } },
      _sum: { amountPoisha: true },
    }),
    prisma.fee.aggregate({
      where: { status: { not: "PAID" }, dueDate: { lt: today } },
      _sum: { amountPoisha: true },
    }),
  ]);

  const billedPoisha = billed._sum.amountPoisha ?? 0;
  const collectedPoisha = collected._sum.amountPoisha ?? 0;
  const outstandingPoisha = outstanding._sum.amountPoisha ?? 0;
  const overduePoisha = overdue._sum.amountPoisha ?? 0;

  const rate =
    billedPoisha === 0
      ? 0
      : Math.round((collectedPoisha / billedPoisha) * 1000) / 10;

  return [
    {
      label: "Billed",
      value: formatPoishaCompact(billedPoisha),
      hint: "All fees issued",
    },
    {
      label: "Collected",
      value: formatPoishaCompact(collectedPoisha),
      hint: billedPoisha === 0 ? "Nothing billed yet" : `${rate}% of billed`,
    },
    {
      label: "Outstanding",
      value: formatPoishaCompact(outstandingPoisha),
      hint: "Still to be paid",
    },
    {
      label: "Overdue",
      value: formatPoishaCompact(overduePoisha),
      hint: "Past its due date",
    },
  ];
}

/**
 * The fee lines of the school, filtered and counted by the database.
 *
 * The search runs on the server, over the name of the student, the id of the
 * student and the receipt number, and the count is the number of lines that
 * really match.
 */
export async function listFees(
  raw: Partial<ListPaymentsInput> = {},
): Promise<AdminFeeList> {
  const parsed = listPaymentsSchema.safeParse(raw);

  if (!parsed.success) {
    return { rows: [], total: 0, page: 0, pageSize: 10, pageCount: 1 };
  }

  const { query, status, page, pageSize } = parsed.data;
  const today = startOfToday();

  const where: Record<string, unknown> = {};

  // The state is worked out from the due date and the stored status, so the
  // filter never reads a stale value.
  const conditions: Record<string, unknown>[] = [];

  if (status === "PAID") {
    conditions.push({ status: "PAID" });
  } else if (status === "DUE") {
    conditions.push({ status: "DUE", dueDate: { gte: today } });
  } else if (status === "OVERDUE") {
    // A line is overdue when it was marked overdue or when its due date has
    // passed, so both are counted.
    conditions.push({
      OR: [{ status: "OVERDUE" }, { status: "DUE", dueDate: { lt: today } }],
    });
  }

  const needle = query ?? "";

  if (needle !== "") {
    conditions.push({
      OR: [
        { student: { name: { contains: needle, mode: "insensitive" } } },
        {
          student: {
            studentId: { contains: needle, mode: "insensitive" },
          },
        },
        {
          student: {
            user: { name: { contains: needle, mode: "insensitive" } },
          },
        },
        { invoiceNo: { contains: needle, mode: "insensitive" } },
        {
          payments: {
            some: {
              payment: {
                receipt: {
                  receiptNo: { contains: needle, mode: "insensitive" },
                },
              },
            },
          },
        },
      ],
    });
  }

  // The status and the search are both conditions, so a search never throws
  // the status filter away.
  if (conditions.length === 1) {
    Object.assign(where, conditions[0]);
  } else if (conditions.length > 1) {
    where["AND"] = conditions;
  }

  const [total, fees] = await Promise.all([
    prisma.fee.count({ where }),
    prisma.fee.findMany({
      where,
      // The id is the last tiebreaker, so the order is total: without it two
      // lines written in the same moment could swap places between two reads,
      // and a line would then appear on two pages and on none.
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      skip: page * pageSize,
      take: pageSize,
      select: {
        id: true,
        label: true,
        period: true,
        amountPoisha: true,
        invoiceNo: true,
        dueDate: true,
        status: true,
        paidAt: true,
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
            class: { select: { name: true } },
          },
        },
        payments: {
          // Only a settled payment settles the line, so the newest settled
          // one is the one the table shows.
          where: { payment: { status: "COMPLETED" } },
          orderBy: { payment: { createdAt: "desc" } },
          take: 1,
          select: {
            payment: {
              select: {
                method: true,
                receipt: { select: { receiptNo: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const rows: AdminFeeRow[] = fees.map((fee) => {
    const payment = fee.payments[0]?.payment ?? null;

    return {
      id: fee.id,
      studentRowId: fee.student.id,
      student: fee.student.name,
      studentId: fee.student.studentId,
      className: fee.student.class.name,
      invoice: fee.invoiceNo ?? "—",
      label: fee.label,
      period: fee.period,
      amountPoisha: fee.amountPoisha,
      amount: formatTaka(fee.amountPoisha),
      status: statusOf(fee.status, fee.dueDate, today),
      method: payment ? methodLabel(payment.method) : "",
      dueOn: fee.dueDate.toISOString().slice(0, 10),
      paidOn: fee.paidAt ? fee.paidAt.toISOString().slice(0, 10) : "",
      receipt: payment?.receipt?.receiptNo ?? "",
    };
  });

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * The payments a student submitted that still wait for the admin.
 *
 * A student submits a payment and it lands in `PENDING`. The admin either
 * approves it — the receipt is written and the fees are marked as paid — or
 * rejects it with a reason. The queue is the place where the admin decides
 * what the school accepts.
 */
export async function listPendingPayments(): Promise<AdminPendingPayment[]> {
  const payments = await prisma.payment.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: MAX_LIST_ROWS,
    select: {
      id: true,
      amountPoisha: true,
      method: true,
      transactionId: true,
      senderMobile: true,
      createdAt: true,
      student: {
        select: {
          studentId: true,
          name: true,
          class: { select: { name: true } },
        },
      },
      items: { select: { feeId: true } },
    },
  });

  return payments.map((payment) => ({
    id: payment.id,
    student: payment.student.name,
    studentId: payment.student.studentId,
    className: payment.student.class.name,
    method: methodLabel(payment.method),
    transactionId: payment.transactionId ?? "",
    // The number the money was sent from, shown in full to the admin on the
    // pending screen: the office matches the payment with the statement of
    // the wallet, and it needs the whole number to do it.
    senderMobile: payment.senderMobile ?? "",
    amountPoisha: payment.amountPoisha,
    amount: formatPoisha(payment.amountPoisha),
    feeCount: payment.items.length,
    submittedOn: payment.createdAt.toISOString().slice(0, 10),
  }));
}

/**
 * Everything the fees page shows, read in one go.
 */
export async function getFeesData(
  raw: Partial<ListPaymentsInput> = {},
): Promise<AdminFeesData> {
  const [metrics, structures, payments, pending] = await Promise.all([
    feeSummary(),
    listFeeStructures(),
    listFees(raw),
    listPendingPayments(),
  ]);

  return { metrics, structures, payments, pending };
}

/* ---------------------------------------------------------------- writes --- */

/**
 * Edits the fee structure of a class.
 *
 * The change only touches the structure: the fees that were already issued
 * keep the amount they were issued with, because every fee line holds a copy
 * of the amount of the day.
 */
export async function saveFeeStructure(
  actorId: string,
  raw: SaveFeeStructureInput,
): Promise<
  { ok: true; data: { id: string } } | { ok: false; error: string }
> {
  const parsed = saveFeeStructureSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Those fees are not valid",
    };
  }

  const input = parsed.data;

  const existing = await prisma.feeStructure.findUnique({
    where: { id: input.id },
    select: { id: true, class: { select: { name: true } } },
  });

  if (!existing) {
    return { ok: false, error: "That fee structure does not exist" };
  }

  const dueDate = new Date(`${input.dueDate}T00:00:00.000Z`);

  try {
    await prisma.feeStructure.update({
      where: { id: input.id },
      data: {
        monthlyTuitionPoisha: input.monthlyTuitionPoisha,
        admissionFeePoisha: input.admissionFeePoisha,
        activitiesPoisha: input.activitiesPoisha,
        dueDate,
      },
    });
  } catch {
    return { ok: false, error: "The fee structure could not be saved" };
  }

  await writeAudit({
    actorId,
    action: "Fee structure edited",
    entityType: "Fee",
    entityId: input.id,
    metadata: {
      class: existing.class.name,
      monthlyTuitionPoisha: input.monthlyTuitionPoisha,
      admissionFeePoisha: input.admissionFeePoisha,
      activitiesPoisha: input.activitiesPoisha,
      dueDate: input.dueDate,
    },
  });

  return { ok: true, data: { id: input.id } };
}

/**
 * Issues the fees of a slot to the students of a class.
 *
 * The action is idempotent: a student holds one line per slot and per line,
 * so running it twice changes nothing.
 */
export async function issueFees(
  actorId: string,
  raw: IssueFeesInput,
): Promise<
  { ok: true; data: { issued: number } } | { ok: false; error: string }
> {
  const parsed = issueFeesSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Those fees are not valid",
    };
  }

  const input = parsed.data;

  const structures = await prisma.feeStructure.findMany({
    where: input.classId === "" ? undefined : { classId: input.classId },
    select: {
      id: true,
      classId: true,
      dueDate: true,
      monthlyTuitionPoisha: true,
      admissionFeePoisha: true,
      activitiesPoisha: true,
      class: { select: { name: true } },
    },
  });

  if (structures.length === 0) {
    return { ok: false, error: "That class has no fee structure" };
  }

  const students = await prisma.student.findMany({
    where: { classId: { in: structures.map((structure) => structure.classId) } },
    select: { id: true, classId: true },
  });

  const lines = linesFor(input.lines);

  // The lines that are already there are read in one go, so the action does
  // not ask the database once per student.
  const existing = await prisma.fee.findMany({
    where: {
      studentId: { in: students.map((student) => student.id) },
      feeStructureId: { in: structures.map((structure) => structure.id) },
      period: { startsWith: `${input.period}:` },
    },
    select: { studentId: true, feeStructureId: true, period: true },
  });

  const taken = new Set(
    existing.map((fee) => `${fee.studentId}|${fee.feeStructureId}|${fee.period}`),
  );

  const rows: {
    studentId: string;
    feeStructureId: string;
    label: string;
    period: string;
    amountPoisha: number;
    dueDate: Date;
    invoiceNo: string;
  }[] = [];

  for (const structure of structures) {
    for (const student of students) {
      if (student.classId !== structure.classId) continue;

      for (const line of lines) {
        const amount = structure[line.column];

        if (amount <= 0) continue;

        const period = `${input.period}:${line.key}`;

        // The unique key on the student, the fee structure and the slot is
        // what makes the action idempotent.
        if (taken.has(`${student.id}|${structure.id}|${period}`)) continue;

        rows.push({
          studentId: student.id,
          feeStructureId: structure.id,
          label: `${input.period} ${line.label}`,
          period,
          amountPoisha: amount,
          dueDate: structure.dueDate,
          invoiceNo: "",
        });
      }
    }
  }

  if (rows.length === 0) {
    return { ok: true, data: { issued: 0 } };
  }

  const invoiceNumbers = await freeInvoiceNumbers(
    rows.map((row) => `${row.studentId}|${row.feeStructureId}|${row.period}`),
  );

  for (const row of rows) {
    row.invoiceNo =
      invoiceNumbers.get(`${row.studentId}|${row.feeStructureId}|${row.period}`) ??
      "";
  }

  let issued = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      try {
        await tx.fee.create({
          data: {
            studentId: row.studentId,
            feeStructureId: row.feeStructureId,
            label: row.label,
            period: row.period,
            amountPoisha: row.amountPoisha,
            dueDate: row.dueDate,
            status: "DUE",
            invoiceNo: row.invoiceNo,
          },
        });

        issued += 1;
      } catch {
        // Another run of the action wrote the same line first, so nothing is
        // written twice.
      }
    }
  });

  await writeAudit({
    actorId,
    action: "Fees issued",
    entityType: "Fee",
    entityId: input.classId === "" ? "all-classes" : input.classId,
    metadata: {
      period: input.period,
      lines: input.lines,
      issued,
      classes: structures.map((structure) => structure.class.name),
    },
  });

  return { ok: true, data: { issued } };
}

/**
 * The invoice numbers of the lines that are about to be written.
 *
 * The numbers are derived from the line itself, so a line always carries the
 * same invoice number, and the numbers that are already taken are moved on
 * by one until a free one is found.
 */
async function freeInvoiceNumbers(
  keys: readonly string[],
): Promise<Map<string, string>> {
  const year = new Date().getUTCFullYear();
  const wanted = new Map<string, string>();

  for (const key of keys) {
    const digest = key
      .split("")
      .reduce(
        (total, character) =>
          (total * 31 + character.charCodeAt(0)) % 1_000_000,
        7,
      );

    wanted.set(key, `INV-${year}-${String(digest).padStart(6, "0")}`);
  }

  const candidates = [...new Set(wanted.values())];

  const taken = new Set(
    (
      await prisma.fee.findMany({
        where: { invoiceNo: { in: candidates } },
        select: { invoiceNo: true },
      })
    ).map((fee) => fee.invoiceNo ?? ""),
  );

  for (const key of wanted.keys()) {
    let candidate = wanted.get(key)!;

    while (taken.has(candidate)) {
      const tail = (Number(candidate.slice(-6)) + 1) % 1_000_000;
      candidate = `INV-${year}-${String(tail).padStart(6, "0")}`;
    }

    taken.add(candidate);
    wanted.set(key, candidate);
  }

  return wanted;
}

/**
 * Records a payment the admin took at the desk.
 *
 * The payment, the receipt and the new status of the fee lines are written in
 * one transaction, so a failure leaves nothing behind. The amount has to be
 * the sum of the chosen lines: a partial payment is not supported.
 */
export async function recordPayment(
  actorId: string,
  raw: RecordPaymentInput,
): Promise<
  | { ok: true; data: { receiptNo: string; amountPoisha: number } }
  | { ok: false; error: string }
> {
  const parsed = recordPaymentSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That payment is not valid",
    };
  }

  const input = parsed.data;

  // A card payment never carries a transaction id, but a mobile payment
  // always does, because the sender quotes it.
  if (
    (input.method === "BKASH" || input.method === "NAGAD") &&
    !input.transactionId
  ) {
    return { ok: false, error: "Enter the transaction id of the payment" };
  }

  if (input.method !== "CARD" && input.cardLast4) {
    return { ok: false, error: "Only a card payment carries card digits" };
  }

  if (input.method === "CARD" && !input.cardLast4) {
    return { ok: false, error: "Enter the last four digits of the card" };
  }

  const feeIds = [...new Set(input.feeIds)];

  const fees = await prisma.fee.findMany({
    where: { id: { in: feeIds } },
    select: { id: true, amountPoisha: true, status: true, studentId: true },
  });

  if (fees.length !== feeIds.length) {
    return { ok: false, error: "One of those fees does not exist" };
  }

  if (fees.some((fee) => fee.status === "PAID")) {
    return { ok: false, error: "One of those fees has already been paid" };
  }

  const studentIds = new Set(fees.map((fee) => fee.studentId));

  if (studentIds.size > 1) {
    return {
      ok: false,
      error: "A payment settles the fees of one student at a time",
    };
  }

  const studentId = fees[0].studentId;
  const total = fees.reduce((sum, fee) => sum + fee.amountPoisha, 0);

  if (total !== input.amountPoisha) {
    return {
      ok: false,
      error: `The amount has to be ${formatTaka(total)}, the sum of the chosen fees`,
    };
  }

  if (input.transactionId) {
    const clash = await prisma.payment.findUnique({
      where: { transactionId: input.transactionId },
      select: { id: true },
    });

    if (clash) {
      return {
        ok: false,
        error: "That transaction id has already been recorded",
      };
    }
  }

  const paidAt = new Date(`${input.paidOn}T10:00:00.000Z`);
  const year = paidAt.getUTCFullYear();

  try {
    const receiptNo = await prisma.$transaction(async (tx) => {
      // The receipt number is taken from a counter row that is locked while
      // the payment is written, so two payments that run at the same time
      // cannot be given the same number.
      const counters = await tx.$queryRaw<{ last_number: number }[]>`
        INSERT INTO "receipt_counters" ("year", "last_number")
        VALUES (${year}, 1)
        ON CONFLICT ("year")
        DO UPDATE SET "last_number" = "receipt_counters"."last_number" + 1
        RETURNING "last_number"
      `;

      const number = `${RECEIPT_PREFIX}-${year}-${String(counters[0].last_number).padStart(4, "0")}`;

      const payment = await tx.payment.create({
        data: {
          studentId,
          amountPoisha: total,
          method: input.method,
          transactionId: input.transactionId ?? null,
          cardLast4: input.cardLast4 ?? null,
          status: "COMPLETED",
          paidAt,
          recordedById: actorId,
        },
        select: { id: true },
      });

      await tx.paymentItem.createMany({
        data: fees.map((fee) => ({
          paymentId: payment.id,
          feeId: fee.id,
          amountPoisha: fee.amountPoisha,
        })),
      });

      await tx.receipt.create({
        data: {
          receiptNo: number,
          paymentId: payment.id,
          studentId,
          amountPoisha: total,
          issuedAt: paidAt,
        },
      });

      // Only the lines that are still due are settled, so two payments that
      // run at the same time cannot settle the same line twice.
      const settled = await tx.fee.updateMany({
        where: { id: { in: feeIds }, status: { not: "PAID" } },
        data: { status: "PAID", paidAt },
      });

      if (settled.count !== fees.length) {
        throw new Error("ALREADY_PAID");
      }

      return number;
    });

    await writeAudit({
      actorId,
      action: "Payment recorded",
      entityType: "Payment",
      entityId: receiptNo,
      // The card digits are never written down: the audit log is a record of
      // what the school did, not a place to keep card data.
      metadata: {
        method: input.method,
        amountPoisha: total,
        feeCount: fees.length,
        transactionId: input.transactionId ?? null,
      },
    });

    await writeAudit({
      actorId,
      action: "Receipt created",
      entityType: "Receipt",
      entityId: receiptNo,
      metadata: { amountPoisha: total, feeCount: fees.length },
    });

    return { ok: true, data: { receiptNo, amountPoisha: total } };
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_PAID") {
      return { ok: false, error: "One of those fees has already been paid" };
    }

    return { ok: false, error: "The payment could not be recorded" };
  }
}

/**
 * Approves a payment a student submitted.
 *
 * The payment, its receipt and the new status of the fee lines are written in
 * one transaction, so a failure leaves the payment waiting rather than half
 * approved. Only a payment that is still waiting can be approved.
 */
export async function approvePayment(
  actorId: string,
  paymentId: string,
): Promise<
  | { ok: true; data: { receiptNo: string; amountPoisha: number } }
  | { ok: false; error: string }
> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      studentId: true,
      amountPoisha: true,
      status: true,
      createdAt: true,
      items: { select: { feeId: true, amountPoisha: true } },
    },
  });

  if (!payment) {
    return { ok: false, error: "That payment does not exist" };
  }

  if (payment.status !== "PENDING") {
    return { ok: false, error: "That payment has already been reviewed" };
  }

  if (payment.items.length === 0) {
    return { ok: false, error: "That payment does not settle any fees" };
  }

  // The payment was made when the student sent it, so the receipt carries
  // that day rather than the day the admin looked at it.
  const paidAt = payment.createdAt;
  const year = paidAt.getUTCFullYear();
  const feeIds = payment.items.map((item) => item.feeId);

  try {
    const receiptNo = await prisma.$transaction(async (tx) => {
      // The receipt number is taken from a counter row that is locked while
      // the receipt is written, so two payments that run at the same time
      // cannot be given the same number.
      const counters = await tx.$queryRaw<{ last_number: number }[]>`
        INSERT INTO "receipt_counters" ("year", "last_number")
        VALUES (${year}, 1)
        ON CONFLICT ("year")
        DO UPDATE SET "last_number" = "receipt_counters"."last_number" + 1
        RETURNING "last_number"
      `;

      const number = `${RECEIPT_PREFIX}-${year}-${String(counters[0].last_number).padStart(4, "0")}`;

      await tx.receipt.create({
        data: {
          receiptNo: number,
          paymentId: payment.id,
          studentId: payment.studentId,
          amountPoisha: payment.amountPoisha,
          issuedAt: paidAt,
        },
      });

      // Only the lines that are still due are settled, so a fee that was paid
      // in the meantime is never settled twice.
      const settled = await tx.fee.updateMany({
        where: { id: { in: feeIds }, status: { not: "PAID" } },
        data: { status: "PAID", paidAt },
      });

      if (settled.count !== feeIds.length) {
        throw new Error("ALREADY_PAID");
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          paidAt,
          reviewedById: actorId,
          reviewedAt: new Date(),
          reviewNote: null,
        },
      });

      return number;
    });

    await writeAudit({
      actorId,
      action: "Payment approved",
      entityType: "Payment",
      entityId: receiptNo,
      metadata: {
        paymentId: payment.id,
        amountPoisha: payment.amountPoisha,
        feeCount: feeIds.length,
      },
    });

    await writeAudit({
      actorId,
      action: "Receipt created",
      entityType: "Receipt",
      entityId: receiptNo,
      metadata: { amountPoisha: payment.amountPoisha, feeCount: feeIds.length },
    });

    return {
      ok: true,
      data: { receiptNo, amountPoisha: payment.amountPoisha },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_PAID") {
      return {
        ok: false,
        error: "One of those fees has already been paid",
      };
    }

    return { ok: false, error: "The payment could not be approved" };
  }
}

/**
 * Rejects a payment a student submitted.
 *
 * The reason is kept with the payment, so the student knows what to do next
 * and the admin can see why the payment was refused.
 */
export async function rejectPayment(
  actorId: string,
  paymentId: string,
  reason: string,
): Promise<{ ok: true; data: { id: string } } | { ok: false; error: string }> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true, amountPoisha: true },
  });

  if (!payment) {
    return { ok: false, error: "That payment does not exist" };
  }

  if (payment.status !== "PENDING") {
    return { ok: false, error: "That payment has already been reviewed" };
  }

  try {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        reviewedById: actorId,
        reviewedAt: new Date(),
        reviewNote: reason,
      },
    });
  } catch {
    return { ok: false, error: "The payment could not be rejected" };
  }

  await writeAudit({
    actorId,
    action: "Payment rejected",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { reason, amountPoisha: payment.amountPoisha },
  });

  return { ok: true, data: { id: payment.id } };
}

/**
 * The CSV of the payments that match the filters.
 *
 * A cell that starts with =, +, - or @ is prefixed with a quote, so a
 * spreadsheet never reads it as a formula.
 */
export async function exportFeesCsv(
  raw: Partial<ListPaymentsInput> = {},
): Promise<
  | { ok: true; data: { csv: string; fileName: string } }
  | { ok: false; error: string }
> {
  const parsed = listPaymentsSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, error: "Those filters are not valid" };
  }

  const { query, status } = parsed.data;

  // The export holds every matching line, so the list is read page by page
  // until every line has been read.
  const rows: AdminFeeRow[] = [];
  const pageSize = 100;

  let page = 0;

  for (;;) {
    const chunk = await listFees({ query, status, page, pageSize });

    rows.push(...chunk.rows);

    page += 1;

    // A page that is not full is the last one, so the export holds every line
    // that matches and not one of them twice.
    if (chunk.rows.length < pageSize) break;
  }

  return {
    ok: true,
    data: { csv: buildCsv(rows), fileName: "payments.csv" },
  };
}

/**
 * The header of the payments CSV.
 */
const CSV_HEADER = [
  "Student",
  "Student ID",
  "Class",
  "Invoice",
  "Fee",
  "Amount",
  "Status",
  "Method",
  "Due date",
  "Paid on",
  "Receipt",
];

/**
 * Turns the fee lines into the rows of a CSV.
 *
 * Every cell that could be read as a formula is prefixed with a quote.
 */
function buildCsv(rows: readonly AdminFeeRow[]): string {
  const lines = [CSV_HEADER.map(csvCell).join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.student,
        row.studentId,
        row.className,
        row.invoice,
        row.label,
        row.amount,
        row.status,
        row.method,
        row.dueOn,
        row.paidOn,
        row.receipt,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  return `${lines.join("\r\n")}\r\n`;
}

/**
 * Escapes one cell of a CSV.
 *
 * A cell that starts with =, +, - or @ is prefixed with a quote, so a
 * spreadsheet never reads it as a formula.
 */
export function csvCell(value: string): string {
  const text = value ?? "";

  const escaped =
    text.startsWith("=") ||
    text.startsWith("+") ||
    text.startsWith("-") ||
    text.startsWith("@")
      ? `'${text}`
      : text;

  if (
    escaped.includes(",") ||
    escaped.includes('"') ||
    escaped.includes("\n")
  ) {
    return `"${escaped.replace(/"/g, '""')}"`;
  }

  return escaped;
}
