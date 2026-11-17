import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth-guard";

/**
 * The signed-in teacher.
 *
 * The teacher is worked out from the session on the server and never from an
 * id the browser sends, so a teacher cannot act on another teacher's class by
 * guessing an id or by changing a query parameter.
 */

/** The teacher row the session belongs to. */
export interface TeacherIdentity {
  /** The id of the teacher row. */
  id: string;
  /** The id of the account the teacher signs in with. */
  userId: string;
  /** The name of the teacher. */
  name: string;
  /** The department the teacher belongs to. */
  department: string;
  /** The subject the teacher teaches. */
  subject: string;
  /** The portrait of the teacher. */
  photoUrl: string | null;
}

/**
 * The teacher behind the session, or null when there is nobody signed in.
 *
 * The session is not trusted on its own: the account row is read again and
 * the session version is compared with it, so a deactivated account or a
 * session a password change has superseded is refused straight away.
 */
export async function currentTeacher(): Promise<TeacherIdentity | null> {
  const user = await getCurrentUser();

  if (!user) return null;
  if (user.role !== "TEACHER") return null;
  if (user.mustChangePassword) return null;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      userId: true,
      department: true,
      subject: true,
      photoUrl: true,
      user: { select: { name: true } },
    },
  });

  if (!teacher) return null;

  return {
    id: teacher.id,
    userId: teacher.userId,
    name: teacher.user.name,
    department: teacher.department ?? "School",
    subject: teacher.subject ?? "",
    photoUrl: teacher.photoUrl,
  };
}

/**
 * The teacher behind the session, or a refusal.
 *
 * Every teacher service starts with this, so a service can never read a
 * record without knowing whose record it is allowed to read.
 */
export async function requireTeacher(): Promise<
  { ok: true; data: TeacherIdentity } | { ok: false; error: string }
> {
  const teacher = await currentTeacher();

  if (!teacher) {
    return { ok: false, error: "You are not allowed to do that" };
  }

  return { ok: true, data: teacher };
}

/**
 * The line under the heading of every teacher page.
 *
 * It names the department of the teacher and the day the page is read, so the
 * line is never a fixed date.
 */
export function teacherContextLine(
  teacher: TeacherIdentity,
  now = new Date(),
): string {
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(now);

  return `${teacher.department}  /  ${today}`;
}
