"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ModalOption } from "@/components/ui/modal-option";
import { StudentFeesOverview } from "@/components/student/student-fees-overview";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { cn } from "@/lib/utils";
import {
  allFeesId,
  currentFeeSummary,
  initialPaymentMethod,
  paymentMethods,
  subscribeToPaymentStore,
} from "@/data/student";

/**
 * Student fee payment page body.
 * Figma "Fee Payment content" (2:5225 desktop, 2:5289 tablet, 2:5372 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px greeting, the 166px metric row, the
 *   "Due fees" heading, the 248px due-fees table, the Pay Now button, the
 *   "Payment history" heading, the 248px history table and the receipt button.
 * - Tablet (768): 32px padding; the metric row grows to 231px because the
 *   taka figures wrap in the narrow cards.
 * - Mobile (375): 24px padding, an 88px greeting, the metric row in two
 *   blocks of two and stacked table records.
 *
 * The page reads the mock payment store, so a fee paid on the payment method
 * page is marked as paid here and the receipt appears in the history.
 */
export function StudentFees({ className }: { className?: string }) {
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [payingFeeId, setPayingFeeId] = React.useState(allFeesId);

  // The store tells the page when a payment has been made.
  const [, setVersion] = React.useState(0);
  React.useEffect(
    () => subscribeToPaymentStore(() => setVersion((count) => count + 1)),
    [],
  );

  const openPayment = (feeId: string) => {
    setPayingFeeId(feeId || allFeesId);
    setPaymentOpen(true);
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8",
        className,
      )}
    >
      <StudentPageHeader
        title="Fee Payment"
        description="Your school life, clearly organised."
      />

      <StudentFeesOverview onPayFee={openPayment} />

      {paymentOpen ? (
        <PaymentMethodModal
          feeId={payingFeeId}
          onClose={() => setPaymentOpen(false)}
        />
      ) : null}
    </div>
  );
}

interface PaymentMethodModalProps {
  /** The fee the payment settles. */
  feeId: string;
  /** Called when the reader dismisses the modal. */
  onClose: () => void;
}

/**
 * The payment method modal.
 * Figma "Payment method modal" (2:5858 desktop, 2:5936 tablet, 2:6025 mobile):
 * a 560px dialog with a 35px title, a 23px caption, three 73px method
 * options, a 19px note and the Continue and Cancel actions.
 *
 * The modal only picks the method — it hands over to the payment method page,
 * where the details of the method are asked for.
 */
function PaymentMethodModal({ feeId, onClose }: PaymentMethodModalProps) {
  const [method, setMethod] = React.useState(initialPaymentMethod);

  const selected =
    paymentMethods.find((entry) => entry.id === method) ?? paymentMethods[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
      <Modal
        title="Choose a payment method"
        description={`Secure payment · Total ${currentFeeSummary().totalDue}`}
        onClose={onClose}
        footer={
          <>
            <Button asChild type="button" className="h-[47px] w-[191px] px-0">
              <Link
                href={`/student/fees/pay?fee=${feeId}&method=${method}`}
                onClick={onClose}
              >
                Continue to {selected.label}
              </Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-[49px] w-[104px] px-0"
              onClick={onClose}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div
          role="radiogroup"
          aria-label="Payment method"
          className="flex w-full flex-col gap-4"
        >
          {paymentMethods.map((entry) => (
            <ModalOption
              key={entry.id}
              label={entry.label}
              selected={method === entry.id}
              onSelect={() => setMethod(entry.id)}
            />
          ))}
        </div>
        <p className="text-caption leading-[1.45] text-muted">
          You’ll continue to your payment provider to authorise the transaction.
        </p>
      </Modal>
    </div>
  );
}
