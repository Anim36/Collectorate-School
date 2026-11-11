import { notFound } from "next/navigation";

import { StudentPaymentReceipt } from "@/components/student/student-payment-receipt";
import {
  getStudentFees,
  getStudentReceipt,
} from "@/server/services/student-fees";

interface PaymentReceiptPageProps {
  /** Route parameter carrying the receipt identifier. */
  params: Promise<{ id: string }>;
}

/**
 * Student payment receipt page.
 * Figma "Student / Payment receipt" (2:6060 desktop, 2:6169 tablet, 2:6260
 * mobile and the matching dark frames): the receipt card under the fee page.
 *
 * The receipt is read from the database for the student the session belongs
 * to. A receipt of another student is reported the same way as one that does
 * not exist, so an id cannot be probed.
 */
export default async function PaymentReceiptPage({
  params,
}: PaymentReceiptPageProps) {
  const { id } = await params;

  const receipt = await getStudentReceipt(id);

  if (!receipt) {
    notFound();
  }

  // The blocks above the receipt card are the ones of the fees page, so the
  // whole page shows one set of numbers.
  const fees = await getStudentFees();

  return (
    <StudentPaymentReceipt
      receipt={receipt}
      fees={fees}
    />
  );
}
