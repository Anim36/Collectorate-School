"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AdminTextField } from "@/components/admin/admin-fields";
import type { AdminFeeRow } from "@/types/admin-11c";

/**
 * The payment methods an admin can record.
 *
 * The names are the ones the tables show.
 */
const PAYMENT_METHODS = [
  { label: "bKash", value: "BKASH" },
  { label: "Nagad", value: "NAGAD" },
  { label: "Cash", value: "CASH" },
  { label: "Bank transfer", value: "BANK_TRANSFER" },
  { label: "Card", value: "CARD" },
] as const;

export interface MarkAsPaidModalProps {
  /** Called when the admin dismisses the modal. */
  onClose: () => void;
  /** Called with the recorded payment. */
  onSave: (values: {
    method: string;
    transactionId?: string;
    cardLast4?: string;
    paidOn: string;
  }) => void;
  /** The payment being recorded. */
  payment: AdminFeeRow;
}

/**
 * The mark-as-paid dialog.
 *
 * The admin records the method, the transaction id the sender quoted, the
 * last four digits of a card and the date the payment was received. The
 * receipt number is handed out by the server, so it is never typed in by
 * hand.
 */
export function MarkAsPaidModal({
  onClose,
  onSave,
  payment,
}: MarkAsPaidModalProps) {
  const [method, setMethod] = React.useState("CASH");
  const [transactionId, setTransactionId] = React.useState("");
  const [cardLast4, setCardLast4] = React.useState("");
  const [paidOn, setPaidOn] = React.useState(today());
  const [error, setError] = React.useState<string | null>(null);

  const submit = () => {
    // A mobile payment always carries the transaction id the sender quoted.
    if ((method === "BKASH" || method === "NAGAD") && transactionId.trim() === "") {
      setError("Enter the transaction id of the payment");
      return;
    }

    // Only a card payment carries card digits, and only the last four.
    if (method === "CARD" && !/^\d{4}$/.test(cardLast4.trim())) {
      setError("Enter the last four digits of the card");
      return;
    }

    if (method !== "CARD" && cardLast4.trim() !== "") {
      setError("Only a card payment carries card digits");
      return;
    }

    onSave({
      method,
      transactionId: transactionId.trim() === "" ? undefined : transactionId.trim(),
      cardLast4: method === "CARD" ? cardLast4.trim() : undefined,
      paidOn,
    });
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
          <fieldset className="flex w-full flex-col items-start gap-2">
            <legend className="text-caption font-medium leading-[1.45] text-muted">
              Method
            </legend>
            <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 md:gap-x-8">
              {PAYMENT_METHODS.map((entry) => (
                <label
                  key={entry.value}
                  className="flex items-center gap-1.5 text-body leading-[1.45] text-ink"
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={entry.value}
                    checked={method === entry.value}
                    onChange={() => {
                      setMethod(entry.value);
                      setError(null);
                    }}
                    className="size-4 shrink-0 rounded-[4px] border border-border accent-[hsl(var(--action))]"
                  />
                  {entry.label}
                </label>
              ))}
            </div>
          </fieldset>

          {method === "BKASH" || method === "NAGAD" ? (
            <AdminTextField
              label="Transaction id"
              value={transactionId}
              onValueChange={setTransactionId}
              placeholder="TX-2026-4474"
              ariaLabel="Transaction id"
            />
          ) : null}

          {method === "CARD" ? (
            <AdminTextField
              label="Card last four"
              value={cardLast4}
              onValueChange={setCardLast4}
              placeholder="4242"
              ariaLabel="Card last four"
            />
          ) : null}

          <AdminTextField
            label="Paid on"
            type="date"
            value={paidOn}
            onValueChange={setPaidOn}
            hint={error ?? undefined}
            ariaLabel="Paid on"
          />
        </div>
      </Modal>
    </div>
  );
}

/**
 * Today, as the date input takes it.
 */
function today(): string {
  const now = new Date();

  return [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("-");
}
