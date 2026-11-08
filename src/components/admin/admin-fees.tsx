"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { AdminFeesFilters } from "@/components/admin/admin-fees-filters";
import { AdminMetrics } from "@/components/admin/admin-metrics";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTableFooter } from "@/components/admin/admin-table-footer";
import { FeeStructureModal } from "@/components/admin/fee-structure-modal";
import { MarkAsPaidModal } from "@/components/admin/mark-as-paid-modal";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { PortalTable } from "@/components/shared/portal-table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminGreeting } from "@/data/admin";
import {
  ADMIN_PAYMENT_PAGE_SIZE,
  ADMIN_PAYMENT_STATUSES,
  adminFeeMetrics,
  adminFeeStructure,
  adminPayments,
  formatTaka,
  type AdminFeeStructureRow,
  type AdminPayment,
} from "@/data/admin-11c";

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
 * Everything happens in memory: the fee structure, the recorded payments and
 * the receipts are held in the page state.
 */
export function AdminFees() {
  const { toast } = useToast();

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Fees");

  const [feeStructure, setFeeStructure] = React.useState<
    readonly AdminFeeStructureRow[]
  >(adminFeeStructure);
  const [payments, setPayments] = React.useState<readonly AdminPayment[]>(
    adminPayments,
  );
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string>(
    ADMIN_PAYMENT_STATUSES[0],
  );
  const [page, setPage] = React.useState(0);
  const [editingBand, setEditingBand] = React.useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = React.useState<string | null>(
    null,
  );

  const filteredPayments = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesStatus =
        status === ADMIN_PAYMENT_STATUSES[0] || payment.status === status;
      if (!matchesStatus) return false;
      if (needle === "") return true;

      return (
        payment.student.toLowerCase().includes(needle) ||
        payment.invoice.toLowerCase().includes(needle) ||
        payment.receipt.toLowerCase().includes(needle)
      );
    });
  }, [payments, query, status]);

  // A filter change starts the list again from the first page.
  React.useEffect(() => {
    setPage(0);
  }, [query, status]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredPayments.length / ADMIN_PAYMENT_PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount - 1);
  const visiblePayments = filteredPayments.slice(
    currentPage * ADMIN_PAYMENT_PAGE_SIZE,
    currentPage * ADMIN_PAYMENT_PAGE_SIZE + ADMIN_PAYMENT_PAGE_SIZE,
  );

  const feeColumns = [
    { header: "Class", cell: (row: AdminFeeStructureRow) => row.classBand },
    {
      header: "Monthly tuition",
      cell: (row: AdminFeeStructureRow) => formatTaka(row.monthlyTuition),
    },
    {
      header: "Admission fee",
      cell: (row: AdminFeeStructureRow) => formatTaka(row.admissionFee),
    },
    {
      header: "Activities",
      cell: (row: AdminFeeStructureRow) => formatTaka(row.activities),
    },
  ];

  // The invoice and the receipt carry the longest values, so they take a
  // wider share of the table and the row keeps its 44px height.
  const paymentColumnWidths = ["18%", "20%", "14%", "12%", "12%", "24%"];

  const feeRecords = feeStructure.map((row) => ({
    id: row.id,
    lines: [
      { label: "Class", value: row.classBand },
      { label: "Monthly tuition", value: formatTaka(row.monthlyTuition) },
      { label: "Admission fee", value: formatTaka(row.admissionFee) },
      { label: "Activities", value: formatTaka(row.activities) },
    ],
  }));

  const paymentColumns = [
    { header: "Student", cell: (row: AdminPayment) => row.student },
    { header: "Invoice", cell: (row: AdminPayment) => row.invoice },
    { header: "Amount", cell: (row: AdminPayment) => row.amount },
    { header: "Status", cell: (row: AdminPayment) => row.status },
    {
      header: "Method",
      cell: (row: AdminPayment) =>
        row.method === "" ? "—" : row.method,
    },
    {
      // The receipt is the last column: it holds the receipt number of a paid
      // payment and the action for one that is still due.
      header: "Receipt",
      cell: (row: AdminPayment) =>
        row.receipt === "" ? (
          <RowAction onClick={() => setRecordingPayment(row.id)}>
            Mark as paid
          </RowAction>
        ) : (
          row.receipt
        ),
    },
  ];

  const paymentRecords = visiblePayments.map((row) => ({
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
          ) : (
            row.method === "" ? "—" : row.method
          ),
      },
    ],
  }));

  const saveFeeStructure = (values: {
    id: string;
    monthlyTuition: number;
    admissionFee: number;
    activities: number;
    dueOn: string;
  }) => {
    setFeeStructure((previous) =>
      previous.map((row) => (row.id === values.id ? { ...row, ...values } : row)),
    );

    setEditingBand(null);

    toast({
      title: "Fee structure saved",
      description: `The fees of the band are now ${formatTaka(
        values.monthlyTuition,
      )} tuition and ${formatTaka(values.admissionFee)} admission.`,
    });
  };

  const recordPayment = (values: {
    receipt: string;
    method: AdminPayment["method"];
    paidOn: string;
  }) => {
    if (!recordingPayment) return;

    const paid = payments.find((row) => row.id === recordingPayment);
    if (!paid) return;

    setPayments((previous) =>
      previous.map((row) =>
        row.id === recordingPayment
          ? {
              ...row,
              status: "Paid",
              method: values.method,
              receipt: values.receipt,
              paidOn: values.paidOn,
            }
          : row,
      ),
    );

    setRecordingPayment(null);

    toast({
      title: "Payment recorded",
      description: `${paid.student} paid ${paid.amount}. Receipt ${values.receipt}.`,
    });
  };

  const editingRow = feeStructure.find((row) => row.id === editingBand);
  const recordingRow = payments.find((row) => row.id === recordingPayment);

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader title="Fees" description={adminGreeting.context} />

      {/* The dues summary. */}
      <AdminMetrics metrics={adminFeeMetrics} />

      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Fee structure
      </h3>

      <PortalTable
        caption="Fee structure"
        columns={feeColumns}
        rows={feeStructure}
        mobileRecords={feeRecords}
        mobileRecordSize="uniform"
        footer={<AdminTableFooter records={feeStructure.length} />}
      />

      <Button
        type="button"
        variant="secondary"
        className="h-[49px] w-[185px] shrink-0"
        onClick={() => setEditingBand(feeStructure[0]?.id ?? null)}
      >
        Edit fee structure
      </Button>

      <h3 className="text-title font-bold leading-[1.45] text-ink">Payments</h3>

      <AdminFeesFilters
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        statusOptions={ADMIN_PAYMENT_STATUSES}
      />

      <PortalTable
        caption="Payments"
        columns={paymentColumns}
        columnWidths={paymentColumnWidths}
        rows={visiblePayments}
        mobileRecords={paymentRecords}
        mobileRecordSize="uniform"
        footer={
          <AdminTableFooter
            records={visiblePayments.length}
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        }
      />

      <Button
        type="button"
        variant="secondary"
        className="h-[49px] w-[182px] shrink-0"
        onClick={() =>
          toast({
            title: "Export ready",
            description: `${filteredPayments.length} payment record(s) are ready to export.`,
          })
        }
      >
        <Download aria-hidden className="size-4" />
        Export payments
      </Button>

      {editingRow && editingBand ? (
        <FeeStructureModal
          rows={feeStructure}
          initialRowId={editingBand}
          onClose={() => setEditingBand(null)}
          onSave={saveFeeStructure}
        />
      ) : null}

      {recordingRow ? (
        <MarkAsPaidModal
          payment={recordingRow}
          onClose={() => setRecordingPayment(null)}
          onSave={recordPayment}
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
