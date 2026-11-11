import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { StudentPaymentMethod } from "@/components/student/student-payment-method";
import { listPayableFees } from "@/server/services/student-fees";

export const metadata: Metadata = {
  title: "Payment method",
  description: "Choose how you pay and confirm the transaction.",
};

interface PaymentMethodPageProps {
  /** Query string carrying the fee and the method. */
  searchParams: Promise<{ fee?: string; method?: string }>;
}

/**
 * Student payment method page.
 * Figma "Student / Payment method" (2:5755 desktop, 2:5872 tablet, 2:5971
 * mobile and the matching dark frames): the payment method modal of the fees
 * page hands over here, where the method details are asked for.
 */
export default async function PaymentMethodPage({
  searchParams,
}: PaymentMethodPageProps) {
  const { fee, method } = await searchParams;

  // The fees the student may pay are read for the student the session
  // belongs to, so a fee of another student can never be settled here.
  const fees = await listPayableFees();

  // The empty id means every outstanding fee is settled at once.
  const selected = fee ? fees.find((entry) => entry.id === fee) : undefined;

  // A fee that is not payable by this student — a fee of another student, a
  // fee that is already paid, or one that does not exist — is reported the
  // same way, so an id cannot be probed.
  if (fee && !selected) {
    notFound();
  }

  const items = selected ? [selected] : fees;

  return (
    <Suspense fallback={null}>
      <StudentPaymentMethod
        methodId={method ?? null}
        items={items}
      />
    </Suspense>
  );
}
