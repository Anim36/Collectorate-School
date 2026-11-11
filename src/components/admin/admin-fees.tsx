"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { AdminFeesFilters } from "@/components/admin/admin-fees-filters";
import { AdminMetrics } from "@/components/admin/admin-metrics";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTableFooter } from "@/components/admin/admin-table-footer";
import { FeeStructureModal } from "@/components/admin/fee-structure-modal";
import { IssueFeesModal } from "@/components/admin/issue-fees-modal";
import { MarkAsPaidModal } from "@/components/admin/mark-as-paid-modal";
import { PendingPaymentsModal } from "@/components/admin/pending-payments-modal";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { PortalTable } from "@/components/shared/portal-table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  approvePaymentAction,
  exportFeesAction,
  issueFeesAction,
  listFeesAction,
  recordPaymentAction,
  rejectPaymentAction,
  saveFeeStructureAction,
} from "@/app/admin/actions";
import { formatPoisha } from "@/lib/money";
import type {
  AdminFeeRow,
  AdminFeeStructureRow,
  AdminFeesData,
  AdminPendingPayment,
} from "@/types/admin-11c";

/**
 * The options of the payment status filter.
 *
 * The first one shows every payment, the rest name the state a payment can
 * sit in.
 */
const STATUS_OPTIONS = [
  "All payment statuses",
  "Paid",
  "Due",
  "Overdue",
] as const;

/**
 * The status of a payment, as the database holds it.
 */
const STATUS_VALUES: Record<string, string> = {
  "All payment statuses": "ALL",
  Paid: "PAID",
  Due: "DUE",
  Overdue: "OVERDUE",
};

/**
 * The page size the payments table shows.
 *
 * Figma draws three payments on a page, so a page holds three rows.
 */
const PAGE_SIZE = 3;

/**
 * Hands a CSV file to the browser.
 *
 * The file is built in the browser from the text the server sent, so nothing
 * is written to the disk of the server.
 */
function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

export interface AdminFeesProps {
  /** The fees the server read for the first page. */
  initialFees: AdminFeesData | null;
  /** The context line under the heading. */
  greeting: string;
}

/**
 * The admin fees page.
 *
 * Figma "Admin / Fees" (2:13668 desktop, 2:13874 tablet, 2:14041 mobile and
 * the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 166px dues summary, the
 *   35px "Fee structure" heading, the 248px fee structure table, the 49px
 *   "Edit fee structure" action, the 35px "Payments" heading, the 76px
 *   selection filters, the 308px payments table and the 49px "Export payments"
 *   action.
 * - Tablet (768): the same rhythm.
 * - Mobile (375): 24px padding, a 41px heading, the 155px summary in two
 *   blocks of two, the 35px heading, the 309px table, the 49px action, the 35px
 *   heading, a 168px filter block and the 513px payments table.
 *
 * The fee structure, the payments and the receipts are read from the
 * database, and the search, the status filter and the pagination run on the
 * server, so the count in the footer is the number of lines that really match.
 */
export function AdminFees({ initialFees, greeting }: AdminFeesProps) {
  const { toast } = useToast();

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Fees");

  const [metrics, setMetrics] = React.useState(initialFees?.metrics ?? []);
  const [structures, setStructures] = React.useState<
    readonly AdminFeeStructureRow[]
  >(initialFees?.structures ?? []);
  const [payments, setPayments] = React.useState<readonly AdminFeeRow[]>(
    initialFees?.payments.rows ?? [],
  );
  const [pending, setPending] = React.useState<readonly AdminPendingPayment[]>(
    initialFees?.pending ?? [],
  );
  const [total, setTotal] = React.useState(initialFees?.payments.total ?? 0);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string>(STATUS_OPTIONS[0]);
  const [page, setPage] = React.useState(0);
  const [editingBand, setEditingBand] = React.useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = React.useState<string | null>(
    null,
  );
  const [issuingFees, setIssuingFees] = React.useState(false);
  const [reviewingPayments, setReviewingPayments] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  /**
   * Reads the fees of the school from the server.
   */
  const load = React.useCallback(
    async (nextPage: number) => {
      const result = await listFeesAction({
        query,
        status: STATUS_VALUES[status] ?? "ALL",
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      if (!result.ok) {
        toast({
          title: "Could not load the fees",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setMetrics(result.data.metrics);
      setStructures(result.data.structures);
      setPayments(result.data.payments.rows);
      setPending(result.data.pending);
      setTotal(result.data.payments.total);
    },
    [query, status, toast],
  );

  // The list is read again when the filters change.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      void load(0);
    }, 250);

    return () => clearTimeout(timer);
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);

  const feeColumns = [
    { header: "Class", cell: (row: AdminFeeStructureRow) => row.className },
    {
      header: "Monthly tuition",
      cell: (row: AdminFeeStructureRow) =>
        formatPoisha(row.monthlyTuitionPoisha),
    },
    {
      header: "Admission fee",
      cell: (row: AdminFeeStructureRow) => formatPoisha(row.admissionFeePoisha),
    },
    {
      header: "Activities",
      cell: (row: AdminFeeStructureRow) => formatPoisha(row.activitiesPoisha),
    },
  ];

  // The invoice and the receipt carry the longest values, so they take a
  // wider share of the table and the row keeps its 44px height.
  const paymentColumnWidths = ["16%", "22%", "13%", "12%", "12%", "25%"];

  const feeRecords = structures.map((row) => ({
    id: row.id,
    lines: [
      { label: "Class", value: row.className },
      {
        label: "Monthly tuition",
        value: formatPoisha(row.monthlyTuitionPoisha),
      },
      {
        label: "Admission fee",
        value: formatPoisha(row.admissionFeePoisha),
      },
      { label: "Activities", value: formatPoisha(row.activitiesPoisha) },
    ],
  }));

  const paymentColumns = [
    { header: "Student", cell: (row: AdminFeeRow) => row.student },
    { header: "Invoice", cell: (row: AdminFeeRow) => row.invoice },
    { header: "Amount", cell: (row: AdminFeeRow) => row.amount },
    { header: "Status", cell: (row: AdminFeeRow) => row.status },
    {
      header: "Method",
      cell: (row: AdminFeeRow) => (row.method === "" ? "—" : row.method),
    },
    {
      // The receipt is the last column: it holds the receipt number of a paid
      // payment and the action for one that is still due.
      header: "Receipt",
      cell: (row: AdminFeeRow) =>
        row.receipt === "" ? (
          <RowAction onClick={() => setRecordingPayment(row.id)}>
            Mark as paid
          </RowAction>
        ) : (
          row.receipt
        ),
    },
  ];

  const paymentRecords = payments.map((row) => ({
    id: row.id,
    lines: [
      { label: "Student", value: row.student },
      { label: "Invoice", value: row.invoice },
      { label: "Amount", value: row.amount },
      { label: "Status", value: row.status },
      {
        // The method holds the receipt of a paid payment, so the line stays
        // the one line Figma draws on the mobile frame.
        label: "Method",
        value:
          row.receipt === "" ? (
            <RowAction onClick={() => setRecordingPayment(row.id)}>
              Mark as paid
            </RowAction>
          ) : row.method === "" ? (
            "—"
          ) : (
            row.method
          ),
      },
    ],
  }));

  /**
   * Saves the edited fee structure of a class.
   */
  const saveFeeStructure = async (values: {
    id: string;
    monthlyTuitionPoisha: number;
    admissionFeePoisha: number;
    activitiesPoisha: number;
    dueDate: string;
  }) => {
    if (busy) return;

    setBusy(true);

    const result = await saveFeeStructureAction(values);

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Fee structure not saved",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setEditingBand(null);
    await load(page);

    toast({
      title: "Fee structure saved",
      description: `The fees of the class are now ${formatPoisha(
        values.monthlyTuitionPoisha,
      )} tuition and ${formatPoisha(values.admissionFeePoisha)} admission.`,
    });
  };

  /**
   * Records the payment the admin took at the desk.
   */
  const recordPayment = async (values: {
    method: string;
    transactionId?: string;
    cardLast4?: string;
    paidOn: string;
  }) => {
    if (!recordingPayment || busy) return;

    const paid = payments.find((row) => row.id === recordingPayment);
    if (!paid) return;

    setBusy(true);

    const result = await recordPaymentAction({
      feeIds: [paid.id],
      method: values.method,
      transactionId: values.transactionId,
      cardLast4: values.cardLast4,
      amountPoisha: paid.amountPoisha,
      paidOn: values.paidOn,
    });

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Payment not recorded",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setRecordingPayment(null);
    await load(page);

    toast({
      title: "Payment recorded",
      description: `${paid.student} paid ${paid.amount}. Receipt ${result.data.receiptNo}.`,
    });
  };

  /**
   * Issues the fees of a billing slot to the students of a class.
   */
  const issueFees = async (values: {
    classId: string;
    period: string;
    lines: string[];
  }) => {
    if (busy) return;

    setBusy(true);

    const result = await issueFeesAction(values);

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Fees not issued",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setIssuingFees(false);
    await load(page);

    toast({
      title: "Fees issued",
      description:
        result.data.issued === 0
          ? "Every student of that class already holds those fees."
          : `${result.data.issued} fee line(s) written for ${values.period}.`,
    });
  };

  /**
   * Approves a payment a student submitted.
   */
  const approvePayment = async (paymentId: string) => {
    if (busy) return;

    setBusy(true);

    const result = await approvePaymentAction(paymentId);

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Payment not approved",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    await load(page);

    toast({
      title: "Payment approved",
      description: `Receipt ${result.data.receiptNo} was issued.`,
    });
  };

  /**
   * Rejects a payment a student submitted.
   */
  const rejectPayment = async (paymentId: string, reason: string) => {
    if (busy) return;

    setBusy(true);

    const result = await rejectPaymentAction({ paymentId, reason });

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Payment not rejected",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setReviewingPayments(false);
    await load(page);

    toast({
      title: "Payment rejected",
      description: "The student has been told why it was rejected.",
    });
  };

  /**
   * Downloads the payments that match the filters as a CSV file.
   */
  const exportPayments = async () => {
    const result = await exportFeesAction({
      query,
      status: STATUS_VALUES[status] ?? "ALL",
    });

    if (!result.ok) {
      toast({
        title: "Export failed",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    downloadCsv(result.data.fileName, result.data.csv);

    toast({
      title: "Export ready",
      description: `${total} payment record(s) are ready to export.`,
    });
  };

  const editingRow = structures.find((row) => row.id === editingBand);
  const recordingRow = payments.find((row) => row.id === recordingPayment);

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader title="Fees" description={greeting} />

      {/* The dues summary. */}
      <AdminMetrics metrics={metrics} />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Fee structure
      </h3>

      <PortalTable
        caption="Fee structure"
        columns={feeColumns}
        rows={structures}
        mobileRecords={feeRecords}
        mobileRecordSize="uniform"
        footer={<AdminTableFooter records={structures.length} />}
      />

      <div className="flex w-full flex-wrap items-center gap-4">
        <Button
          type="button"
          variant="secondary"
          className="h-[49px] w-[185px] shrink-0"
          onClick={() => setEditingBand(structures[0]?.id ?? null)}
        >
          Edit fee structure
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="h-[49px] w-[150px] shrink-0"
          onClick={() => setIssuingFees(true)}
        >
          Issue fees
        </Button>
      </div>

      <h3 className="text-title font-bold leading-[1.45] text-ink">Payments</h3>

      <AdminFeesFilters
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        statusOptions={STATUS_OPTIONS}
      />

      <PortalTable
        caption="Payments"
        columns={paymentColumns}
        columnWidths={paymentColumnWidths}
        rows={payments}
        mobileRecords={paymentRecords}
        mobileRecordSize="uniform"
        footer={
          <AdminTableFooter
            records={payments.length}
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        }
      />

      <div className="flex w-full flex-wrap items-center gap-4">
        <Button
          type="button"
          variant="secondary"
          className="h-[49px] w-[182px] shrink-0"
          onClick={() => setReviewingPayments(true)}
        >
          Payments to verify
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="h-[49px] w-[182px] shrink-0"
          onClick={() => void exportPayments()}
        >
          <Download aria-hidden className="size-4" />
          Export payments
        </Button>
      </div>

      {editingRow && editingBand ? (
        <FeeStructureModal
          rows={structures}
          initialRowId={editingBand}
          onClose={() => setEditingBand(null)}
          onSave={(values) => void saveFeeStructure(values)}
        />
      ) : null}

      {recordingRow ? (
        <MarkAsPaidModal
          payment={recordingRow}
          onClose={() => setRecordingPayment(null)}
          onSave={(values) => void recordPayment(values)}
        />
      ) : null}

      {issuingFees ? (
        <IssueFeesModal
          rows={structures}
          onClose={() => setIssuingFees(false)}
          onIssue={(values) => void issueFees(values)}
        />
      ) : null}

      {reviewingPayments ? (
        <PendingPaymentsModal
          payments={pending}
          busy={busy}
          onClose={() => setReviewingPayments(false)}
          onApprove={(paymentId) => void approvePayment(paymentId)}
          onReject={(paymentId, reason) =>
            void rejectPayment(paymentId, reason)
          }
        />
      ) : null}
    </div>
  );
}

/** A row action, drawn as a quiet link. */
function RowAction({
  onClick,
  children,
}: {
  /** Fired when the admin clicks the action. */
  onClick: () => void;
  /** Label of the action. */
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[6px] text-body-md text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}
