import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth-guard";

/**
 * The signed-in student.
 *
 * The student is worked out from the session on the server and never from an
 * id the browser sends, so a student cannot read another student's record by
 * guessing an id or by changing a query parameter.
 */

/** The student row the session belongs to. */
export interface StudentIdentity {
  /** The id of the student row. */
  id: string;
  /** The id of the account the student signs in with. */
  userId: string;
  /** Institution-assigned student identifier. */
  studentId: string;
  /** The name of the student. */
  name: string;
  /** The id of the class the student is in. */
  classId: string;
  /** The name of the class, e.g. "Class 9". */
  className: string;
  /** Whether the class is graded on a grade point or on a letter grade only. */
  gradeOnly: boolean;
  /** The roll number of the student inside the class. */
  roll: number;
  /** The id of the academic year the student belongs to. */
  academicYearId: string;
}

/**
 * The student behind the session, or null when there is nobody signed in.
 *
 * The session is not trusted on its own: the account row is read again and
 * the session version is compared with it, so a deactivated account or a
 * session a password change has superseded is refused straight away.
 */
export async function currentStudent(): Promise<StudentIdentity | null> {
  const user = await getCurrentUser();

  if (!user) return null;
  if (user.role !== "STUDENT") return null;
  if (user.mustChangePassword) return null;

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      userId: true,
      studentId: true,
      name: true,
      classId: true,
      roll: true,
      academicYearId: true,
      class: { select: { name: true, gradingMode: true } },
    },
  });

  if (!student) return null;

  return {
    id: student.id,
    userId: student.userId,
    studentId: student.studentId,
    name: student.name,
    classId: student.classId,
    className: student.class.name,
    gradeOnly: student.class.gradingMode === "GRADE_ONLY",
    roll: student.roll,
    academicYearId: student.academicYearId,
  };
}

/**
 * The student behind the session, or a refusal.
 *
 * Every student service starts with this, so a service can never read a
 * record without knowing whose record it is allowed to read.
 */
export async function requireStudent(): Promise<
  { ok: true; data: StudentIdentity } | { ok: false; error: string }
> {
  const student = await currentStudent();

  if (!student) {
    return { ok: false, error: "You are not allowed to do that" };
  }

  return { ok: true, data: student };
}
