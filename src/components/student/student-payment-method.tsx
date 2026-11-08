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
import { cn } from "@/lib/utils";
import {
  formatTaka,
  paymentMethods,
  recordPayment,
  resolveFeeItems,
} from "@/data/student";

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
 * A card number: 13 to 19 digits, with the spaces a reader types in.
 */
const cardNumber = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ""))
  .refine((value) => /^\d{13,19}$/.test(value), "Enter a valid card number.");

/**
 * An expiry date, written as MM/YY.
 */
const cardExpiry = z
  .string()
  .trim()
  .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Write the expiry as MM/YY.")
  .refine((value) => {
    const [month, year] = value.split("/").map(Number);
    if (!month || year === undefined) return false;

    // The card is valid through the last day of its expiry month.
    return new Date(2000 + year, month, 1).getTime() > Date.now();
  }, "This card has expired.");

/** A three-digit security code. */
const cardCvc = z
  .string()
  .trim()
  .regex(/^\d{3}$/, "The security code has 3 digits.");

const paymentSchema = z
  .object({
    method: z.enum(["bkash", "nagad", "card"]),
    mobile: z.string().optional(),
    transactionId: z.string().optional(),
    cardNumber: z.string().optional(),
    cardName: z.string().optional(),
    cardExpiry: z.string().optional(),
    cardCvc: z.string().optional(),
  })
  .superRefine((values, context) => {
    // Only the fields of the chosen method are checked.
    if (values.method === "card") {
      if (!values.cardNumber) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cardNumber"],
          message: "Enter the card number.",
        });
      } else {
        const parsed = cardNumber.safeParse(values.cardNumber);
        if (!parsed.success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["cardNumber"],
            message: parsed.error.issues[0]?.message ?? "Enter a valid card number.",
          });
        }
      }

      if (!values.cardName || values.cardName.trim().length < 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cardName"],
          message: "Write the name printed on the card.",
        });
      }

      if (!values.cardExpiry) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cardExpiry"],
          message: "Enter the expiry date.",
        });
      } else {
        const parsed = cardExpiry.safeParse(values.cardExpiry);
        if (!parsed.success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["cardExpiry"],
            message: parsed.error.issues[0]?.message ?? "Enter a valid expiry.",
          });
        }
      }

      if (!values.cardCvc) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cardCvc"],
          message: "Enter the security code.",
        });
      } else {
        const parsed = cardCvc.safeParse(values.cardCvc);
        if (!parsed.success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["cardCvc"],
            message: parsed.error.issues[0]?.message ?? "Enter a valid code.",
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

/** How long the mock payment takes before it resolves. */
const PAYMENT_DURATION = 1500;

export interface StudentPaymentMethodProps {
  /** The fee the query string points at. */
  feeId: string | null;
  /** The method the query string points at. */
  methodId: string | null;
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
 * No money moves. The payment is simulated, and the mock store keeps only the
 * last four digits of a card — never the card number itself.
 */
export function StudentPaymentMethod({
  feeId,
  methodId,
  className,
}: StudentPaymentMethodProps) {
  const router = useRouter();

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Payment method");

  const items = resolveFeeItems(feeId);
  const total = items.reduce((sum, item) => sum + item.value, 0);

  const initialMethod = paymentMethods.some((entry) => entry.id === methodId)
    ? (methodId as PaymentValues["method"])
    : "bkash";

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
      cardNumber: "",
      cardName: "",
      cardExpiry: "",
      cardCvc: "",
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
      cardNumber: "",
      cardName: "",
      cardExpiry: "",
      cardCvc: "",
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    setPaying(true);

    await new Promise((resolve) => setTimeout(resolve, PAYMENT_DURATION));

    const label =
      paymentMethods.find((entry) => entry.id === values.method)?.label ?? "bKash";

    // Only the last four digits of a card are kept.
    const cardLast4 =
      values.method === "card" && values.cardNumber
        ? values.cardNumber.replace(/\s+/g, "").slice(-4)
        : "";

    const receipt = recordPayment({
      items,
      method: label,
      transactionId: values.transactionId ?? "",
      cardLast4,
    });

    setPaying(false);
    router.push(`/student/fees/receipt/${receipt.id}`);
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
              {formatTaka(total)}
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
            {paymentMethods.map((entry) => (
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
          You’ll continue to your payment provider to authorise the transaction.
        </p>

        <form
          noValidate
          onSubmit={onSubmit}
          className="mt-6 flex w-full flex-col items-start gap-6"
        >
          {method === "card" ? (
            <div className="flex w-full flex-col items-start gap-4">
              <PaymentField
                label="Card number"
                error={errors.cardNumber?.message}
              >
                <Input
                  {...register("cardNumber")}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                  aria-invalid={errors.cardNumber ? true : undefined}
                />
              </PaymentField>

              <PaymentField
                label="Name on card"
                error={errors.cardName?.message}
              >
                <Input
                  {...register("cardName")}
                  autoComplete="cc-name"
                  placeholder="Arif Hasan"
                  aria-invalid={errors.cardName ? true : undefined}
                />
              </PaymentField>

              <div className="flex w-full flex-col items-start gap-4 sm:flex-row">
                <PaymentField
                  label="Expiry"
                  error={errors.cardExpiry?.message}
                  className="w-full sm:w-1/2"
                >
                  <Input
                    {...register("cardExpiry")}
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    aria-invalid={errors.cardExpiry ? true : undefined}
                  />
                </PaymentField>

                <PaymentField
                  label="CVC"
                  error={errors.cardCvc?.message}
                  className="w-full sm:w-1/2"
                >
                  <Input
                    {...register("cardCvc")}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    aria-invalid={errors.cardCvc ? true : undefined}
                  />
                </PaymentField>
              </div>
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
              {paying ? "Processing…" : "Pay"}
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
            This is a demo. No money is charged and no card number is stored.
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
