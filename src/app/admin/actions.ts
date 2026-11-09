"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
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

/**
 * The admin actions.
 *
 * Every action checks the session and the role before it touches anything,
 * and every input is validated on the server.
 */

/**
 * The admin behind the session.
 *
 * It returns null when nobody is signed in or when the account is not an
 * admin, so an action can refuse without throwing.
 */
async function currentAdmin(): Promise<{ id: string } | null> {
  const session = await auth();

  if (!session?.user?.id) return null;
  if (session.user.role !== "ADMIN") return null;

  return { id: session.user.id };
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
