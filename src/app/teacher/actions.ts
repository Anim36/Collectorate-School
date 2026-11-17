"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/server/auth-guard";
import type { ServiceResult } from "@/server/services/admin-schemas";
import {
  RATE_LIMIT_MESSAGE,
  checkRateLimit,
  rateLimitBucket,
} from "@/server/rate-limit";
import type {
  TeacherAttendanceData,
  TeacherAttendanceMark,
  TeacherAttendanceStatus,
  TeacherGalleryData,
  TeacherNoticeAudience,
  TeacherNoticeList,
  TeacherResultData,
} from "@/types/teacher";

/**
 * The actions of the teacher portal.
 *
 * Every action works the teacher out from the session on the server, so a
 * teacher can never act on another teacher's class by sending an id. The
 * action itself refuses a caller who is not a teacher, so a student, an admin
 * or an anonymous visitor cannot run it.
 */

/**
 * Refuses an action that is not made by a teacher.
 */
function refuse(): { ok: false; error: string } {
  return { ok: false, error: "You are not allowed to do that" };
}

/**
 * The teacher behind the session, or null.
 *
 * The row is read again from the database on every call, so an account that
 * has been deactivated, a session a password change has superseded, or an
 * account that still has to replace its temporary password cannot run an
 * action even while its cookie is still in the browser.
 */
async function currentTeacher(): Promise<{ id: string } | null> {
  const user = await getCurrentUser();

  if (!user) return null;
  if (user.role !== "TEACHER") return null;
  if (user.mustChangePassword) return null;

  return { id: user.id };
}

/**
 * Reads the attendance sheet of a class on a day.
 *
 * The class and the day are checked against the classes of the teacher on the
 * server, so a class that is not theirs is refused and never reaches the page.
 */
export async function loadTeacherAttendanceAction(input: {
  classId?: string;
  date?: string;
  historyClassId?: string;
  historyMonth?: string;
}): Promise<ServiceResult<TeacherAttendanceData>> {
  const teacher = await currentTeacher();

  if (!teacher) return refuse();

  const { getTeacherAttendance } = await import(
    "@/server/services/teacher-attendance"
  );

  const data = await getTeacherAttendance({
    classId: input.classId,
    date: input.date,
    historyClassId: input.historyClassId,
    historyMonth: input.historyMonth,
  });

  if (!data) {
    return { ok: false, error: "You are not allowed to do that" };
  }

  return { ok: true, data };
}

/**
 * Saves the attendance of a class on a day.
 *
 * The class and the day are checked against the classes of the teacher on the
 * server, and the marks are counted there as well, so the counters the page
 * shows after a save are the counters the database holds.
 */
export async function saveTeacherAttendanceAction(input: {
  classId: string;
  date: string;
  marks: { studentId: string; status: TeacherAttendanceStatus }[];
}): Promise<
  ServiceResult<{
    present: number;
    absent: number;
    late: number;
    total: number;
  }>
> {
  const teacher = await currentTeacher();

  if (!teacher) return refuse();

  const { saveTeacherAttendance } = await import(
    "@/server/services/teacher-attendance"
  );

  const result = await saveTeacherAttendance({
    classId: input.classId,
    date: input.date,
    marks: input.marks as TeacherAttendanceMark[],
  });

  if (result.ok) {
    revalidatePath("/teacher/attendance");
    revalidatePath("/teacher/dashboard");
  }

  return result;
}

/**
 * Reads the result sheet of an exam, a class and a subject.
 *
 * The three are checked against the allocations of the teacher on the server,
 * so a class or a subject that is not theirs is refused.
 */
export async function loadTeacherResultsAction(input: {
  examId?: string;
  classId?: string;
  subjectId?: string;
}): Promise<ServiceResult<TeacherResultData>> {
  const teacher = await currentTeacher();

  if (!teacher) return refuse();

  const { getTeacherResults } = await import(
    "@/server/services/teacher-results"
  );

  const data = await getTeacherResults(input);

  if (!data) {
    return { ok: false, error: "You are not allowed to do that" };
  }

  return { ok: true, data };
}

/**
 * Works out the grade and the grade point of the marks that are typed.
 *
 * The grade is worked out by the one function on the server, so the table
 * shows the numbers the sheet will store and not a second calculation in the
 * browser. Nothing is written: the marks are only read.
 */
export async function previewTeacherMarksAction(input: {
  examId: string;
  classId: string;
  subjectId: string;
  marks: Record<string, string>;
}): Promise<
  ServiceResult<{
    grades: Record<string, string>;
    gpas: Record<string, string>;
    errors: { rowId: string; studentName: string; message: string }[];
  }>
> {
  const teacher = await currentTeacher();

  if (!teacher) return refuse();

  const { previewTeacherMarks } = await import(
    "@/server/services/teacher-results"
  );

  const result = await previewTeacherMarks(input);

  if (!result.ok) return result;

  return { ok: true, data: result.data };
}

/**
 * Saves a draft of a result sheet.
 */
export async function saveTeacherResultDraftAction(input: {
  examId: string;
  classId: string;
  subjectId: string;
  marks: Record<string, string>;
}): Promise<ServiceResult<{ saved: number }>> {
  const teacher = await currentTeacher();

  if (!teacher) return refuse();

  const { saveTeacherResultDraft } = await import(
    "@/server/services/teacher-results"
  );

  const result = await saveTeacherResultDraft(input);

  if (result.ok) {
    revalidatePath("/teacher/results");
    revalidatePath("/teacher/dashboard");
  }

  return result;
}

/**
 * Publishes a result sheet.
 */
export async function publishTeacherResultAction(input: {
  examId: string;
  classId: string;
  subjectId: string;
  marks: Record<string, string>;
}): Promise<ServiceResult<{ published: number }>> {
  const teacher = await currentTeacher();

  if (!teacher) return refuse();

  const { publishTeacherResult } = await import(
    "@/server/services/teacher-results"
  );

  const result = await publishTeacherResult(input);

  if (result.ok) {
    revalidatePath("/teacher/results");
    revalidatePath("/teacher/dashboard");
  }

  return result;
}

/**
 * Re-opens a published sheet as a draft.
 */
export async function reopenTeacherResultAction(input: {
  examId: string;
  classId: string;
  subjectId: string;
}): Promise<ServiceResult<{ id: string }>> {
  const teacher = await currentTeacher();

  if (!teacher) return refuse();

  const { reopenTeacherResult } = await import(
    "@/server/services/teacher-results"
  );

  const result = await reopenTeacherResult(input);

  if (result.ok) {
    revalidatePath("/teacher/results");
    revalidatePath("/teacher/dashboard");
  }

  return result;
}

/**
 * Reads the notice board of the teacher.
 *
 * The filters and the page are read on the server, so the count under the
 * table is the number of notices that really match.
 */
export async function listTeacherNoticesAction(input: {
  query?: string;
  audience?: TeacherNoticeAudience;
  page?: number;
  pageSize?: number;
}): Promise<ServiceResult<TeacherNoticeList>> {
  const teacher = await currentTeacher();

  if (!teacher) return refuse();

  const { getTeacherNotices } = await import(
    "@/server/services/teacher-content"
  );

  const board = await getTeacherNotices(input);

  return { ok: true, data: board };
}

/**
 * Reads the gallery of the teacher.
 *
 * The album is only a request: the server reads the albums of the school and
 * the photographs of the teacher, so nothing is read that is not theirs.
 */
export async function loadTeacherGalleryAction(input: {
  albumId?: string;
}): Promise<ServiceResult<TeacherGalleryData>> {
  const teacher = await currentTeacher();

  if (!teacher) return refuse();

  const { getTeacherGallery } = await import(
    "@/server/services/teacher-gallery"
  );

  const gallery = await getTeacherGallery(input.albumId);

  if (!gallery) {
    return { ok: false, error: "You are not allowed to do that" };
  }

  return { ok: true, data: gallery };
}

/**
 * Uploads photographs into an album.
 *
 * The photographs wait for the admin, so they are written as pending.
 */
export async function uploadTeacherPhotosAction(input: {
  albumId: string;
  files: { name: string; base64: string }[];
}): Promise<ServiceResult<{ uploaded: number }>> {
  const teacher = await currentTeacher();

  if (!teacher) return refuse();

  const limit = await checkRateLimit("upload", await rateLimitBucket(teacher.id));

  if (!limit.allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const { uploadTeacherPhotos } = await import(
    "@/server/services/teacher-gallery"
  );

  const result = await uploadTeacherPhotos(input);

  if (result.ok) {
    revalidatePath("/teacher/gallery");
  }

  return result;
}
