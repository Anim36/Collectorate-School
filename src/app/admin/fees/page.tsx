import type { Metadata } from "next";

import { AdminFees } from "@/components/admin/admin-fees";
import { listFeesAction } from "@/app/admin/actions";
import { adminGreetingContext } from "@/server/services/admin-context";

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
export default async function AdminFeesPage() {
  // The fees, the fee structure and the payments come from the database, so
  // the tables show what the school has really billed and collected.
  const [fees, greeting] = await Promise.all([
    listFeesAction({ page: 0, pageSize: 3 }),
    adminGreetingContext(),
  ]);

  return <AdminFees initialFees={fees.ok ? fees.data : null} greeting={greeting} />;
}
