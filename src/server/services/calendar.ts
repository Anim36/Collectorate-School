import { prisma } from "@/server/db";
import {
  listCalendarEventsSchema,
  saveCalendarEventSchema,
  type ListCalendarEventsInput,
  type SaveCalendarEventInput,
  type ServiceResult,
} from "@/server/services/admin-11b-schemas";
import { writeAudit } from "@/server/services/audit";
import type {
  AdminCalendarEventList as CalendarEventList,
  AdminCalendarEventRow as CalendarEventRow,
} from "@/types/admin-11b";

/**
 * The calendar of the school.
 *
 * The admin calendar and the public calendar read the same table, so an event
 * that is added here shows on the public calendar too.
 */

/**
 * The events of the calendar, filtered and counted by the database.
 */
export async function listCalendarEvents(
  raw: Partial<ListCalendarEventsInput> = {},
): Promise<ServiceResult<CalendarEventList>> {
  const parsed = listCalendarEventsSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, error: "Those filters are not valid" };
  }

  const { query, type, month, page, pageSize } = parsed.data;

  const where: Record<string, unknown> = {};

  if (type !== "ALL") where["type"] = type;

  if (month) {
    // The month is worked out from the first and the last day of it, so the
    // filter runs on the database and not in the page.
    const [year, monthNumber] = month.split("-").map(Number);

    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 1));

    where["date"] = { gte: start, lt: end };
  }

  const needle = query ?? "";

  if (needle !== "") {
    where["title"] = { contains: needle, mode: "insensitive" };
  }

  const [total, events] = await Promise.all([
    prisma.calendarEvent.count({ where }),
    prisma.calendarEvent.findMany({
      where,
      orderBy: [{ date: "asc" }, { title: "asc" }],
      skip: page * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        type: true,
        date: true,
        endDate: true,
        audience: true,
      },
    }),
  ]);

  const rows: CalendarEventRow[] = events.map((event) => ({
    id: event.id,
    date: event.date.toISOString().slice(0, 10),
    dateLabel: shortDate(event.date),
    title: event.title,
    type: event.type,
    audience: event.audience ?? "Everyone",
    endDate: event.endDate ? event.endDate.toISOString().slice(0, 10) : null,
  }));

  return {
    ok: true,
    data: {
      rows,
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/**
 * Creates an event or edits an existing one.
 */
export async function saveCalendarEvent(
  actorId: string,
  raw: SaveCalendarEventInput,
): Promise<ServiceResult<{ id: string; title: string }>> {
  const parsed = saveCalendarEventSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "That calendar event is not valid",
    };
  }

  const input = parsed.data;

  const date = new Date(`${input.date}T00:00:00.000Z`);
  const endDate = input.endDate
    ? new Date(`${input.endDate}T00:00:00.000Z`)
    : null;

  try {
    // An event that is saved under an id the database does not hold yet is
    // created under that id, so a caller that asks for an id gets it.
    const existing = input.id
      ? await prisma.calendarEvent.findUnique({
          where: { id: input.id },
          select: { id: true },
        })
      : null;

    if (existing) {
      await prisma.calendarEvent.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          date,
          endDate,
          type: input.type,
          audience: input.audience || "Everyone",
        },
      });

      await writeAudit({
        actorId,
        action: "Calendar event edited",
        entityType: "Calendar event",
        entityId: existing.id,
        metadata: { title: input.title, type: input.type },
      });

      return { ok: true, data: { id: existing.id, title: input.title } };
    }

    const created = await prisma.calendarEvent.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        title: input.title,
        date,
        endDate,
        type: input.type,
        audience: input.audience || "Everyone",
      },
      select: { id: true, title: true },
    });

    await writeAudit({
      actorId,
      action: "Calendar event created",
      entityType: "Calendar event",
      entityId: created.id,
      metadata: { title: created.title, type: input.type },
    });

    return { ok: true, data: created };
  } catch {
    return { ok: false, error: "The calendar event could not be saved" };
  }
}

/**
 * Removes an event from the calendar.
 */
export async function deleteCalendarEvent(
  actorId: string,
  eventId: string,
): Promise<ServiceResult<{ id: string }>> {
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: { id: true, title: true },
  });

  if (!event) {
    return { ok: false, error: "That calendar event does not exist" };
  }

  try {
    await prisma.calendarEvent.delete({ where: { id: eventId } });
  } catch {
    return { ok: false, error: "That calendar event could not be deleted" };
  }

  await writeAudit({
    actorId,
    action: "Calendar event deleted",
    entityType: "Calendar event",
    entityId: eventId,
    metadata: { title: event.title },
  });

  return { ok: true, data: { id: eventId } };
}

/**
 * Formats a date the way the Figma frames show it.
 */
export function shortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
