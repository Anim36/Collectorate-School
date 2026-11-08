"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { StudentPaymentReceipt } from "@/components/student/student-payment-receipt";
import { getPaymentStore } from "@/data/student";

/**
 * Student payment receipt page.
 * Figma "Student / Payment receipt" (2:6060 desktop, 2:6169 tablet, 2:6260
 * mobile and the matching dark frames): the receipt card under the fee page.
 *
 * The receipt is read from the mock payment store, so a receipt issued by the
 * payment method page is the one this page shows.
 */
export default function PaymentReceiptPage() {
  const params = useParams<{ id: string }>();
  const receiptId = params?.id ?? "";

  // The store lives in the browser, so the receipt is read once the page has
  // mounted.
  const [receipt, setReceipt] = React.useState(() =>
    getPaymentStore().receipts.find((entry) => entry.id === receiptId),
  );

  React.useEffect(() => {
    setReceipt(
      getPaymentStore().receipts.find((entry) => entry.id === receiptId),
    );
  }, [receiptId]);

  if (!receipt) {
    return (
      <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
        <h2 className="text-[28px] font-bold leading-[1.45] text-ink md:text-heading">
          Payment receipt
        </h2>
        <p className="text-body leading-[1.45] text-muted">
          This receipt is not available. The payment history on the fees page
          lists the receipts you can open.
        </p>
      </div>
    );
  }

  return (
    <StudentPaymentReceipt
      receiptId={receipt.id}
      receiptNumber={receipt.receipt}
      paidOn={receipt.date}
      method={receipt.method}
      transactionId={receipt.transactionId}
      cardLast4={receipt.cardLast4}
      items={receipt.items}
      total={receipt.total}
    />
  );
}
