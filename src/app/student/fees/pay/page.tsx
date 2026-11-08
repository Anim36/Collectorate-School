import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentPaymentMethod } from "@/components/student/student-payment-method";

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

  return (
    <Suspense fallback={null}>
      <StudentPaymentMethod feeId={fee ?? null} methodId={method ?? null} />
    </Suspense>
  );
}
