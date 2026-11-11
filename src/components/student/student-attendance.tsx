"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendanceCalendar } from "@/components/student/attendance-calendar";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { StudentMetrics } from "@/components/student/student-metrics";
import type {
  StudentAttendanceMonth,
  StudentAttendanceMonthOption,
  StudentAttendanceStatus,
} from "@/types/student";

export interface StudentAttendanceProps {
  /** The months the student has attendance for, newest first. */
  months: readonly StudentAttendanceMonthOption[];
  /** The month the page opens on. */
  initial: StudentAttendanceMonth | null;
}

/**
 * Attendance page body.
 * Figma "Attendance content" (2:4175 desktop, 2:4312 tablet, 2:4468 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px greeting, the 320px month selector,
 *   the 166px metric row, the 549px calendar and the legend.
 * - Tablet (768): 32px padding; the metric row and the calendar keep their
 *   sizes.
 * - Mobile (375): 24px padding, an 88px greeting, the metric row in two
 *   blocks of two and a 405px calendar with 52px week rows.
 *
 * The month is chosen with a link, so the month the calendar shows is read
 * from the database again rather than kept in the browser.
 */
export function StudentAttendance({ months, initial }: StudentAttendanceProps) {
  const router = useRouter();

  const selected =
    initial === null
      ? ""
      : `${initial.year}-${initial.month}`;

  const statuses = React.useMemo(() => {
    const map = new Map<number, StudentAttendanceStatus>();
    initial?.days.forEach((day) => map.set(day.day, day.status));
    return map;
  }, [initial]);

  const summary = React.useMemo(
    () =>
      initial?.summary ?? {
        present: 0,
        absent: 0,
        late: 0,
        attended: 0,
        schoolDays: 0,
        rate: "0.0%",
      },
    [initial],
  );

  const metrics = [
    { label: "Present", value: String(summary.present), hint: "School days" },
    { label: "Absent", value: String(summary.absent), hint: "School day" },
    { label: "Late", value: String(summary.late), hint: "School day" },
    {
      label: "Attendance",
      value: summary.rate,
      hint: `${summary.attended} of ${summary.schoolDays} days attended`,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <StudentPageHeader
        title="Attendance"
        description="Your school life, clearly organised."
      />

      {/* Month selector. */}
      <div className="flex w-full flex-col items-start">
        <label
          htmlFor="attendance-month"
          className="text-caption font-medium leading-[1.45] text-muted"
        >
          Month
        </label>

        <Select
          value={selected}
          onValueChange={(value) =>
            router.push(`/student/attendance?month=${value}`)
          }
        >
          <SelectTrigger
            id="attendance-month"
            aria-label="Month"
            className="mt-2 h-[49px] w-full max-w-[320px] items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
          >
            <SelectValue placeholder="Choose a month" />
            <ChevronDown aria-hidden className="size-4 shrink-0 text-muted" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem
                key={`${month.year}-${month.month}`}
                value={`${month.year}-${month.month}`}
              >
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary counts. */}
      <StudentMetrics metrics={metrics} />

      {initial ? (
        <AttendanceCalendar
          year={initial.year}
          month={initial.month}
          statuses={statuses}
        />
      ) : (
        <p className="text-body leading-[1.45] text-muted">
          No attendance has been recorded for you yet.
        </p>
      )}

      {/* Legend. */}
      <p className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-caption leading-[1.45] text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="font-semibold text-success">
            P
          </span>
          Present
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="font-semibold text-danger">
            A
          </span>
          Absent
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="font-semibold text-warning">
            L
          </span>
          Late
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden>—</span>
          Weekly holiday
        </span>
      </p>
    </div>
  );
}
