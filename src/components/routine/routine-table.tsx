"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FilterField } from "@/components/shared/filter-field";
import {
  routineClasses,
  routineDefaultClass,
  routineDefaultSection,
  routineEffectiveFrom,
  routineNote,
  routineSections,
  routineTimetable,
  type RoutineClass,
  type RoutineSection,
} from "@/data/routine";

/**
 * Weekly routine with class and section filters.
 * Figma "Public / Routine" (light 2:2834 / 2:2961 / 2:3082 and the matching
 * dark frames).
 *
 * Desktop (2:2834): the two filter dropdowns sit side by side (each 632px),
 * the effective-date line follows at 8px below, the timetable table shows a
 * day column plus the eight periods, and the footnote and download button
 * close the block.
 * Tablet (2:2961): the same layout with a narrower table.
 * Mobile (2:3082): the filters stack and the table becomes stacked records.
 */
export function RoutineTable() {
  const [selectedClass, setSelectedClass] =
    React.useState<RoutineClass>(routineDefaultClass);
  const [selectedSection, setSelectedSection] =
    React.useState<RoutineSection>(routineDefaultSection);

  const days = routineTimetable[selectedClass];

  return (
    <div className="flex w-full flex-col items-start">
      {/* Filters. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row">
        <FilterField
          label="Class"
          options={routineClasses}
          value={selectedClass}
          onValueChange={(value) => setSelectedClass(value as RoutineClass)}
          className="md:w-[calc((100%_-_16px)/2)]"
        />

        <FilterField
          label="Section"
          options={routineSections}
          value={selectedSection}
          onValueChange={(value) =>
            setSelectedSection(value as RoutineSection)
          }
          className="md:w-[calc((100%_-_16px)/2)]"
        />
      </div>

      <p className="mt-8 text-body leading-[1.45] text-muted">
        {selectedClass} • {selectedSection} • Effective {routineEffectiveFrom}
      </p>

      {/* Timetable. */}
      <div className="mt-8 w-full overflow-x-auto rounded-[12px] border border-border bg-surface p-6 md:overflow-visible">
        <table className="hidden w-full table-fixed border-separate border-spacing-0 text-left md:table">
          <caption className="sr-only">
            Weekly routine for {selectedClass} {selectedSection}
          </caption>
          <colgroup>
            <col className="w-[calc((100%_-_12px)/9)]" />
            {days[0].periods.map((period) => (
              <col key={period.period} className="w-[calc((100%_-_12px)/9)]" />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
              >
                Day
              </th>
              {days[0].periods.map((period) => (
                <th
                  key={period.period}
                  scope="col"
                  className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
                >
                  {period.period} · {period.time}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.day}>
                <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                  {day.day}
                </td>
                {day.periods.map((period) => (
                  <td
                    key={period.period}
                    className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink"
                  >
                    {period.subject}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile — each day becomes a stacked record with a divider. */}
        <ul className="flex w-full flex-col md:hidden">
          {days.map((day) => (
            <li
              key={day.day}
              className="w-full border-t-[16px] border-transparent first:border-t-0"
            >
              <p className="text-body leading-[23px] text-ink">
                Day:&nbsp;&nbsp;{day.day}
              </p>
              {day.periods.map((period) => (
                <p
                  key={period.period}
                  className="mt-2 text-caption leading-[19px] text-ink"
                >
                  {period.period} · {period.time}:&nbsp;&nbsp;{period.subject}
                </p>
              ))}
              <div aria-hidden className="mt-[9px] h-px w-full bg-border" />
            </li>
          ))}
        </ul>

        <p className="mt-4 w-full text-caption leading-[1.45] text-muted md:mt-0">
          Showing 1–{days.length}
          &nbsp;&nbsp;•&nbsp;&nbsp;Page 1 of 1&nbsp;&nbsp;&nbsp;&nbsp;‹&nbsp;&nbsp;1&nbsp;&nbsp;›
        </p>
      </div>

      <p className="mt-8 text-caption leading-[1.45] text-muted">{routineNote}</p>

      <Button type="button" className="mt-8">
        <Download aria-hidden className="size-4" />
        Download routine
      </Button>
    </div>
  );
}
