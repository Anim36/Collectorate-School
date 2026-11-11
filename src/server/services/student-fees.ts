import { prisma } from "@/server/db";
import { formatPoisha } from "@/lib/money";
import { writeAudit } from "@/server/services/audit";
import { currentStudent } from "@/server/services/student-identity";
import {
  studentPaymentSchema,
  type StudentPaymentInput,
} from "@/server/services/student-schemas";
import type {
  StudentFeeRow,
  StudentFeeStatus,
  StudentFeeSummary,
  StudentFeesData,
  StudentPaymentRow,
  StudentReceiptData,
} from "@/types/student";

/**
 * The fees and the payments of the signed-in student.
 *
 * Money is an integer number of poisha everywhere, so no amount goes
 * through a float. The amount of a payment is worked out here, on the
 * server, from the fee lines the payment settles — a client never names its
 * own price.
 */

/** The state a fee line sits in, as the student sees it. */
function statusOf(
  status: string,
  dueDate: Date,
  today: Date,
  pending: boolean,
): StudentFeeStatus {
  if (status === "PAID") return "Paid";
  if (pending) return "Pending verification";
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
 * A date the way the tables show it, e.g. "10 Nov 2026".
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * The name a payment method is shown under.
 */
function methodLabel(method: string): string {
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
 * The fees and the payments of the signed-in student.
 *
 * The fee lines are read for the student alone, and the payment history is
 * the student's own payments, so a student never sees a fee or a payment
 * that is not theirs.
 */
export async function getStudentFees(): Promise<StudentFeesData | null> {
  const student = await currentStudent();

  if (!student) return null;

  const today = startOfToday();

  const [feeRows, paymentRows] = await Promise.all([
    prisma.fee.findMany({
      where: { studentId: student.id },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        label: true,
        amountPoisha: true,
        dueDate: true,
        status: true,
        payments: {
          where: { payment: { status: "PENDING" } },
          select: { paymentId: true },
          take: 1,
        },
      },
    }),
    prisma.payment.findMany({
      where: { studentId: student.id },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        amountPoisha: true,
        method: true,
        status: true,
        paidAt: true,
        createdAt: true,
        receipt: { select: { id: true, receiptNo: true } },
      },
    }),
  ]);

  const fees: StudentFeeRow[] = feeRows.map((fee) => {
    const pending = fee.payments.length > 0;
    const status = statusOf(fee.status, fee.dueDate, today, pending);

    return {
      id: fee.id,
      item: fee.label,
      dueDate: formatDate(fee.dueDate),
      amount: formatPoisha(fee.amountPoisha),
      amountPoisha: fee.amountPoisha,
      status,
      // A line that is paid or that already waits for verification cannot be
      // paid a second time.
      payable: fee.status !== "PAID" && !pending,
    };
  });

  const outstanding = fees.filter((fee) => fee.payable);
  const totalDuePoisha = outstanding.reduce(
    (sum, fee) => sum + fee.amountPoisha,
    0,
  );

  const paidThisYear = paymentRows
    .filter((payment) => payment.status === "COMPLETED")
    .reduce((sum, payment) => sum + payment.amountPoisha, 0);

  const completedCount = paymentRows.filter(
    (payment) => payment.status === "COMPLETED",
  ).length;

  const next = outstanding[0] ?? null;

  const summary: StudentFeeSummary = {
    totalDue: formatPoisha(totalDuePoisha),
    totalDuePoisha,
    dueHint:
      outstanding.length === 0
        ? "All dues cleared"
        : `Due ${next ? formatDate(new Date(next.dueDate)) : ""}`,
    paidThisYear: formatPoisha(paidThisYear),
    paidHint: `${completedCount} completed payments`,
    nextPayment: next ? next.dueDate.slice(0, 6) : "—",
    nextHint: next ? next.item : "Nothing due",
    status: outstanding.length === 0 ? "Paid" : "Due",
    statusHint: "No late fee applied",
  };

  const payments: StudentPaymentRow[] = paymentRows.map((payment) => ({
    id: payment.id,
    receiptId: payment.receipt?.id ?? "",
    receipt: payment.receipt?.receiptNo ?? "",
    date: formatDate(payment.paidAt ?? payment.createdAt),
    method: methodLabel(payment.method),
    amount: formatPoisha(payment.amountPoisha),
    amountPoisha: payment.amountPoisha,
    status:
      payment.status === "PENDING"
        ? "Pending verification"
        : payment.status === "COMPLETED"
          ? "Paid"
          : "Rejected",
  }));

  return { summary, fees, payments };
}

/**
 * The receipt of one of the student's own payments.
 *
 * Only a payment that was approved — and therefore carries a receipt — can
 * be read, and the receipt is looked up with the student in the same query,
 * so a receipt of another student is reported the same way as one that does
 * not exist.
 */
export async function getStudentReceipt(
  receiptId: string,
): Promise<StudentReceiptData | null> {
  const student = await currentStudent();

  if (!student) return null;

  const receipt = await prisma.receipt.findFirst({
    where: {
      id: receiptId,
      studentId: student.id,
      payment: { status: "COMPLETED" },
    },
    select: {
      id: true,
      receiptNo: true,
      amountPoisha: true,
      issuedAt: true,
      payment: {
        select: {
          method: true,
          transactionId: true,
          cardLast4: true,
          items: {
            select: {
              amountPoisha: true,
              fee: { select: { label: true, dueDate: true } },
            },
          },
        },
      },
      student: {
        select: {
          name: true,
          studentId: true,
          class: { select: { name: true } },
        },
      },
    },
  });

  if (!receipt) return null;

  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNo,
    paidOn: formatDate(receipt.issuedAt),
    method: methodLabel(receipt.payment.method),
    transactionId: receipt.payment.transactionId ?? "",
    cardLast4: receipt.payment.cardLast4 ?? "",
    items: receipt.payment.items.map((item) => ({
      item: item.fee.label,
      dueDate: formatDate(item.fee.dueDate),
      amount: formatPoisha(item.amountPoisha),
    })),
    total: Math.round(receipt.amountPoisha / 100),
    student: {
      name: receipt.student.name,
      studentId: receipt.student.studentId,
      className: receipt.student.class.name,
    },
  };
}

/**
 * The fee lines the student may pay.
 *
 * The lines are read for the student alone, so a line of another student
 * can never be settled through this call.
 */
export async function listPayableFees(): Promise<
  {
    id: string;
    item: string;
    dueDate: string;
    amount: string;
    amountPoisha: number;
  }[]
> {
  const student = await currentStudent();

  if (!student) return [];

  const rows = await prisma.fee.findMany({
    where: { studentId: student.id, status: { not: "PAID" } },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    select: {
      id: true,
      label: true,
      amountPoisha: true,
      dueDate: true,
      payments: {
        where: { payment: { status: "PENDING" } },
        select: { paymentId: true },
        take: 1,
      },
    },
  });

  return rows
    .filter((row) => row.payments.length === 0)
    .map((row) => ({
      id: row.id,
      item: row.label,
      dueDate: formatDate(row.dueDate),
      amount: formatPoisha(row.amountPoisha),
      amountPoisha: row.amountPoisha,
    }));
}

/**
 * How many payment requests a student may send in a window.
 *
 * The window is counted from the rows the database already holds, so a
 * student cannot get past the limit by reloading the page.
 */
const PAYMENT_WINDOW_MINUTES = 10;
const PAYMENT_WINDOW_LIMIT = 5;

/**
 * Submits a payment request.
 *
 * The request is written as a `PENDING` payment with its fee lines. It does
 * **not** mark a fee as paid: without a payment gateway the server cannot
 * know that the money really moved, so only an admin approving the payment
 * turns it into a paid fee and a receipt.
 *
 * The amount is worked out from the fee lines here, so a client cannot name
 * its own price, and the whole write happens in one transaction, so a
 * failure leaves nothing behind.
 */
export async function submitStudentPayment(
  raw: StudentPaymentInput,
): Promise<
  { ok: true; data: { paymentId: string; amountPoisha: number } }
  | { ok: false; error: string }
> {
  const student = await currentStudent();

  if (!student) {
    return { ok: false, error: "You are not allowed to do that" };
  }

  const parsed = studentPaymentSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That payment is not valid",
    };
  }

  const input = parsed.data;

  // The rate limit is checked before anything is read, so a flood of
  // submissions costs one count.
  const since = new Date(Date.now() - PAYMENT_WINDOW_MINUTES * 60 * 1000);

  const recent = await prisma.payment.count({
    where: { studentId: student.id, createdAt: { gte: since } },
  });

  if (recent >= PAYMENT_WINDOW_LIMIT) {
    return {
      ok: false,
      error: "Too many payment requests. Please wait a few minutes and try again.",
    };
  }

  const feeIds = [...new Set(input.feeIds)];

  // The lines are read with the student in the same query, so a line of
  // another student is simply not there.
  const fees = await prisma.fee.findMany({
    where: { id: { in: feeIds }, studentId: student.id },
    select: {
      id: true,
      label: true,
      amountPoisha: true,
      status: true,
      payments: {
        where: { payment: { status: "PENDING" } },
        select: { paymentId: true },
        take: 1,
      },
    },
  });

  if (fees.length !== feeIds.length) {
    return { ok: false, error: "One of those fees does not exist" };
  }

  if (fees.some((fee) => fee.status === "PAID")) {
    return { ok: false, error: "One of those fees has already been paid" };
  }

  if (fees.some((fee) => fee.payments.length > 0)) {
    return {
      ok: false,
      error: "One of those fees is already waiting for verification",
    };
  }

  const total = fees.reduce((sum, fee) => sum + fee.amountPoisha, 0);

  if (input.transactionId) {
    const clash = await prisma.payment.findUnique({
      where: { transactionId: input.transactionId },
      select: { id: true },
    });

    if (clash) {
      return {
        ok: false,
        error: "That transaction ID has already been recorded",
      };
    }
  }

  try {
    const paymentId = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          studentId: student.id,
          // The amount is the sum of the lines the server picked, never a
          // number the browser sent.
          amountPoisha: total,
          method: input.method,
          transactionId: input.transactionId ?? null,
          senderMobile:
            input.method === "CARD" ? null : (input.senderMobile ?? null),
          cardLast4: input.method === "CARD" ? (input.cardLast4 ?? null) : null,
          // The payment waits: only an admin approving it turns it into a
          // paid fee and a receipt.
          status: "PENDING",
          recordedById: student.userId,
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

      return payment.id;
    });

    await writeAudit({
      actorId: student.userId,
      action: "Payment submitted",
      entityType: "Payment",
      entityId: paymentId,
      // The card digits are never written down: the audit log is a record of
      // what the school did, not a place to keep card data.
      metadata: {
        method: input.method,
        amountPoisha: total,
        feeCount: fees.length,
        transactionId: input.transactionId ?? null,
      },
    });

    return { ok: true, data: { paymentId, amountPoisha: total } };
  } catch {
    return { ok: false, error: "The payment could not be submitted" };
  }
}
