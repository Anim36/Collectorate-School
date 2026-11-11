import { prisma } from "@/server/db";

/**
 * The line under the heading of every admin page.
 *
 * It names the academic year the school is in and the day it is, so the
 * greeting is never a fixed date.
 */

/**
 * The context line of the admin pages.
 *
 * The academic year comes from the database, so it is the year the school is
 * really in, and the date is the day the page is read.
 */
export async function adminGreetingContext(): Promise<string> {
  const academicYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    orderBy: { startDate: "desc" },
    select: { name: true },
  });

  const now = new Date();

  const today = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return `Academic year ${academicYear?.name ?? "—"}  /  ${today}`;
}
