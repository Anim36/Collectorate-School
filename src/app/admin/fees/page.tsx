import type { Metadata } from "next";

import { AdminFees } from "@/components/admin/admin-fees";

export const metadata: Metadata = {
  title: "Fees",
  description:
    "Set the fee structure of each class band and record the payments of the school.",
};

/**
 * Admin fees.
 * Figma "Admin / Fees" (2:13668 desktop, 2:13874 tablet, 2:14041 mobile and
 * the matching dark frames): the dues summary, the fee structure and the
 * payments table.
 */
export default function AdminFeesPage() {
  return <AdminFees />;
}
