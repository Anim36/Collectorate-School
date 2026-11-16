"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AdminTextAreaField } from "@/components/admin/admin-fields";
import { EmptyState } from "@/components/shared/empty-state";
import type { AdminPendingPayment } from "@/types/admin-11c";

export interface PendingPaymentsModalProps {
  /** Called when the admin dismisses the modal. */
  onClose: () => void;
  /** Called when the admin approves a payment. */
  onApprove: (paymentId: string) => void;
  /** Called when the admin rejects a payment, with the reason. */
  onReject: (paymentId: string, reason: string) => void;
  /** The payments that wait for the admin. */
  payments: readonly AdminPendingPayment[];
  /** True while a payment is being approved or rejected. */
  busy?: boolean;
}

/**
 * The queue of the payments that wait for the admin.
 *
 * A student submits a payment and it lands in `PENDING`. The admin approves
 * it — the receipt is written and the fee lines are marked as paid — or
 * rejects it with a reason, so the student knows what to do next.
 */
export function PendingPaymentsModal({
  onClose,
  onApprove,
  onReject,
  payments,
  busy = false,
}: PendingPaymentsModalProps) {
  const [rejecting, setRejecting] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const submitRejection = () => {
    if (!rejecting) return;

    if (reason.trim().length < 3) {
      setError("Say why the payment was rejected");
      return;
    }

    onReject(rejecting, reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-6 md:items-center">
      <Modal
        title="Payments to verify"
        description="The payments the students submitted that still wait for you."
        onClose={onClose}
        className="max-w-[720px]"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              className="h-[49px]"
              onClick={onClose}
            >
              Close
            </Button>
          </>
        }
      >
        {payments.length === 0 ? (
          <EmptyState
            message="Nothing to verify"
            title="Every payment the students submitted has been looked at."
          />
        ) : (
          <ul className="flex w-full flex-col gap-3">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex w-full flex-col gap-2 rounded-[12px] border border-border p-4"
              >
                <div className="flex w-full flex-wrap items-baseline justify-between gap-2">
                  <p className="text-body font-semibold leading-[1.45] text-ink">
                    {payment.student} · {payment.className}
                  </p>
                  <p className="text-body leading-[1.45] text-ink">
                    {payment.amount}
                  </p>
                </div>

                <p className="text-caption leading-[1.45] text-muted">
                  {payment.method} · {payment.feeCount} fee
                  {payment.feeCount === 1 ? "" : "s"} · submitted{" "}
                  {payment.submittedOn}
                  {payment.transactionId === ""
                    ? ""
                    : ` · ${payment.transactionId}`}
                </p>

                {/* The number the money was sent from. The office matches the
                    payment with the statement of the wallet, so it needs the
                    whole number here. */}
                {payment.senderMobile === "" ? null : (
                  <p className="text-caption leading-[1.45] text-muted">
                    Sent from {payment.senderMobile}
                  </p>
                )}

                {rejecting === payment.id ? (
                  <div className="flex w-full flex-col gap-3">
                    <AdminTextAreaField
                      label="Why was it rejected?"
                      value={reason}
                      onValueChange={(value) => {
                        setReason(value);
                        setError(null);
                      }}
                      placeholder="The transaction id does not match the receipt"
                      hint={error ?? undefined}
                      ariaLabel="Why was it rejected?"
                    />

                    <div className="flex w-full items-center gap-4">
                      <Button
                        type="button"
                        className="h-[47px]"
                        disabled={busy}
                        onClick={submitRejection}
                      >
                        Reject payment
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-[49px]"
                        onClick={() => {
                          setRejecting(null);
                          setReason("");
                          setError(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full items-center gap-4">
                    <Button
                      type="button"
                      className="h-[47px]"
                      disabled={busy}
                      onClick={() => onApprove(payment.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-[49px]"
                      disabled={busy}
                      onClick={() => {
                        setRejecting(payment.id);
                        setReason("");
                        setError(null);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
