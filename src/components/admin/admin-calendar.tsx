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
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { PortalTable } from "@/components/shared/portal-table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminGreeting } from "@/data/admin";
import {
  listCalendarEventsAction,
  saveCalendarEventAction,
} from "@/app/admin/actions";
import type {
  AdminCalendarEventList,
  AdminCalendarEventRow,
} from "@/types/admin-11b";

/** The kinds of calendar entry the admin can create. */
const EVENT_TYPES = ["EVENT", "EXAM", "HOLIDAY"] as const;

/** The names the event types are shown under, as Figma writes them. */
const EVENT_TYPE_LABELS: Record<string, string> = {
  EVENT: "School event",
  EXAM: "Exam",
  HOLIDAY: "Holiday",
};

/** The types the calendar filter offers. */
const FILTER_TYPES = [
  "All event types",
  "School event",
  "Exam",
  "Holiday",
] as const;

/** The page size the events table shows. */
const PAGE_SIZE = 20;

export interface AdminCalendarProps {
  /** The events the server read for the first page. */
  initialEvents: AdminCalendarEventList | null;
  /** The months the calendar filter offers, in calendar order. */
  months: readonly string[];
}

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
 * The events are read from the database: the month, the type and the search
 * run on the server, so the count in the footer is the number of events that
 * really match.
 */
export function AdminCalendar({ initialEvents, months }: AdminCalendarProps) {
  const { toast } = useToast();

  const [events, setEvents] = React.useState<readonly AdminCalendarEventRow[]>(
    initialEvents?.rows ?? [],
  );
  const [total, setTotal] = React.useState(initialEvents?.total ?? 0);
  const [month, setMonth] = React.useState<string>(months[0] ?? "");
  const [typeFilter, setTypeFilter] = React.useState<string>(FILTER_TYPES[0]);
  const [page, setPage] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  // The list is read again when the filters change, so the page shows that
  // it is waiting while the new rows are on their way.
  const [loading, setLoading] = React.useState(false);

  // The event the editor holds.
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [eventType, setEventType] = React.useState<string>(EVENT_TYPES[0]);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Calendar");

  /**
   * Reads a page of events from the server.
   */
  const load = React.useCallback(
    async (nextPage: number) => {
      setLoading(true);

      const result = await listCalendarEventsAction({
        type: filterTypeValue(typeFilter),
        month: month ? monthKey(month) : undefined,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setLoading(false);

      if (!result.ok) {
        toast({
          title: "Could not load the calendar",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setEvents(result.data.rows);
      setTotal(result.data.total);
    },
    [typeFilter, month, toast],
  );

  // The list is read again when the filters change.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      void load(0);
    }, 250);

    return () => clearTimeout(timer);
  }, [load]);

  /**
   * Saves the event the editor holds.
   */
  const saveEvent = async () => {
    if (busy) return;

    setBusy(true);

    const result = await saveCalendarEventAction({
      id: editingId ?? undefined,
      title,
      date: startDate,
      endDate: endDate || undefined,
      type: eventType,
      audience: "Everyone",
    });

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Event not saved",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setEditingId(result.data.id);

    await load(page);

    toast({
      title: "Event saved",
      description: `“${result.data.title}” was added to the school calendar.`,
    });
  };

  // "Add calendar event" clears the editor so a new entry can be written.
  const startNewEvent = () => {
    setEditingId(null);
    setTitle("");
    setEventType(EVENT_TYPES[0]);
    setStartDate(firstDayOf(month));
    setEndDate(firstDayOf(month));
  };

  const columns = [
    { header: "Date", cell: (row: AdminCalendarEventRow) => row.dateLabel },
    { header: "Event", cell: (row: AdminCalendarEventRow) => row.title },
    {
      header: "Type",
      cell: (row: AdminCalendarEventRow) =>
        EVENT_TYPE_LABELS[row.type] ?? row.type,
    },
    { header: "Audience", cell: (row: AdminCalendarEventRow) => row.audience },
  ];

  const mobileRecords = events.map((row) => ({
    id: row.id,
    lines: [
      { label: "Date", value: row.dateLabel },
      { label: "Event", value: row.title },
      { label: "Type", value: EVENT_TYPE_LABELS[row.type] ?? row.type },
      { label: "Audience", value: row.audience },
    ],
  }));

  const firstRecord = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastRecord = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader title="Calendar" description={adminGreeting.context} />

      {/* The selection filters. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-end md:gap-4">
        <AdminSelectField
          label="Month"
          options={months}
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
          options={FILTER_TYPES}
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
        rows={events}
        mobileRecords={mobileRecords}
        mobileRecordSize="uniform"
        onRowClick={(row) => {
          setEditingId(row.id);
          setTitle(row.title);
          setEventType(row.type);
          setStartDate(row.date);
          setEndDate(row.endDate ?? row.date);
        }}
        footer={
          <p className="mt-4 text-caption leading-[1.45] text-muted">
            Showing {firstRecord}–{lastRecord} of{" "}
            {total.toLocaleString("en-US")} events
            &nbsp;&nbsp;•&nbsp;&nbsp;‹&nbsp;&nbsp;1&nbsp;&nbsp;›
          </p>
        }
      />

      {/* The list is empty: the panel says so instead of leaving a bare table
          behind. */}
      {events.length === 0 && !loading ? (
        <EmptyState
          message="No calendar events"
          title="Exams, holidays and school events will appear here."
        />
      ) : null}

      {/* The list is on its way: the panel holds the rhythm Figma draws while
          the rows are loaded. */}
      {loading ? (
        <LoadingSkeleton
          message="Loading the calendar"
          title="Fetching the events…"
        />
      ) : null}

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
        options={[...EVENT_TYPES].map(
          (value) => EVENT_TYPE_LABELS[value] ?? value,
        )}
        value={EVENT_TYPE_LABELS[eventType] ?? eventType}
        onValueChange={(value) => {
          const entry = EVENT_TYPES.find(
            (option) => EVENT_TYPE_LABELS[option] === value,
          );

          if (entry) setEventType(entry);
        }}
        className="md:w-[420px]"
      />

      <Button
        type="button"
        className="h-[47px] w-[134px] shrink-0"
        disabled={busy}
        onClick={() => void saveEvent()}
      >
        Save event
      </Button>
    </div>
  );
}

/** The months of the year, in calendar order. */
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

/**
 * The key a month filter entry is looked up by, e.g. "2026-11".
 */
function monthKey(month: string): string {
  const [name, year] = month.split(" ");
  const index = MONTH_INDEX[name] ?? 0;

  return `${year}-${String(index + 1).padStart(2, "0")}`;
}

/** The first day of a month filter entry, ISO (`yyyy-mm-dd`). */
function firstDayOf(month: string): string {
  const [name, year] = month.split(" ");
  const index = MONTH_INDEX[name] ?? 0;

  return `${year}-${String(index + 1).padStart(2, "0")}-01`;
}

/**
 * The value a filter entry is looked up by in the service.
 */
function filterTypeValue(label: string): string {
  if (label === "All event types") return "ALL";

  const entry = EVENT_TYPES.find(
    (option) => EVENT_TYPE_LABELS[option] === label,
  );

  return entry ?? "ALL";
}
