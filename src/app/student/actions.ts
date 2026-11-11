"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/server/auth-guard";
import type { ServiceResult } from "@/server/services/admin-schemas";
import type { StudentPaymentInput } from "@/server/services/student-schemas";
import type {
  StudentNoticeBoard,
  StudentNoticeFilterInput,
} from "@/types/student";

/**
 * The actions of the student portal.
 *
 * Every action works out the student from the session on the server, so a
 * student can never act on another student's record by sending an id. The
 * action itself refuses a caller who is not a student, so a teacher, an
 * admin or an anonymous visitor cannot run it.
 */

/**
 * Refuses an action that is not made by a student.
 */
function refuse(): { ok: false; error: string } {
  return { ok: false, error: "You are not allowed to do that" };
}

/**
 * Submits a payment request.
 *
 * The action refuses anything that is not a payment of the signed-in
 * student, and the amount is worked out by the server from the fee lines
 * the payment settles.
 */
export async function submitStudentPaymentAction(
  input: StudentPaymentInput,
): Promise<ServiceResult<{ paymentId: string; amountPoisha: number }>> {
  const user = await getCurrentUser();

  if (!user || user.role !== "STUDENT" || user.mustChangePassword) {
    return refuse();
  }

  const { submitStudentPayment } = await import("@/server/services/student-fees");

  const result = await submitStudentPayment(input);

  if (result.ok) {
    // The fees page and the dashboard both show the dues, so both are read
    // again after a payment is submitted.
    revalidatePath("/student/fees");
    revalidatePath("/student/dashboard");
  }

  return result;
}

/**
 * Reads the notice board of the student.
 *
 * The filters and the page are read on the server, so the count under the
 * table is the number of notices that really match and not the number of
 * notices that happen to be on the page.
 */
export async function listStudentNoticesAction(
  input: Partial<StudentNoticeFilterInput>,
): Promise<ServiceResult<StudentNoticeBoard>> {
  const user = await getCurrentUser();

  if (!user || user.role !== "STUDENT" || user.mustChangePassword) {
    return refuse();
  }

  const { getStudentNoticeBoard } = await import(
    "@/server/services/student-content"
  );

  const board = await getStudentNoticeBoard(input);

  return { ok: true, data: board };
}
