"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { AdminSelectField } from "@/components/admin/admin-fields";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTableFooter } from "@/components/admin/admin-table-footer";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { adminGreeting } from "@/data/admin";
import {
  ADMIN_ROUTINE_CLASSES,
  ADMIN_ROUTINE_DAYS,
  ADMIN_ROUTINE_NOTE,
  ADMIN_ROUTINE_PERIOD_TIMES,
  ADMIN_ROUTINE_SECTIONS,
  ADMIN_ROUTINE_SUBJECTS,
  adminRoutine,
  type AdminRoutineDay,
} from "@/data/admin-11b";

/**
 * The admin routine page.
 *
 * Figma "Admin / Routine" (2:12718 desktop, 2:12906 tablet, 2:13055 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 76px selection filters,
 *   the 428px timetable table, the 19px note, the 76px selected-period field
 *   and the 49px routine actions.
 * - Tablet (768): the same rhythm.
 * - Mobile (375): 24px padding, a 111px heading, a 168px filter block, an 809px
 *   table whose rows are stacked records, the 38px note, the 76px field and
 *   112px actions.
 *
 * The morning periods are the ones Figma shows; the afternoon periods carry
 * on the same subjects so any period can be assigned.
 *
 * Everything happens in memory.
 */
export function AdminRoutine() {
  const { toast } = useToast();

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Routine");

  const [selectedClass, setSelectedClass] = React.useState<string>(
    ADMIN_ROUTINE_CLASSES[0],
  );
  const [selectedSection, setSelectedSection] = React.useState<string>(
    ADMIN_ROUTINE_SECTIONS[0],
  );
  const [timetable, setTimetable] = React.useState(adminRoutine);
  const [selected, setSelected] = React.useState<{
    /** Day of the cell. */
    day: AdminRoutineDay;
    /** Index of the period inside the day. */
    period: number;
  }>({ day: "Sun", period: 0 });

  const dayNames = ADMIN_ROUTINE_DAYS;

  const selectedSubject = timetable[selected.day][selected.period];

  // Clicking a cell opens a menu with the subjects it can take.
  const assignSubject = (subject: string) => {
    setTimetable((previous) => ({
      ...previous,
      [selected.day]: previous[selected.day].map((entry, index) =>
        index === selected.period ? subject : entry,
      ),
    }));
  };

  const saveRoutine = () => {
    toast({
      title: "Routine saved",
      description: `${selectedClass} ${selectedSection} was saved for the term.`,
    });
  };

  const publishRoutine = () => {
    toast({
      title: "Routine published",
      description: `${selectedClass} ${selectedSection} is now visible to students and teachers.`,
    });
  };

  // The first four periods are the ones Figma shows as columns.
  const morningTimes = ADMIN_ROUTINE_PERIOD_TIMES.slice(0, 4);

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader title="Routine" description={adminGreeting.context} />

      {/* The selection filters. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-end md:gap-4">
        <AdminSelectField
          label="Class"
          options={ADMIN_ROUTINE_CLASSES}
          value={selectedClass}
          onValueChange={setSelectedClass}
          className="md:w-[344px] md:shrink-0 xl:w-[560px]"
        />

        <AdminSelectField
          label="Section"
          options={ADMIN_ROUTINE_SECTIONS}
          value={selectedSection}
          onValueChange={setSelectedSection}
          className="md:w-[344px] md:shrink-0 xl:w-[560px]"
        />
      </div>

      {/* The timetable. */}
      <div className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6">
        <table className="hidden w-full table-fixed border-separate border-spacing-0 text-left md:table">
          <caption className="sr-only">
            Weekly routine for {selectedClass} {selectedSection}
          </caption>
          <colgroup>
            <col className="w-[calc((100%_-_12px)/5)]" />
            {morningTimes.map((time) => (
              <col key={time} className="w-[calc((100%_-_12px)/5)]" />
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
              {morningTimes.map((time) => (
                <th
                  key={time}
                  scope="col"
                  className="border-b-[16px] border-transparent bg-clip-padding-box bg-tint py-3 pl-3 pr-0 text-caption font-semibold leading-[1.45] text-ink"
                >
                  {time}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayNames.map((day) => (
              <tr key={day}>
                <td className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink">
                  {day}
                </td>
                {morningTimes.map((time, periodIndex) => (
                  <td
                    key={time}
                    className="border-b-[16px] border-transparent py-3 pl-3 pr-0 align-top text-body-md leading-[1.45] text-ink"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelected({ day, period: periodIndex })
                      }
                      aria-pressed={
                        selected.day === day && selected.period === periodIndex
                      }
                      className="rounded-[6px] text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {timetable[day][periodIndex]}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile — each day becomes a stacked record. */}
        <ul className="flex w-full flex-col md:hidden">
          {dayNames.map((day) => (
            <li
              key={day}
              className="w-full border-t-[16px] border-transparent first:border-t-0"
            >
              <p className="text-body leading-[23px] text-ink">
                Day:&nbsp;&nbsp;{day}
              </p>
              {morningTimes.map((time, periodIndex) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelected({ day, period: periodIndex })}
                  className="mt-2 block text-left text-caption leading-[19px] text-ink"
                >
                  {time}:&nbsp;&nbsp;{timetable[day][periodIndex]}
                </button>
              ))}
            </li>
          ))}
        </ul>

        <AdminTableFooter records={dayNames.length} className="mt-4 md:mt-0" />
      </div>

      <p className="text-caption leading-[1.45] text-muted">{ADMIN_ROUTINE_NOTE}</p>

      {/* The selected period. */}
      <div className="flex w-full flex-col items-start">
        <p className="text-caption font-medium leading-[1.45] text-muted">
          Selected period
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="mt-2 flex h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {`${fullDayName(selected.day)} · Period ${selected.period + 1} · ${selectedSubject}`}
            <ChevronDown aria-hidden className="size-4 shrink-0 text-muted" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className="flex w-[260px] flex-col items-start rounded-[12px] border border-border bg-surface p-2 text-ink"
          >
            {ADMIN_ROUTINE_SUBJECTS.map((subject) => (
              <DropdownMenuItem
                key={subject}
                onSelect={() => assignSubject(subject)}
                className="w-full cursor-pointer rounded-[8px] text-body leading-[1.45] text-ink focus:bg-tint"
              >
                {subject}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* The routine actions. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-center md:gap-4">
        <Button
          type="button"
          className="h-[47px] w-[145px] shrink-0"
          onClick={saveRoutine}
        >
          Save routine
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="h-[49px] w-[178px] shrink-0"
          onClick={publishRoutine}
        >
          Publish changes
        </Button>
      </div>
    </div>
  );
}

/** The long name of a day, e.g. "Sunday". */
function fullDayName(day: AdminRoutineDay): string {
  const names: Record<AdminRoutineDay, string> = {
    Sun: "Sunday",
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
  };

  return names[day];
}
