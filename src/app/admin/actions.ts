"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/server/auth-guard";
import type { ServiceResult } from "@/server/services/admin-schemas";
import type { UserList } from "@/server/services/users";
import type {
  AllocationList,
  ClassList,
  ClassOption,
  SubjectRow,
  TeacherOption,
} from "@/server/services/classes";
import type { CsvPreview } from "@/server/services/csv-import";
import type {
  ListCalendarEventsInput,
  ListNoticesInput,
  SaveAlbumInput,
  SaveNoticeInput,
} from "@/server/services/admin-11b-schemas";
import type {
  IssueFeesInput,
  ListAuditLogInput,
  ListPaymentsInput,
} from "@/server/services/admin-11c-schemas";
import { rejectPaymentSchema } from "@/server/services/admin-11c-schemas";
import type { PaymentMethod } from "@/generated/prisma/enums";
import type {
  AdminNoticeList as NoticeList,
  AdminNoticeRow as NoticeRow,
} from "@/types/admin-11b";
import type {
  AdminAlbumList as AlbumList,
  AdminPhotoReviewRow as PhotoReviewRow,
} from "@/types/admin-11b";
import type {
  AdminRoutineClassOption as RoutineClassOption,
  AdminRoutineSheet as RoutineSheet,
} from "@/types/admin-11b";
import type { AdminCalendarEventList as CalendarEventList } from "@/types/admin-11b";
import type {
  AdminAuditList as AuditList,
  AdminDashboardData as DashboardData,
  AdminFeesData as FeesData,
} from "@/types/admin-11c";

/**
 * The admin actions.
 *
 * Every action checks the session and the role before it touches anything,
 * and every input is validated on the server.
 */

/**
 * The admin behind the session.
 *
 * The row is read again from the database on every call, so an account that
 * has been deactivated, a session a password change has superseded, or an
 * account that still has to replace its temporary password cannot run an
 * action even while its cookie is still in the browser.
 *
 * It returns null when nobody is signed in or when the account is not an
 * admin, so an action can refuse without throwing.
 */
async function currentAdmin(): Promise<{ id: string } | null> {
  const user = await getCurrentUser();

  if (!user) return null;
  if (user.role !== "ADMIN") return null;
  if (user.mustChangePassword) return null;

  return { id: user.id };
}

/**
 * Refuses an action that is not made by an admin.
 */
function refuse(): { ok: false; error: string } {
  return { ok: false, error: "You are not allowed to do that" };
}

/**
 * Reads the accounts of the school.
 */
export async function listUsersAction(input: {
  query?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<ServiceResult<UserList>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { listUsers } = await import("@/server/services/users");

  return listUsers({
    query: input.query,
    role: input.role as never,
    status: input.status as never,
    page: input.page ?? 0,
    pageSize: input.pageSize ?? 10,
  });
}

/**
 * Creates an account.
 */
export async function createUserAction(input: {
  name: string;
  role: string;
  classId?: string;
  department?: string;
  email?: string;
  password: string;
}): Promise<ServiceResult<{ id: string; loginId: string; className: string | null }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { createUser } = await import("@/server/services/users");

  const result = await createUser(admin.id, {
    name: input.name,
    role: input.role as never,
    classId: input.classId,
    department: input.department,
    email: input.email,
    password: input.password,
  });

  if (result.ok) {
    revalidatePath("/admin/users");
  }

  return result;
}

/**
 * Edits an account.
 */
export async function editUserAction(input: {
  userId: string;
  name: string;
  classId?: string;
  phone?: string;
  guardianName?: string;
  guardianPhone?: string;
  email?: string;
}): Promise<ServiceResult<{ id: string; name: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { editUser } = await import("@/server/services/users");

  const result = await editUser(admin.id, input);

  if (result.ok) {
    revalidatePath("/admin/users");
  }

  return result;
}

/**
 * Activates or deactivates an account.
 */
export async function setUserActiveAction(
  userId: string,
  isActive: boolean,
): Promise<ServiceResult<{ id: string; isActive: boolean }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { setUserActive } = await import("@/server/services/users");

  const result = await setUserActive(admin.id, userId, isActive);

  if (result.ok) {
    revalidatePath("/admin/users");
  }

  return result;
}

/**
 * Resets the password of an account.
 *
 * When no password is given, one is generated and handed back to the admin
 * once. It is never written down anywhere.
 */
export async function resetUserPasswordAction(
  userId: string,
  password?: string,
): Promise<ServiceResult<{ id: string; temporaryPassword: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { resetUserPassword, generateTemporaryPassword } = await import(
    "@/server/services/users"
  );

  const temporaryPassword = password ?? generateTemporaryPassword();

  const result = await resetUserPassword(admin.id, userId, temporaryPassword);

  if (result.ok) {
    revalidatePath("/admin/users");
    return { ok: true, data: { id: result.data.id, temporaryPassword } };
  }

  return result;
}

/**
 * The classes of the school, with their counts.
 */
export async function listClassesAction(
  page = 0,
  pageSize = 5,
): Promise<ServiceResult<ClassList>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { listClasses } = await import("@/server/services/classes");

  return listClasses(page, pageSize);
}

/**
 * The class options for a dropdown.
 */
export async function listClassOptionsAction(): Promise<
  ServiceResult<ClassOption[]>
> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { listClassOptions } = await import("@/server/services/classes");

  return listClassOptions();
}

/**
 * The subject allocations of the school.
 */
export async function listAllocationsAction(
  page = 0,
  pageSize = 3,
): Promise<ServiceResult<AllocationList>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { listAllocations } = await import("@/server/services/classes");

  return listAllocations(page, pageSize);
}

/**
 * The subjects of the school.
 */
export async function listSubjectsAction(): Promise<ServiceResult<SubjectRow[]>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { listSubjects } = await import("@/server/services/classes");

  return listSubjects();
}

/**
 * The teachers that can be picked.
 */
export async function listTeacherOptionsAction(): Promise<
  ServiceResult<TeacherOption[]>
> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { listTeacherOptions } = await import("@/server/services/classes");

  return listTeacherOptions();
}

/**
 * Adds or edits a class.
 */
export async function saveClassAction(input: {
  id?: string;
  name: string;
  sortOrder: number;
  gradingMode: string;
  classTeacherId?: string;
}): Promise<ServiceResult<{ id: string; name: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { createClass, updateClass } = await import("@/server/services/classes");

  const gradingMode =
    input.gradingMode === "GRADE_ONLY" ? "GRADE_ONLY" : "GPA";

  const result = input.id
    ? await updateClass(admin.id, {
        id: input.id,
        name: input.name,
        sortOrder: input.sortOrder,
        gradingMode,
        classTeacherId: input.classTeacherId,
      })
    : await createClass(admin.id, {
        name: input.name,
        sortOrder: input.sortOrder,
        gradingMode,
        classTeacherId: input.classTeacherId,
      });

  if (result.ok) {
    revalidatePath("/admin/classes");
  }

  return result;
}

/**
 * Removes a class.
 */
export async function deleteClassAction(
  classId: string,
): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { deleteClass } = await import("@/server/services/classes");

  const result = await deleteClass(admin.id, classId);

  if (result.ok) {
    revalidatePath("/admin/classes");
  }

  return result;
}

/**
 * Adds or edits a subject.
 */
export async function saveSubjectAction(input: {
  id?: string;
  name: string;
}): Promise<ServiceResult<{ id: string; name: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { upsertSubject } = await import("@/server/services/classes");

  const result = await upsertSubject(admin.id, input);

  if (result.ok) {
    revalidatePath("/admin/classes");
  }

  return result;
}

/**
 * Assigns a subject to a class.
 */
export async function assignSubjectAction(input: {
  classId: string;
  subjectId: string;
  teacherId?: string;
}): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { assignSubject } = await import("@/server/services/classes");

  const result = await assignSubject(admin.id, input);

  if (result.ok) {
    revalidatePath("/admin/classes");
  }

  return result;
}

/**
 * Removes a subject allocation.
 */
export async function removeAllocationAction(
  allocationId: string,
): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { removeAllocation } = await import("@/server/services/classes");

  const result = await removeAllocation(admin.id, allocationId);

  if (result.ok) {
    revalidatePath("/admin/classes");
  }

  return result;
}

/**
 * Reads a CSV file and reports what each row would do.
 *
 * The file is read on the server, so nothing is trusted from the browser
 * beyond the text itself.
 */
export async function previewCsvAction(input: {
  name: string;
  text: string;
  size: number;
}): Promise<ServiceResult<CsvPreview>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { previewCsv } = await import("@/server/services/csv-import");

  return previewCsv(admin.id, input);
}

/**
 * Writes the rows of a CSV file.
 */
export async function commitCsvAction(input: {
  name: string;
  text: string;
  size: number;
}): Promise<ServiceResult<{ imported: number }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { commitCsv } = await import("@/server/services/csv-import");

  const result = await commitCsv(admin.id, input);

  if (result.ok) {
    revalidatePath("/admin/users");
  }

  return result;
}

/* ------------------------------------------------------------- notices --- */

/**
 * Reads the notices of the school.
 */
export async function listNoticesAction(input: {
  query?: string;
  category?: string;
  audience?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<ServiceResult<NoticeList>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { listNotices } = await import("@/server/services/notices");

  return listNotices({
    query: input.query,
    category: input.category as ListNoticesInput["category"],
    audience: input.audience as ListNoticesInput["audience"],
    status: input.status as ListNoticesInput["status"],
    page: input.page,
    pageSize: input.pageSize,
  });
}

/**
 * Reads one notice in full.
 */
export async function getNoticeAction(
  noticeId: string,
): Promise<ServiceResult<NoticeRow>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { getNotice } = await import("@/server/services/notices");

  return getNotice(noticeId);
}

/**
 * Creates a notice or edits an existing one.
 */
export async function saveNoticeAction(input: {
  id?: string;
  title: string;
  body: string;
  category: string;
  audiences: string[];
  publishedOn?: string;
}): Promise<ServiceResult<{ id: string; title: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { saveNotice } = await import("@/server/services/notices");

  const result = await saveNotice(admin.id, {
    id: input.id,
    title: input.title,
    body: input.body,
    category: input.category as SaveNoticeInput["category"],
    audiences: input.audiences as SaveNoticeInput["audiences"],
    publishedOn: input.publishedOn,
  });

  if (result.ok) {
    revalidatePath("/admin/notices");
  }

  return result;
}

/**
 * Publishes a notice.
 */
export async function publishNoticeAction(
  noticeId: string,
): Promise<ServiceResult<{ id: string; publishedOn: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { publishNotice } = await import("@/server/services/notices");

  const result = await publishNotice(admin.id, noticeId);

  if (result.ok) {
    revalidatePath("/admin/notices");
  }

  return result;
}

/**
 * Takes a published notice back to a draft.
 */
export async function unpublishNoticeAction(
  noticeId: string,
): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { unpublishNotice } = await import("@/server/services/notices");

  const result = await unpublishNotice(admin.id, noticeId);

  if (result.ok) {
    revalidatePath("/admin/notices");
  }

  return result;
}

/**
 * Removes a notice.
 */
export async function deleteNoticeAction(
  noticeId: string,
): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { deleteNotice } = await import("@/server/services/notices");

  const result = await deleteNotice(admin.id, noticeId);

  if (result.ok) {
    revalidatePath("/admin/notices");
  }

  return result;
}

/**
 * Attaches uploaded files to a notice.
 */
export async function attachFilesAction(input: {
  noticeId: string;
  files: { name: string; base64: string }[];
}): Promise<ServiceResult<{ attached: number }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { attachFiles } = await import("@/server/services/notices");

  const result = await attachFiles(admin.id, input);

  if (result.ok) {
    revalidatePath("/admin/notices");
  }

  return result;
}

/**
 * Removes an attachment from a notice.
 */
export async function removeAttachmentAction(
  attachmentId: string,
): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { removeAttachment } = await import("@/server/services/notices");

  const result = await removeAttachment(admin.id, attachmentId);

  if (result.ok) {
    revalidatePath("/admin/notices");
  }

  return result;
}

/* ------------------------------------------------------------- gallery --- */

/**
 * Reads the albums of the school.
 */
export async function listAlbumsAction(input: {
  query?: string;
  category?: string;
}): Promise<ServiceResult<AlbumList>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { listAlbums } = await import("@/server/services/gallery");

  return listAlbums(input);
}

/**
 * Reads the photographs waiting for the admin.
 */
export async function listPendingPhotosAction(): Promise<
  ServiceResult<PhotoReviewRow[]>
> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { listPendingPhotos } = await import("@/server/services/gallery");

  return listPendingPhotos();
}

/**
 * Creates an album or renames an existing one.
 */
export async function saveAlbumAction(input: {
  id?: string;
  title: string;
  category?: string;
  visibility?: string;
}): Promise<ServiceResult<{ id: string; title: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { saveAlbum } = await import("@/server/services/gallery");

  const result = await saveAlbum(admin.id, {
    id: input.id,
    title: input.title,
    category: input.category as SaveAlbumInput["category"],
    visibility: (input.visibility ?? "PUBLIC") as "PUBLIC" | "TEACHERS",
  });

  if (result.ok) {
    revalidatePath("/admin/gallery");
  }

  return result;
}

/**
 * Removes an album that holds no photographs.
 */
export async function deleteAlbumAction(
  albumId: string,
): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { deleteAlbum } = await import("@/server/services/gallery");

  const result = await deleteAlbum(admin.id, albumId);

  if (result.ok) {
    revalidatePath("/admin/gallery");
  }

  return result;
}

/**
 * Approves a photograph.
 */
export async function approvePhotoAction(
  photoId: string,
): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { approvePhoto } = await import("@/server/services/gallery");

  const result = await approvePhoto(admin.id, photoId);

  if (result.ok) {
    revalidatePath("/admin/gallery");
  }

  return result;
}

/**
 * Sends a photograph back to the teacher who uploaded it.
 */
export async function rejectPhotoAction(
  photoId: string,
  reason?: string,
): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { rejectPhoto } = await import("@/server/services/gallery");

  const result = await rejectPhoto(admin.id, photoId, reason);

  if (result.ok) {
    revalidatePath("/admin/gallery");
  }

  return result;
}

/**
 * Removes a photograph from an album.
 */
export async function deletePhotoAction(
  photoId: string,
): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { deletePhoto } = await import("@/server/services/gallery");

  const result = await deletePhoto(admin.id, photoId);

  if (result.ok) {
    revalidatePath("/admin/gallery");
  }

  return result;
}

/**
 * Uploads photographs into an album.
 *
 * The photographs an admin uploads are approved straight away, because the
 * admin is the one who decides what the school publishes.
 */
export async function uploadPhotosAction(input: {
  albumId: string;
  files: { name: string; base64: string }[];
}): Promise<ServiceResult<{ uploaded: number }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { uploadPhotos } = await import("@/server/services/gallery");

  const result = await uploadPhotos(admin.id, input);

  if (result.ok) {
    revalidatePath("/admin/gallery");
  }

  return result;
}

/* ------------------------------------------------------------- routine --- */

/**
 * Reads the classes the admin can pick for a routine.
 */
export async function listRoutineClassesAction(): Promise<
  ServiceResult<RoutineClassOption[]>
> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { listRoutineClasses } = await import("@/server/services/routine");

  return listRoutineClasses();
}

/**
 * Reads the timetable of a class.
 */
export async function getRoutineAction(
  classId: string,
): Promise<ServiceResult<RoutineSheet>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { getRoutine } = await import("@/server/services/routine");

  return getRoutine(classId);
}

/**
 * Saves the timetable of a class.
 */
export async function saveRoutineAction(input: {
  classId: string;
  effectiveFrom: string;
  periods: {
    day: number;
    period: number;
    subjectId?: string;
    teacherId?: string;
  }[];
}): Promise<ServiceResult<{ id: string; published: boolean }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { saveRoutine } = await import("@/server/services/routine");

  const result = await saveRoutine(admin.id, input);

  if (result.ok) {
    revalidatePath("/admin/routine");
  }

  return result;
}

/**
 * Publishes the timetable of a class.
 */
export async function publishRoutineAction(
  classId: string,
): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { publishRoutine } = await import("@/server/services/routine");

  const result = await publishRoutine(admin.id, classId);

  if (result.ok) {
    revalidatePath("/admin/routine");
  }

  return result;
}

/* ------------------------------------------------------------ calendar --- */

/**
 * Reads the entries of the calendar.
 */
export async function listCalendarEventsAction(input: {
  query?: string;
  type?: string;
  month?: string;
  page?: number;
  pageSize?: number;
}): Promise<ServiceResult<CalendarEventList>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { listCalendarEvents } = await import("@/server/services/calendar");

  return listCalendarEvents({
    query: input.query,
    type: input.type as ListCalendarEventsInput["type"],
    month: input.month,
    page: input.page,
    pageSize: input.pageSize,
  });
}

/**
 * Creates a calendar event or edits an existing one.
 */
export async function saveCalendarEventAction(input: {
  id?: string;
  title: string;
  date: string;
  endDate?: string;
  type: string;
  audience?: string;
}): Promise<ServiceResult<{ id: string; title: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { saveCalendarEvent } = await import("@/server/services/calendar");

  const result = await saveCalendarEvent(admin.id, {
    ...input,
    type: input.type as "EXAM" | "HOLIDAY" | "EVENT",
  });

  if (result.ok) {
    revalidatePath("/admin/calendar");
  }

  return result;
}

/**
 * Removes a calendar event.
 */
export async function deleteCalendarEventAction(
  eventId: string,
): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { deleteCalendarEvent } = await import("@/server/services/calendar");

  const result = await deleteCalendarEvent(admin.id, eventId);

  if (result.ok) {
    revalidatePath("/admin/calendar");
  }

  return result;
}

/* ----------------------------------------------------------------- fees --- */

/**
 * Reads the fees of the school.
 *
 * The summary, the fee structure and the payments table all come from the
 * database, so the count in the footer is the number of lines that really
 * match the filters.
 */
export async function listFeesAction(input: {
  query?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<ServiceResult<FeesData>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { getFeesData } = await import("@/server/services/fees");

  return {
    ok: true,
    data: await getFeesData({
      query: input.query,
      status: input.status as ListPaymentsInput["status"],
      page: input.page,
      pageSize: input.pageSize,
    }),
  };
}

/**
 * Edits the fee structure of a class.
 */
export async function saveFeeStructureAction(input: {
  id: string;
  monthlyTuitionPoisha: number;
  admissionFeePoisha: number;
  activitiesPoisha: number;
  dueDate: string;
}): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { saveFeeStructure } = await import("@/server/services/fees");

  const result = await saveFeeStructure(admin.id, input);

  if (result.ok) {
    revalidatePath("/admin/fees");
  }

  return result;
}

/**
 * Issues the fees of a billing slot to the students of a class.
 *
 * The issue is idempotent: a student holds one line per slot and per line, so
 * running it twice writes nothing the second time.
 */
export async function issueFeesAction(input: {
  classId: string;
  period: string;
  lines: string[];
}): Promise<ServiceResult<{ issued: number }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { issueFees } = await import("@/server/services/fees");

  const result = await issueFees(admin.id, {
    classId: input.classId,
    period: input.period,
    lines: input.lines as IssueFeesInput["lines"],
  });

  if (result.ok) {
    revalidatePath("/admin/fees");
  }

  return result;
}

/**
 * Records a payment the admin took at the desk.
 */
export async function recordPaymentAction(input: {
  feeIds: string[];
  method: string;
  transactionId?: string;
  cardLast4?: string;
  amountPoisha: number;
  paidOn: string;
}): Promise<ServiceResult<{ receiptNo: string; amountPoisha: number }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { recordPayment } = await import("@/server/services/fees");

  const result = await recordPayment(admin.id, {
    ...input,
    method: input.method as PaymentMethod,
  });

  if (result.ok) {
    revalidatePath("/admin/fees");
  }

  return result;
}

/**
 * The CSV of the payments that match the filters.
 */
export async function exportFeesAction(input: {
  query?: string;
  status?: string;
}): Promise<ServiceResult<{ csv: string; fileName: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { exportFeesCsv } = await import("@/server/services/fees");

  return exportFeesCsv({
    query: input.query,
    status: input.status as ListPaymentsInput["status"],
  });
}

/**
 * Approves a payment a student submitted.
 *
 * The receipt is written and the fee lines are marked as paid, so the fees
 * table and the receipt agree the moment the admin approves the payment.
 */
export async function approvePaymentAction(
  paymentId: string,
): Promise<ServiceResult<{ receiptNo: string; amountPoisha: number }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { approvePayment } = await import("@/server/services/fees");

  const result = await approvePayment(admin.id, paymentId);

  if (result.ok) {
    revalidatePath("/admin/fees");
  }

  return result;
}

/**
 * Rejects a payment a student submitted.
 *
 * The admin has to say why, so the student knows what to do next.
 */
export async function rejectPaymentAction(input: {
  paymentId: string;
  reason: string;
}): Promise<ServiceResult<{ id: string }>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { rejectPayment } = await import("@/server/services/fees");

  const parsed = rejectPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That reason is not valid",
    };
  }

  const result = await rejectPayment(
    admin.id,
    parsed.data.paymentId,
    parsed.data.reason,
  );

  if (result.ok) {
    revalidatePath("/admin/fees");
  }

  return result;
}

/* ------------------------------------------------------------- audit log --- */

/**
 * Reads the audit log of the school.
 */
export async function listAuditLogAction(input: {
  query?: string;
  actionType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<ServiceResult<AuditList>> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { listAuditLog } = await import("@/server/services/audit-log");

  return {
    ok: true,
    data: await listAuditLog({
      query: input.query,
      actionType: input.actionType as ListAuditLogInput["actionType"],
      from: input.from,
      to: input.to,
      page: input.page,
      pageSize: input.pageSize,
    }),
  };
}

/* ------------------------------------------------------------- dashboard --- */

/**
 * Reads everything the admin dashboard shows.
 */
export async function listDashboardAction(): Promise<
  ServiceResult<DashboardData>
> {
  const admin = await currentAdmin();

  if (!admin) return refuse();

  const { getDashboardData } = await import("@/server/services/dashboard");

  return { ok: true, data: await getDashboardData() };
}
