import { unstable_cache } from "next/cache";

import { prisma } from "@/server/db";
import { CACHE_TAGS } from "@/server/cache-tags";
import type {
  PublicCalendarEvent,
  PublicCalendarMonth,
} from "@/types/public";

/**
 * The academic calendar an anonymous visitor may read.
 *
 * Only the entries the school addresses to everybody are public: an entry
 * carries a free-text audience ("Everyone", "Students, Teachers"), so the
 * rule is a match on the word "Everyone" — or an entry that names nobody.
 */

/** How long a cached read may serve before it is read again. */
const REVALIDATE_SECONDS = 300;

/** The condition that picks the entries the public may read. */
function publicCalendarWhere() {
  return {
    OR: [
      { audience: null },
      { audience: { contains: "Everyone", mode: "insensitive" as const } },
    ],
  };
}

/** The kind of an entry, as the legend colours it. */
function kindOf(type: string): PublicCalendarEvent["kind"] {
  switch (type) {
    case "EXAM":
      return "Exam";
    case "HOLIDAY":
      return "Holiday";
    default:
      return "School event";
  }
}

/**
 * The public entries of one month, with the cards the page shows under the
 * grid.
 */
/** The uncached month read, exported for the QA checks. */
export async function loadPublicCalendarMonth(
  year: number,
  month: number,
): Promise<PublicCalendarMonth> {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));

  const rows = await prisma.calendarEvent.findMany({
    where: { ...publicCalendarWhere(), date: { gte: from, lt: to } },
    orderBy: { date: "asc" },
    // The allow-list of a calendar entry: the date, the words and the
    // kind. Nothing else leaves the table.
    select: {
      title: true,
      date: true,
      type: true,
      description: true,
    },
  });

  const events: PublicCalendarEvent[] = rows.map((row) => ({
    day: row.date.getUTCDate(),
    year: row.date.getUTCFullYear(),
    month: row.date.getUTCMonth() + 1,
    label: row.title,
    kind: kindOf(row.type),
  }));

  const highlights = rows.slice(0, 3).map((row) => ({
    heading: row.title,
    detail:
      row.description ??
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(row.date),
  }));

  return { year, month, events, highlights };
}

export async function getPublicCalendarMonth(
  year: number,
  month: number,
): Promise<PublicCalendarMonth> {
  const cached = unstable_cache(
    loadPublicCalendarMonth,
    ["public-calendar-month", String(year), String(month)],
    { tags: [CACHE_TAGS.calendar], revalidate: REVALIDATE_SECONDS },
  );

  return cached(year, month);
}
