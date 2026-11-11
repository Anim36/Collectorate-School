import { z } from "zod";

/**
 * The rules of the admin fees, audit log and dashboard screens.
 *
 * They live here so the client forms and the server actions hold the same
 * standard, and so every input is checked on the server before it reaches the
 * database.
 */

/** The payment methods an admin can record. */
export const PAYMENT_METHODS = [
  "CASH",
  "BKASH",
  "NAGAD",
  "CARD",
  "BANK_TRANSFER",
] as const;

/** The states a fee can sit in, as the filter offers them. */
export const FEE_STATUSES = ["PAID", "DUE", "OVERDUE"] as const;

/**
 * The kinds of change the audit log groups by.
 *
 * The list is closed, so the filter offers the same kinds on every screen.
 */
export const AUDIT_ACTION_TYPES = [
  "Account",
  "Result",
  "Attendance",
  "Fee",
  "Payment",
  "Notice",
  "Class",
  "Subject",
  "Gallery",
  "Routine",
  "Calendar",
  "File",
  "Other",
] as const;

/** The lines of a fee slot the admin can issue. */
export const FEE_LINES = ["tuition", "admission", "activities"] as const;

/** The largest fee amount a class may be charged, in poisha. */
export const MAX_FEE_POISHA = 10_000_000;

/**
 * The rule a fee amount has to follow.
 *
 * Money is an integer number of poisha, so a fraction is refused rather than
 * rounded.
 */
export const feeAmountSchema = z
  .number()
  .int("The amount has to be a whole number of taka")
  .positive("The amount has to be more than zero")
  .max(MAX_FEE_POISHA, "That amount is too large");

/** The rule a due date has to follow. */
export const dueDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
  .refine(
    (value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
    "Choose a valid date",
  );

/** The fee structure the admin edits. */
export const saveFeeStructureSchema = z.object({
  /** The fee structure row that is edited. */
  id: z.string().trim().min(1, "Choose a class"),
  /** The monthly tuition of the class, in poisha. */
  monthlyTuitionPoisha: feeAmountSchema,
  /** The admission fee of the class, in poisha. */
  admissionFeePoisha: feeAmountSchema,
  /** The activities fee of the class, in poisha. */
  activitiesPoisha: feeAmountSchema,
  /** The date the fees fall due. */
  dueDate: dueDateSchema,
});

/** The list query of the payments table. */
export const listPaymentsSchema = z.object({
  /** The free-text search over the student, the id and the receipt. */
  query: z.string().trim().max(120).optional(),
  /** The state the filter is set to. */
  status: z.union([z.enum(FEE_STATUSES), z.literal("ALL")]).default("ALL"),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(10),
});

/**
 * The rule a transaction id has to follow.
 *
 * The sender quotes it, so it is a short run of letters and digits.
 */
export const transactionIdSchema = z
  .string()
  .trim()
  .min(4, "Enter the transaction id")
  .max(40, "The transaction id is too long")
  .regex(/^[A-Za-z0-9-]+$/, "The transaction id holds letters, digits and dashes");

/** The payment the admin records by hand. */
export const recordPaymentSchema = z.object({
  /** The fee lines the payment settles. */
  feeIds: z.array(z.string().trim().min(1)).min(1, "Choose the fees to settle"),
  /** How the payment was made. */
  method: z.enum(PAYMENT_METHODS),
  /** The identifier the sender quoted. */
  transactionId: transactionIdSchema.optional(),
  /**
   * The last four digits of the card.
   *
   * The full card number and the security code are never taken, so there is
   * nothing to store beyond these four digits.
   */
  cardLast4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "The last four digits are four numbers")
    .optional(),
  /** The amount the admin records, in poisha. */
  amountPoisha: feeAmountSchema,
  /** The date the payment was received. */
  paidOn: dueDateSchema,
});

/** The fees the admin issues to the students of a class. */
export const issueFeesSchema = z.object({
  /**
   * The class the fees are issued for.
   *
   * An empty string issues them for every class that has a fee structure.
   */
  classId: z.string().trim().default(""),
  /** The billing slot, e.g. "2026-11". */
  period: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "Choose a month"),
  /** The lines of the slot that are issued. */
  lines: z
    .array(z.enum(FEE_LINES))
    .min(1, "Choose at least one fee to issue"),
});

/**
 * The reason a payment was rejected.
 *
 * The admin has to say why, so the student knows what to do next.
 */
export const rejectPaymentSchema = z.object({
  /** The payment that is rejected. */
  paymentId: z.string().trim().min(1, "Choose a payment"),
  /** Why the payment was rejected. */
  reason: z
    .string()
    .trim()
    .min(3, "Say why the payment was rejected")
    .max(200, "That reason is too long"),
});

/** The list query of the audit log. */
export const listAuditLogSchema = z.object({
  /** The free-text search over the actor, the action and the record. */
  query: z.string().trim().max(120).optional(),
  /** The kind of change the filter is set to. */
  actionType: z
    .union([z.enum(AUDIT_ACTION_TYPES), z.literal("ALL")])
    .default("ALL"),
  /** The first day of the window. */
  from: dueDateSchema.optional(),
  /** The last day of the window. */
  to: dueDateSchema.optional(),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(10),
});

/** The validated fee structure the admin edits. */
export type SaveFeeStructureInput = z.infer<typeof saveFeeStructureSchema>;

/** The validated list query of the payments table. */
export type ListPaymentsInput = z.infer<typeof listPaymentsSchema>;

/** The validated payment the admin records. */
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

/** The validated fee issue. */
export type IssueFeesInput = z.infer<typeof issueFeesSchema>;

/** The validated rejection of a payment. */
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;

/** The validated list query of the audit log. */
export type ListAuditLogInput = z.infer<typeof listAuditLogSchema>;
