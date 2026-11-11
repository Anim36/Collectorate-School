import type { Metadata } from "next";

import { StudentFees } from "@/components/student/student-fees";
import { getStudentFees } from "@/server/services/student-fees";

export const metadata: Metadata = {
  title: "Fee Payment",
  description: "The fees you still owe and the payments you have already made.",
};

/**
 * Student fee payment page.
 * Figma "Student / Fee Payment" (2:5179 desktop, 2:5282 tablet, 2:5367 mobile
 * and the matching dark frames): the metric row, the due-fees table, the
 * payment method modal, the payment history table and the receipt button.
 */
export default async function StudentFeesPage() {
  // The fee lines and the payments come from the database, and they are the
  // lines and the payments of the signed-in student alone.
  const fees = await getStudentFees();

  if (!fees) {
    return null;
  }

  return <StudentFees data={fees} />;
}
