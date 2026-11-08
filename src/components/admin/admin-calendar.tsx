"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import {
  AdminDateField,
  AdminSelectField,
} from "@/components/admin/admin-fields";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTextField } from "@/components/admin/admin-text-field";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { PortalTable } from "@/components/shared/portal-table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminGreeting } from "@/data/admin";
import {
  ADMIN_CALENDAR_EVENT_TYPES,
  ADMIN_CALENDAR_FILTER_TYPES,
  ADMIN_CALENDAR_MONTHS,
  adminCalendarRows,
  type AdminCalendarRow,
} from "@/data/admin-11b";

/**
 * The admin calendar page.
 *
 * Figma "Admin / Calendar" (2:13191 desktop, 2:13380 tablet, 2:13530 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 76px selection filters,
 *   the 47px "Add calendar event" action, the 368px events table, the 35px
 *   "Event details" heading, the 76px title field, the 76px date filters, the
 *   76px event type dropdown and the 47px save action.
 * - Tablet (768): the same rhythm; the event names wrap onto two lines, so the
 *   table is 408px tall.
 * - Mobile (375): 24px padding, a 111px heading, a 168px filter block, the
 *   47px action, a 549px table, the 35px heading, the 76px title field, a 168px
 *   date block, the 76px event type and the 47px save action.
 *
 * Everything happens in memory: the events and the edited event are held in
 * the page state.
 */
export function AdminCalendar() {
  const { toast } = useToast();

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Calendar");

  const [events, setEvents] = React.useState<readonly AdminCalendarRow[]>(
    adminCalendarRows,
  );
  const [month, setMonth] = React.useState<string>(ADMIN_CALENDAR_MONTHS[0]);
  const [typeFilter, setTypeFilter] = React.useState<string>(
    ADMIN_CALENDAR_FILTER_TYPES[0],
  );
  const [title, setTitle] = React.useState("Annual science fair");
  const [eventType, setEventType] = React.useState<string>(
    ADMIN_CALENDAR_EVENT_TYPES[0],
  );
  const [startDate, setStartDate] = React.useState("2026-11-12");
  const [endDate, setEndDate] = React.useState("2026-11-12");

  const filtered = React.useMemo(() => {
    if (typeFilter === ADMIN_CALENDAR_FILTER_TYPES[0]) return events;
    return events.filter((event) => event.type === typeFilter);
  }, [events, typeFilter]);

  const saveEvent = () => {
    const label = title.trim() || "Untitled event";

    setEvents((previous) => [
      ...previous,
      {
        id: `calendar-${previous.length + 1}`,
        date: startDate,
        dateLabel: shortDate(startDate),
        title: label,
        type: eventType as AdminCalendarRow["type"],
        audience: "Everyone",
      },
    ]);

    toast({
      title: "Event saved",
      description: `“${label}” was added to the school calendar.`,
    });
  };

  // "Add calendar event" clears the editor so a new entry can be written.
  const startNewEvent = () => {
    setTitle("");
    setEventType(ADMIN_CALENDAR_EVENT_TYPES[0]);
    setStartDate(firstDayOf(month));
    setEndDate(firstDayOf(month));
  };

  const columns = [
    { header: "Date", cell: (row: AdminCalendarRow) => row.dateLabel },
    { header: "Event", cell: (row: AdminCalendarRow) => row.title },
    { header: "Type", cell: (row: AdminCalendarRow) => typeLabel(row.type) },
    { header: "Audience", cell: (row: AdminCalendarRow) => row.audience },
  ];

  const mobileRecords = filtered.map((row) => ({
    id: row.id,
    lines: [
      { label: "Date", value: row.dateLabel },
      { label: "Event", value: row.title },
      { label: "Type", value: typeLabel(row.type) },
      { label: "Audience", value: row.audience },
    ],
  }));

  // Opening a row copies the event into the editor below.
  const openEvent = (row: AdminCalendarRow) => {
    setTitle(row.title);
    setEventType(row.type);
    setStartDate(row.date);
    setEndDate(row.date);
  };

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader title="Calendar" description={adminGreeting.context} />

      {/* The selection filters. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-end md:gap-4">
        <AdminSelectField
          label="Month"
          options={ADMIN_CALENDAR_MONTHS}
          value={month}
          onValueChange={(value) => {
            setMonth(value);
            setStartDate(firstDayOf(value));
            setEndDate(firstDayOf(value));
          }}
          className="md:w-[344px] md:shrink-0 xl:w-[560px]"
        />

        <AdminSelectField
          label="Type"
          options={ADMIN_CALENDAR_FILTER_TYPES}
          value={typeFilter}
          onValueChange={setTypeFilter}
          className="md:w-[344px] md:shrink-0 xl:w-[560px]"
        />
      </div>

      <Button
        type="button"
        className="h-[47px] w-[199px] shrink-0"
        onClick={startNewEvent}
      >
        <Plus aria-hidden className="size-4" />
        Add calendar event
      </Button>

      <PortalTable
        caption="Calendar events"
        columns={columns}
        rows={filtered}
        mobileRecords={mobileRecords}
        mobileRecordSize="uniform"
        onRowClick={openEvent}
      />

      {/* The event details. */}
      <h3 className="text-title font-bold leading-[1.45] text-ink">
        Event details
      </h3>

      <AdminTextField
        label="Event title"
        value={title}
        onValueChange={setTitle}
      />

      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-end md:gap-4">
        <AdminDateField
          label="Start date"
          value={startDate}
          onValueChange={setStartDate}
          className="md:w-[344px] md:shrink-0 xl:w-[560px]"
        />

        <AdminDateField
          label="End date"
          value={endDate}
          onValueChange={setEndDate}
          className="md:w-[344px] md:shrink-0 xl:w-[560px]"
        />
      </div>

      <AdminSelectField
        label="Event type"
        options={ADMIN_CALENDAR_EVENT_TYPES}
        value={eventType}
        onValueChange={setEventType}
        className="md:w-[420px]"
      />

      <Button
        type="button"
        className="h-[47px] w-[134px] shrink-0"
        onClick={saveEvent}
      >
        Save event
      </Button>
    </div>
  );
}

/** The label the table shows for an event type, as Figma writes it. */
function typeLabel(type: AdminCalendarRow["type"]): string {
  return type === "School event" ? "Event" : type;
}

/** The months a filter entry can name, in calendar order. */
const MONTH_INDEX: Record<string, number> = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

/** The first day of a month filter entry, ISO (`yyyy-mm-dd`). */
function firstDayOf(month: string): string {
  const [name, year] = month.split(" ");
  const index = MONTH_INDEX[name] ?? 0;

  return `${year}-${String(index + 1).padStart(2, "0")}-01`;
}

/** Formats an ISO date the way the Figma frames show it. */
function shortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
