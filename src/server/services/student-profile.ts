import { prisma } from "@/server/db";
import { currentStudent } from "@/server/services/student-identity";
import type { StudentProfile } from "@/types/student";

/**
 * The profile of the signed-in student.
 *
 * The row is read for the student the session belongs to, so there is no id
 * the browser could change to reach another student's details.
 */

/**
 * Formats a date of birth the way the profile page writes it,
 * e.g. "15 March 2011".
 */
function formatDateOfBirth(date: Date | null): string {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * The profile of the signed-in student.
 */
export async function getStudentProfile(): Promise<StudentProfile | null> {
  const student = await currentStudent();

  if (!student) return null;

  const row = await prisma.student.findUnique({
    where: { id: student.id },
    select: {
      name: true,
      studentId: true,
      guardianName: true,
      guardianPhone: true,
      phone: true,
      emergencyContact: true,
      email: true,
      address: true,
      photoUrl: true,
      dateOfBirth: true,
      user: { select: { isActive: true } },
    },
  });

  if (!row) return null;

  return {
    name: row.name,
    studentId: row.studentId,
    status: row.user.isActive ? "Active student" : "Inactive student",
    className: student.className,
    roll: String(student.roll),
    dateOfBirth: formatDateOfBirth(row.dateOfBirth),
    guardian: row.guardianName ?? "—",
    guardianPhone: row.guardianPhone ?? row.phone ?? "—",
    email: row.email ?? "—",
    address: row.address ?? "—",
    emergencyContact: row.emergencyContact ?? row.phone ?? "—",
    photo: row.photoUrl ?? "/images/student.jpg",
  };
}
