import { z } from "zod";

import type { ServiceResult } from "@/server/services/admin-schemas";

/**
 * The rules of the student portal.
 *
 * They live here so the client forms and the server actions hold the same
 * standard, and so every input is checked on the server before it reaches
 * the database.
 *
 * The amount of a payment is never one of these fields: the server works the
 * amount out from the fee lines the student settles, so a client cannot name
 * its own price.
 */

/** The payment methods a student can pay with. */
export const STUDENT_PAYMENT_METHODS = ["BKASH", "NAGAD", "CARD"] as const;

/**
 * A Bangladeshi mobile number: eleven digits that start with 01.
 */
export const bdMobileSchema = z
  .string()
  .trim()
  .regex(/^01[3-9]\d{8}$/, "Enter an 11-digit number starting with 01.");

/**
 * The transaction identifier a mobile wallet shows after a payment.
 */
export const transactionIdSchema = z
  .string()
  .trim()
  .min(4, "The transaction ID has at least 4 characters.")
  .max(40, "The transaction ID is too long.")
  .regex(/^[A-Za-z0-9-]+$/, "The transaction ID holds letters, digits and dashes.");

/**
 * The last four digits of a card.
 *
 * The full card number and the security code are never taken, so there is
 * nothing to store beyond these four digits.
 */
export const cardLast4Schema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, "The last four digits are four numbers.");

/**
 * The payment a student submits.
 *
 * The amount is not part of it: the server adds up the fee lines it settles.
 */
export const studentPaymentSchema = z
  .object({
    /** The fee lines the payment settles. */
    feeIds: z.array(z.string().trim().min(1)).min(1, "Choose a fee to pay"),
    /** How the payment was made. */
    method: z.enum(STUDENT_PAYMENT_METHODS),
    /**
     * The number the money was sent from.
     *
     * A mobile wallet carries it, because the office asks for it when it
     * looks the payment up. A card never carries it.
     */
    senderMobile: z.string().trim().optional(),
    /** The identifier the sender quoted. */
    transactionId: z.string().trim().optional(),
    /** The last four digits of the card, when a card paid. */
    cardLast4: z.string().trim().optional(),
  })
  .superRefine((values, context) => {
    if (values.method === "CARD") {
      // A card is checked against its own fields only. The number the money
      // was sent from and the transaction id belong to a wallet.
      if (values.senderMobile || values.transactionId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["method"],
          message: "A card payment carries no transaction ID.",
        });
      }

      if (!values.cardLast4) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cardLast4"],
          message: "Enter the last four digits of the card.",
        });
      } else {
        const parsed = cardLast4Schema.safeParse(values.cardLast4);

        if (!parsed.success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["cardLast4"],
            message: parsed.error.issues[0]?.message ?? "Enter four numbers.",
          });
        }
      }

      return;
    }

    if (!values.senderMobile) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["senderMobile"],
        message: "Enter the number you paid from.",
      });
    } else {
      const parsed = bdMobileSchema.safeParse(values.senderMobile);

      if (!parsed.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["senderMobile"],
          message: parsed.error.issues[0]?.message ?? "Enter a valid number.",
        });
      }
    }

    if (!values.transactionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transactionId"],
        message: "Enter the transaction ID.",
      });
    } else {
      const parsed = transactionIdSchema.safeParse(values.transactionId);

      if (!parsed.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["transactionId"],
          message: parsed.error.issues[0]?.message ?? "Enter a valid transaction ID.",
        });
      }
    }
  });

/** The validated payment a student submits. */
export type StudentPaymentInput = z.infer<typeof studentPaymentSchema>;

/**
 * The month of the attendance calendar.
 */
export const attendanceMonthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a valid month");

/**
 * The filters of the student notice board.
 *
 * The board reads the published notices of the school, so the filters are the
 * ones the public board uses: a category, a date range and a free-text search.
 *
 * The type of the validated filters lives in `@/types/student`, so the page,
 * the action and the service all speak about the same shape.
 */
export const studentNoticeFilterSchema = z.object({
  /** The free-text search over the headline and the body. */
  query: z.string().trim().max(120).optional(),
  /** The category the filter is set to. */
  category: z.string().trim().max(60).optional(),
  /** The first day of the window. */
  from: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
    .optional(),
  /** The last day of the window. */
  to: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
    .optional(),
  /** The zero-based index of the visible page. */
  page: z.number().int().min(0).default(0),
  /** The number of notices on a page. */
  pageSize: z.number().int().min(1).max(50).default(3),
});

/** The validated filters of the student notice board. */
export type { StudentNoticeFilterInput } from "@/types/student";

/**
 * The answer every student service call gives.
 *
 * A refusal carries the machine readable reason as well as the message, so a
 * check can tell an empty file from a file of an unknown type.
 */
export type StudentResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; reason?: StudentRejection };

/** The reasons a student service refuses a request for. */
export type StudentRejection =
  | "EMPTY"
  | "TOO_LARGE"
  | "TOO_MANY"
  | "UNKNOWN_TYPE"
  | "INVALID";

export type { ServiceResult };
