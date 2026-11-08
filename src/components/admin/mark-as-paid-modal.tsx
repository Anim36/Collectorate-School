"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AdminTextField } from "@/components/admin/admin-fields";
import {
  ADMIN_PAYMENT_METHODS,
  type AdminPayment,
  type AdminPaymentMethod,
} from "@/data/admin-11c";

export interface MarkAsPaidModalProps {
  /** Called when the admin dismisses the modal. */
  onClose: () => void;
  /** Called with the recorded payment. */
  onSave: (values: {
    receipt: string;
    method: AdminPaymentMethod;
    paidOn: string;
  }) => void;
  /** The payment being recorded. */
  payment: AdminPayment;
}

/**
 * The mark-as-paid dialog.
 *
 * The admin records the receipt number, the method and the date the payment
 * was received. The payment is only recorded in memory — no money moves.
 */
export function MarkAsPaidModal({
  onClose,
  onSave,
  payment,
}: MarkAsPaidModalProps) {
  const [receipt, setReceipt] = React.useState(payment.receipt);
  const [method, setMethod] = React.useState<AdminPaymentMethod>(
    payment.method === "" ? "bKash" : payment.method,
  );
  const [paidOn, setPaidOn] = React.useState(
    payment.paidOn === "" ? "2026-11-04" : payment.paidOn,
  );
  const [error, setError] = React.useState<string | null>(null);

  const submit = () => {
    if (receipt.trim() === "") {
      setError("Enter the receipt number");
      return;
    }

    onSave({ receipt: receipt.trim(), method, paidOn });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-6 md:items-center">
      <Modal
        title="Mark as paid"
        description={`${payment.student} · ${payment.invoice} · ${payment.amount}`}
        onClose={onClose}
        className="max-w-[560px]"
        footer={
          <>
            <Button type="button" className="h-[47px]" onClick={submit}>
              Record payment
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-[49px]"
              onClick={onClose}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="flex w-full flex-col gap-4">
          <AdminTextField
            label="Receipt number"
            value={receipt}
            onValueChange={setReceipt}
            placeholder="RCP-2026-4474"
            hint={error ?? undefined}
            ariaLabel="Receipt number"
          />

          <fieldset className="flex w-full flex-col items-start gap-2">
            <legend className="text-caption font-medium leading-[1.45] text-muted">
              Method
            </legend>
            <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 md:gap-x-8">
              {ADMIN_PAYMENT_METHODS.map((entry) => (
                <label
                  key={entry}
                  className="flex items-center gap-1.5 text-body leading-[1.45] text-ink"
                >
                  <input
                    type="radio"
                    name="payment-method"
                    checked={method === entry}
                    onChange={() => setMethod(entry)}
                    className="size-4 shrink-0 rounded-[4px] border border-border accent-[hsl(var(--action))]"
                  />
                  {entry}
                </label>
              ))}
            </div>
          </fieldset>

          <AdminTextField
            label="Paid on"
            type="date"
            value={paidOn}
            onValueChange={setPaidOn}
            ariaLabel="Paid on"
          />
        </div>
      </Modal>
    </div>
  );
}
