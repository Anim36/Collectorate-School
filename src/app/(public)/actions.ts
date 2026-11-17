"use server";

import { getPublicNoticeBoard } from "@/server/services/public-notices";
import { getPublicCalendarMonth } from "@/server/services/public-calendar";
import { getPublicRoutine } from "@/server/services/public-routine";

/**
 * The read-only actions of the public pages.
 *
 * These actions are open to an anonymous visitor by design: every service
 * behind them only reads rows that are meant to be public, and none of them
 * takes an id of anything that is not. No session is read and no guard is
 * imported — there is nothing here to guard.
 *
 * Every action is a read. A public page never writes.
 */

/** The filters the notice board sends, straight from its controls. */
export async function listPublicNoticesAction(input: {
  query?: string;
  category?: string;
  from?: string;
  to?: string;
  page?: number;
}): Promise<Awaited<ReturnType<typeof getPublicNoticeBoard>>> {
  return getPublicNoticeBoard(input);
}

/** The events of one month of the academic calendar. */
export async function getPublicCalendarMonthAction(
  year: number,
  month: number,
): Promise<Awaited<ReturnType<typeof getPublicCalendarMonth>>> {
  const safeYear = Math.floor(Number(year));
  const safeMonth = Math.floor(Number(month));

  if (
    !Number.isFinite(safeYear) ||
    safeYear < 2000 ||
    safeYear > 2100 ||
    safeMonth < 1 ||
    safeMonth > 12
  ) {
    const now = new Date();

    return getPublicCalendarMonth(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
    );
  }

  return getPublicCalendarMonth(safeYear, safeMonth);
}

/** The published routine of one class. */
export async function getPublicRoutineAction(
  classIdOrName: string,
): Promise<Awaited<ReturnType<typeof getPublicRoutine>>> {
  const key = String(classIdOrName ?? "").slice(0, 60);

  if (!key) return null;

  return getPublicRoutine(key);
}
