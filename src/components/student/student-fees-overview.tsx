"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PortalTable } from "@/components/shared/portal-table";
import { StudentMetrics } from "@/components/student/student-metrics";
import {
  currentDueFees,
  currentFeeSummary,
  currentPaymentHistory,
  type FeeTableRow,
  type PaymentRecord,
} from "@/data/student";
import { cn } from "@/lib/utils";

export interface StudentFeesOverviewProps {
  /**
   * Whether the "Pay Now" action is shown.
   *
   * Figma draws it on the fee page (2:5260) and leaves it out of the receipt
   * page (2:6060), where the receipt card takes its place.
   */
  showPayNow?: boolean;
  /** Fired when a reader opens a fee row to pay it. */
  onPayFee?: (feeId: string) => void;
  className?: string;
}

/**
 * The shared blocks of the fee pages.
 *
 * Figma draws the same blocks on "Student / Fee Payment" (2:5179 desktop,
 * 2:5282 tablet, 2:5367 mobile) and on "Student / Payment receipt" (2:6060,
 * 2:6169, 2:6260): the metric row, the "Due fees" heading and table, the
 * "Payment history" heading and table, and the receipt action.
 *
 * The receipt page leaves out the "Pay Now" action, so every block below it
 * moves up by 71px — which is exactly what Figma draws.
 */
export function StudentFeesOverview({
  showPayNow = true,
  onPayFee,
  className,
}: StudentFeesOverviewProps) {
  const router = useRouter();

  const summary = currentFeeSummary();
  const fees = currentDueFees();
  const history = currentPaymentHistory();

  const metrics = [
    {
      label: "Total due",
      value: summary.totalDue,
      hint: summary.dueHint,
    },
    {
      label: "Paid this year",
      value: summary.paidThisYear,
      hint: summary.paidHint,
    },
    {
      label: "Next payment",
      value: summary.nextPayment,
      hint: summary.nextHint,
    },
    { label: "Status", value: summary.status, hint: summary.statusHint },
  ];

  const dueColumns = [
    {
      header: "Fee item",
      cell: (row: FeeTableRow) => (
        <span className="flex w-full flex-wrap items-center gap-2">
          <span>{row.item}</span>
          {row.paid ? (
            <Badge variant="success" className="px-2 py-0 text-micro">
              Paid
            </Badge>
          ) : null}
        </span>
      ),
    },
    { header: "Due date", cell: (row: FeeTableRow) => row.dueDate },
    { header: "Amount", cell: (row: FeeTableRow) => row.amount },
  ];

  const dueRecords = fees.map((row) => ({
    id: row.item,
    lines: [
      { label: "Fee item", value: row.item },
      { label: "Due date", value: row.dueDate },
      { label: "Amount", value: row.amount },
    ],
  }));

  const historyColumns = [
    {
      header: "Receipt",
      cell: (row: PaymentRecord) => (
        <Link
          href={`/student/fees/receipt/${row.receipt}`}
          className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {row.receipt}
        </Link>
      ),
    },
    { header: "Date", cell: (row: PaymentRecord) => row.date },
    { header: "Method", cell: (row: PaymentRecord) => row.method },
    { header: "Amount", cell: (row: PaymentRecord) => row.amount },
  ];

  const historyRecords = history.map((row) => ({
    id: row.receipt,
    lines: [
      { label: "Receipt", value: row.receipt },
      { label: "Date", value: row.date },
      { label: "Method", value: row.method },
      { label: "Amount", value: row.amount },
    ],
  }));

  // The newest receipt is the one the download action opens.
  const latestReceipt = history[0];

  return (
    <div className={cn("contents", className)}>
      <StudentMetrics metrics={metrics} />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Due fees
      </h3>

      <PortalTable
        caption="Due fees"
        columns={dueColumns}
        rows={fees}
        mobileRecords={dueRecords}
        onRowClick={
          onPayFee
            ? (row) =>
                onPayFee(
                  fees.find((fee) => fee.item === row.item)?.id ?? "",
                )
            : undefined
        }
      />

      {showPayNow ? (
        <Button
          type="button"
          className="h-[47px] w-[189px] px-0"
          onClick={() => onPayFee?.("")}
        >
          Pay Now · {summary.totalDue}
        </Button>
      ) : null}

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Payment history
      </h3>

      <PortalTable
        caption="Payment history"
        columns={historyColumns}
        rows={history}
        mobileRecords={historyRecords}
      />

      <Button
        type="button"
        variant="secondary"
        className="h-[49px] w-[186px] px-0"
        disabled={!latestReceipt}
        onClick={() => {
          if (!latestReceipt) return;
          router.push(`/student/fees/receipt/${latestReceipt.receipt}`);
        }}
      >
        <Download aria-hidden className="size-4" />
        Download receipt
      </Button>
    </div>
  );
}
