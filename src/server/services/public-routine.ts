import { unstable_cache } from "next/cache";

import { prisma } from "@/server/db";
import { CACHE_TAGS } from "@/server/cache-tags";
import type {
  PublicRoutine,
  PublicRoutineClass,
} from "@/types/public";

/**
 * The class routine an anonymous visitor may read.
 *
 * Only a published routine is read, and only the school's own twelve
 * classes — Nursery, KG and Class 1 to Class 10 — are offered, each with its
 * one default section. The section never appears here: a class has one
 * group, so the routine belongs to the class alone.
 *
 * The read is an explicit allow-list: the day, the period times and the
 * subject name. The teacher of a period is not public, so the query never
 * selects a teacher, a user or an account.
 */

/** How long a cached read may serve before it is read again. */
const REVALIDATE_SECONDS = 300;

/** The short name of a day of the week, 0 for Sunday. */
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * The classes the routine selector offers, in the order the school teaches
 * them.
 */
/** The uncached classes read, exported for the QA checks. */
export async function loadPublicRoutineClasses(): Promise<
  PublicRoutineClass[]
> {
  const classes = await prisma.class.findMany({
    orderBy: { sortOrder: "asc" },
    // The allow-list of a class: its id and its name.
    select: { id: true, name: true },
  });

  return classes.map((entry) => ({ id: entry.id, name: entry.name }));
}

export async function listPublicRoutineClasses(): Promise<
  PublicRoutineClass[]
> {
  const cached = unstable_cache(
    loadPublicRoutineClasses,
    ["public-routine-classes"],
    { tags: [CACHE_TAGS.routine], revalidate: REVALIDATE_SECONDS },
  );

  return cached();
}

/**
 * The published routine of one class, by id or by name.
 *
 * A class without a published routine — or one that does not exist — is
 * reported the same way, so a selector value cannot probe anything.
 */
/**
 * The uncached routine read, exported for the QA checks.
 */
export async function loadPublicRoutine(
  classIdOrName: string,
): Promise<PublicRoutine | null> {
  const schoolClass = await prisma.class.findFirst({
    where: { OR: [{ id: classIdOrName }, { name: classIdOrName }] },
    select: { id: true, name: true },
  });

  if (!schoolClass) return null;

  const routine = await prisma.routine.findFirst({
    where: {
      classId: schoolClass.id,
      published: true,
      section: { isDefault: true },
    },
    orderBy: { effectiveFrom: "desc" },
    select: {
      effectiveFrom: true,
      periods: {
        orderBy: [{ day: "asc" }, { period: "asc" }],
        // The allow-list of a period: the day, the number, the times and
        // the subject. No teacher, no account, no draft state.
        select: {
          day: true,
          period: true,
          startTime: true,
          endTime: true,
          subject: { select: { name: true } },
        },
      },
    },
  });

  if (!routine || routine.periods.length === 0) return null;

  const byDay = new Map<
    number,
    {
      period: string;
      time: string;
      subject: string;
    }[]
  >();

  for (const period of routine.periods) {
    const entry = {
      period: `P${period.period}`,
      time: period.startTime,
      subject: period.subject?.name ?? "—",
    };

    const existing = byDay.get(period.day);

    if (existing) {
      existing.push(entry);
    } else {
      byDay.set(period.day, [entry]);
    }
  }

  const days = [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, periods]) => ({
      day: DAY_NAMES[day] ?? `Day ${day}`,
      periods,
    }));

  return {
    classId: schoolClass.id,
    className: schoolClass.name,
    effectiveFrom: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(routine.effectiveFrom),
    days,
  };
}

export async function getPublicRoutine(
  classIdOrName: string,
): Promise<PublicRoutine | null> {
  const cached = unstable_cache(
    loadPublicRoutine,
    ["public-routine", classIdOrName],
    { tags: [CACHE_TAGS.routine], revalidate: REVALIDATE_SECONDS },
  );

  return cached(classIdOrName);
}
