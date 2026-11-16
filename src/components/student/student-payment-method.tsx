"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalOption } from "@/components/ui/modal-option";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatPoisha } from "@/lib/money";
import { submitStudentPaymentAction } from "@/app/student/actions";
import type { StudentPayableFee } from "@/types/student";

/**
 * A Bangladeshi mobile number: eleven digits that start with 01.
 */
const bdMobile = z
  .string()
  .trim()
  .regex(/^01[3-9]\d{8}$/, "Enter an 11-digit number starting with 01.");

/**
 * The transaction identifier a mobile wallet shows after a payment.
 */
const transactionId = z
  .string()
  .trim()
  .min(4, "The transaction ID has at least 4 characters.")
  .regex(/^[A-Za-z0-9]+$/, "The transaction ID holds letters and digits only.");

/**
 * The last four digits of a card.
 *
 * The school never takes the card number and never the security code: without
 * a payment gateway there is nothing to charge the card with, so the only
 * thing the office needs is the last four digits, which identify the card on
 * the student's receipt.
 */
const cardLast4 = z
  .string()
  .trim()
  .regex(/^\d{4}$/, "The last four digits are four numbers.");

const paymentSchema = z
  .object({
    method: z.enum(["BKASH", "NAGAD", "CARD"]),
    mobile: z.string().optional(),
    transactionId: z.string().optional(),
    cardLast4: z.string().optional(),
  })
  .superRefine((values, context) => {
    // Only the fields of the chosen method are checked.
    if (values.method === "CARD") {
      if (!values.cardLast4) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cardLast4"],
          message: "Enter the last four digits of the card.",
        });
      } else {
        const parsed = cardLast4.safeParse(values.cardLast4);
        if (!parsed.success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["cardLast4"],
            message:
              parsed.error.issues[0]?.message ??
              "Enter the last four digits of the card.",
          });
        }
      }

      return;
    }

    if (!values.mobile) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mobile"],
        message: "Enter the number you paid from.",
      });
    } else {
      const parsed = bdMobile.safeParse(values.mobile);
      if (!parsed.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mobile"],
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
      const parsed = transactionId.safeParse(values.transactionId);
      if (!parsed.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["transactionId"],
          message: parsed.error.issues[0]?.message ?? "Enter a valid transaction ID.",
        });
      }
    }
  });

type PaymentValues = z.infer<typeof paymentSchema>;

/**
 * The payment methods the page offers, with the label each one is shown
 * under. The ids are the ones the database holds.
 */
const PAYMENT_METHODS = [
  { id: "BKASH", label: "bKash" },
  { id: "NAGAD", label: "Nagad" },
  { id: "CARD", label: "Debit / Credit Card" },
] as const;

/** The method the page opens on. */
const INITIAL_METHOD = "BKASH";

export interface StudentPaymentMethodProps {
  /** The method the query string points at. */
  methodId: string | null;
  /** The fee lines the payment settles. */
  items: readonly StudentPayableFee[];
  className?: string;
}

/**
 * The payment method page.
 *
 * Figma "Student / Payment method" (2:5755 desktop, 2:5872 tablet, 2:5971
 * mobile and the matching dark frames) draws the payment method modal over the
 * fee page, so this is where the modal hands over: it reads the fee and the
 * method from the query string, asks for the details the method needs and
 * takes the reader to the receipt.
 *
 * The method selector reuses the modal options of Figma "Payment method modal"
 * (2:5861–2:5865) and keeps their rhythm — three 73px options 16px apart, the
 * note 16px below the last one, the 191×47 action and the 104×49 cancel.
 *
 * The payment is written to the database as a request that waits for the
 * admin to approve it, so the school sees it in the queue. Only the last
 * four digits of a card are kept — never the card number itself, and never
 * the security code.
 *
 * The amount is never sent by the browser: the server adds up the fee lines
 * the payment settles, so a client cannot name its own price.
 */
export function StudentPaymentMethod({
  methodId,
  items,
  className,
}: StudentPaymentMethodProps) {
  const router = useRouter();
  const { toast } = useToast();

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Payment method");

  const initialMethod = PAYMENT_METHODS.some((entry) => entry.id === methodId)
    ? (methodId as PaymentValues["method"])
    : INITIAL_METHOD;

  const [paying, setPaying] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      method: initialMethod,
      mobile: "",
      transactionId: "",
      cardLast4: "",
    },
    mode: "onChange",
  });

  const method = watch("method");

  // A different method needs different fields, so the old values are cleared.
  const selectMethod = (next: PaymentValues["method"]) => {
    reset({
      method: next,
      mobile: "",
      transactionId: "",
      cardLast4: "",
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    setPaying(true);

    const result = await submitStudentPaymentAction({
      feeIds: items.map((item) => item.id),
      method: values.method,
      // The number the money was sent from, so the office can look the
      // payment up when it verifies it.
      senderMobile:
        values.method === "CARD" ? undefined : values.mobile,
      transactionId:
        values.method === "CARD" ? undefined : values.transactionId,
      // Only the last four digits of a card ever leave the browser.
      cardLast4: values.method === "CARD" ? values.cardLast4 : undefined,
    });

    setPaying(false);

    if (!result.ok) {
      toast({
        title: "Payment not submitted",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    // The payment waits for the school to confirm it: without a payment
    // gateway the server cannot know that the money really moved, so the
    // receipt is only written when an admin approves the payment.
    toast({
      title: "Payment submitted",
      description: "Payment submitted. The school will confirm it shortly.",
    });

    router.push("/student/fees");
  });

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8",
        className,
      )}
    >
      <StudentPageHeader
        title="Payment method"
        description="Your school life, clearly organised."
      />

      {/* The order summary. */}
      <section
        data-payment="summary"
        className="flex w-full flex-col items-start gap-4 rounded-[12px] border border-border bg-surface p-6"
      >
        <h3 className="text-title font-semibold leading-[1.45] text-ink">
          Order summary
        </h3>

        <dl className="flex w-full flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex w-full flex-wrap items-baseline justify-between gap-3"
            >
              <dt className="text-body-md leading-[1.45] text-muted">
                {item.item}
              </dt>
              <dd className="flex w-full flex-wrap items-baseline justify-between gap-4 sm:w-auto sm:gap-6">
                <span className="text-body-md leading-[1.45] text-muted">
                  {item.dueDate}
                </span>
                <span className="text-body-md font-medium leading-[1.45] text-ink">
                  {item.amount}
                </span>
              </dd>
            </div>
          ))}

          <div className="flex w-full flex-wrap items-baseline justify-between gap-4 border-t border-border pt-3">
            <dt className="text-body font-semibold leading-[1.45] text-ink">
              Total
            </dt>
            <dd className="text-title font-semibold leading-[1.45] text-ink">
              {formatPoisha(
                items.reduce((sum, item) => sum + item.amountPoisha, 0),
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* The method and the fields it needs. */}
      <section
        data-payment="form"
        className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6"
      >
        <div
          role="radiogroup"
          aria-label="Payment method"
          className="flex w-full flex-col items-start gap-4"
        >
          <h3 className="text-title font-semibold leading-[1.45] text-ink">
            Choose a payment method
          </h3>

          <div className="flex w-full flex-col gap-4">
            {PAYMENT_METHODS.map((entry) => (
              <ModalOption
                key={entry.id}
                label={entry.label}
                selected={method === entry.id}
                onSelect={() => selectMethod(entry.id)}
              />
            ))}
          </div>
        </div>

        <p className="mt-4 text-caption leading-[1.45] text-muted">
          Your payment is sent to the school office. It is confirmed there, and
          the receipt appears once the school has approved it.
        </p>

        <form
          noValidate
          onSubmit={onSubmit}
          className="mt-6 flex w-full flex-col items-start gap-6"
        >
          {method === "CARD" ? (
            <div className="flex w-full flex-col items-start gap-4">
              <PaymentField
                label="Last four digits of the card"
                error={errors.cardLast4?.message}
              >
                <Input
                  {...register("cardLast4")}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="4242"
                  aria-invalid={errors.cardLast4 ? true : undefined}
                />
              </PaymentField>

              <p className="text-caption leading-[1.45] text-muted">
                The school only needs the last four digits, so it can find the
                card on your receipt. Your card number is never asked for and
                never kept.
              </p>
            </div>
          ) : (
            <div className="flex w-full flex-col items-start gap-4">
              <PaymentField
                label="Mobile number"
                error={errors.mobile?.message}
              >
                <Input
                  {...register("mobile")}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01712345678"
                  aria-invalid={errors.mobile ? true : undefined}
                />
              </PaymentField>

              <PaymentField
                label="Transaction ID"
                error={errors.transactionId?.message}
              >
                <Input
                  {...register("transactionId")}
                  placeholder="9F7K2M4XQ1"
                  aria-invalid={errors.transactionId ? true : undefined}
                />
              </PaymentField>
            </div>
          )}

          {/* The action and the cancel are 16px apart, as Figma draws them. */}
          <div className="flex w-full flex-col items-start gap-4">
            <Button
              type="submit"
              disabled={paying}
              data-payment="pay"
              className="h-[47px] w-[191px] shrink-0 px-0"
            >
              {paying ? "Submitting…" : "Pay"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              data-payment="cancel"
              className="h-[49px] w-[104px] shrink-0 px-0"
              onClick={() => router.push("/student/fees")}
            >
              Cancel
            </Button>
          </div>

          <p className="text-caption leading-[1.45] text-muted">
            Your payment is sent to the school office for verification. Only the
            last four digits of a card are kept.
          </p>
        </form>
      </section>

      <Link
        href="/student/fees"
        className="text-body-md text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Back to fees
      </Link>
    </div>
  );
}

interface PaymentFieldProps {
  /** Visible label above the control. */
  label: string;
  /** Validation message shown under the control. */
  error?: string;
  /** Classes applied to the wrapping block. */
  className?: string;
  /** The control itself. */
  children: React.ReactNode;
}

/**
 * A labelled control with its error message.
 * Figma "Input" (2:128–2:130): surface background, 1px border, 12px radius
 * and a 13px muted label above the control.
 *
 * The label names the control it sits above, so the two are tied together
 * with an id and a `for`.
 */
function PaymentField({
  label,
  error,
  className,
  children,
}: PaymentFieldProps) {
  const controlId = React.useId();
  const errorId = error ? `${controlId}-error` : undefined;

  // The control carries the id, so the label can point at it.
  const control = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: controlId,
        "aria-describedby": errorId,
      })
    : children;

  return (
    <div className={cn("flex w-full flex-col items-start gap-2", className)}>
      <label
        htmlFor={controlId}
        className="text-caption font-medium leading-[1.45] text-muted"
      >
        {label}
      </label>
      {control}
      {error ? (
        <p
          id={errorId}
          className="text-caption leading-[1.45] text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
