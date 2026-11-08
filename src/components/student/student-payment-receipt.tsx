"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StudentFeesOverview } from "@/components/student/student-fees-overview";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { cn } from "@/lib/utils";
import { formatTaka, receiptStudent } from "@/data/student";

export interface StudentPaymentReceiptProps {
  /** The receipt number, as it appears in the route. */
  receiptId: string;
  /** The receipt number, as it appears on the receipt. */
  receiptNumber: string;
  /** Date the payment was made. */
  paidOn: string;
  /** How the payment was made. */
  method: string;
  /** Identifier of the sender's transaction. */
  transactionId: string;
  /** Last four digits of the card, when a card paid. */
  cardLast4: string;
  /** The items the receipt settles. */
  items: readonly {
    /** What the fee is for. */
    item: string;
    /** Date the fee fell due. */
    dueDate: string;
    /** Amount paid, e.g. "৳ 1,500". */
    amount: string;
  }[];
  /** Total paid, in taka. */
  total: number;
  className?: string;
}

/**
 * The payment receipt page.
 *
 * Figma "Student / Payment receipt" (2:6060 desktop, 2:6169 tablet, 2:6260
 * mobile and the matching dark frames) draws the fee blocks with the receipt
 * card below them: the metric row, the "Due fees" table, the "Payment
 * history" table, the receipt action and then the receipt card.
 *
 * The card follows Figma "Payment receipt" (2:6163 desktop, 2:6233 tablet,
 * 2:6314 mobile):
 *
 * - A 35px "✓ Payment successful" heading 25px from the card edge.
 * - The amount 76px down, on a 58px line.
 * - The receipt details 150px down, on a 138px band of three lines.
 * - The "Download receipt" action 304px down, on a 47px line.
 *
 * The card therefore measures 376px: 25px of padding, 16px between every
 * block and 25px below the action.
 *
 * The receipt prints on A4: the print stylesheet hides the shell, the
 * navigation and the actions, so only the receipt itself reaches the paper.
 */
export function StudentPaymentReceipt({
  receiptId,
  receiptNumber,
  paidOn,
  method,
  transactionId,
  cardLast4,
  items,
  total,
  className,
}: StudentPaymentReceiptProps) {
  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Payment receipt");

  const student = receiptStudent();

  // The download uses the print flow, so the file is the printed receipt.
  const print = () => window.print();

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8",
        className,
      )}
    >
      <div className="contents" data-receipt="screen">
        <StudentPageHeader
          title="Payment receipt"
          description="Your school life, clearly organised."
        />
      </div>

      {/* The fee blocks, without the "Pay Now" action. They are part of the
          screen, not of the paper, so the print run leaves them out. */}
      <div className="contents" data-receipt="screen">
        <StudentFeesOverview showPayNow={false} />
      </div>

      {/* The receipt card, on Figma's 376px frame. */}
      <section
        data-receipt="card"
        className="flex w-full flex-col gap-4 rounded-[12px] border border-border bg-surface p-6 print:border-0 print:bg-transparent print:p-0"
      >
        <h3 className="flex items-center gap-2 text-title font-bold leading-[1.45] text-ink">
          <span aria-hidden>✓</span>
          Payment successful
        </h3>

        <p className="text-display font-semibold leading-[1.45] text-ink">
          {formatTaka(total)}
        </p>

        {/* The receipt details, on Figma's 138px band of three lines. */}
        <div className="flex h-[138px] w-full flex-col">
          <p className="text-[16px] font-semibold leading-[46px] text-ink md:text-[20px]">
            Receipt {receiptNumber}
          </p>
          <p className="text-[16px] font-semibold leading-[46px] text-ink md:text-[20px]">
            {student.name} · {student.studentId}
          </p>
          <p className="text-[16px] font-semibold leading-[46px] text-ink md:text-[20px]">
            {paidOn}
          </p>
        </div>

        {/* The action is hidden when the receipt prints. */}
        <div className="flex w-full flex-wrap items-center gap-4 print:hidden" data-receipt="action">
          <Button
            type="button"
            variant="secondary"
            className="h-[47px] w-[184px] shrink-0 px-0"
            onClick={print}
          >
            <Download aria-hidden className="size-4" />
            Download receipt
          </Button>
        </div>
      </section>

      {/* The itemised detail of the receipt. Figma does not draw it, so it is
          an extra block below the frame. */}
      <section
        data-receipt="details"
        className="flex w-full flex-col items-start gap-4 rounded-[12px] border border-border bg-surface p-6"
      >
        <h3 className="text-title font-semibold leading-[1.45] text-ink">
          Payment details
        </h3>

        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
          <caption className="sr-only">Fee items</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="border-b border-border pb-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
              >
                Fee item
              </th>
              <th
                scope="col"
                className="border-b border-border pb-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
              >
                Due date
              </th>
              <th
                scope="col"
                className="border-b border-border pb-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.item}>
                <td className="py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                  {item.item}
                </td>
                <td className="py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                  {item.dueDate}
                </td>
                <td className="py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                  {item.amount}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={2}
                className="border-t border-border py-3 pl-3 pr-0 text-body font-semibold leading-[1.45] text-ink"
              >
                Total
              </td>
              <td className="border-t border-border py-3 pl-3 pr-0 text-body font-semibold leading-[1.45] text-ink">
                {formatTaka(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        <dl className="flex w-full flex-col gap-3">
          <ReceiptRow label="Receipt number" value={receiptNumber} />
          <ReceiptRow label="Payment date" value={paidOn} />
          <ReceiptRow label="Student" value={student.name} />
          <ReceiptRow label="Student ID" value={student.studentId} />
          <ReceiptRow label="Class" value={student.className} />
          <ReceiptRow label="Payment method" value={method} />
          {cardLast4 ? (
            <ReceiptRow label="Card" value={`•••• ${cardLast4}`} />
          ) : null}
          <ReceiptRow label="Transaction ID" value={transactionId} />
          <ReceiptRow label="Status" value="Paid" />
        </dl>
      </section>

      <Link
        href="/student/fees"
        className="flex w-fit items-center gap-2 text-body-md text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to fees
      </Link>

      {/* The receipt identifier, kept for the print run. */}
      <span className="sr-only" data-receipt="id">
        {receiptId}
      </span>
    </div>
  );
}

interface ReceiptRowProps {
  /** Label of the row. */
  label: string;
  /** Value of the row. */
  value: string;
}

/** One labelled row of the receipt. */
function ReceiptRow({ label, value }: ReceiptRowProps) {
  return (
    <div className="flex w-full flex-wrap items-baseline justify-between gap-4">
      <dt className="text-caption leading-[1.45] text-muted">{label}</dt>
      <dd className="text-body-md font-medium leading-[1.45] text-ink">
        {value}
      </dd>
    </div>
  );
}
