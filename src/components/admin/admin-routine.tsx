"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { AdminSelectField } from "@/components/admin/admin-fields";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTableFooter } from "@/components/admin/admin-table-footer";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
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
  getRoutineAction,
  publishRoutineAction,
  saveRoutineAction,
} from "@/app/admin/actions";
import type {
  AdminRoutineClassOption,
  AdminRoutineSheet,
} from "@/types/admin-11b";

/** The days of the school week, in order. */
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu"] as const;

/** The period times of the school day, one per period. */
const PERIOD_TIMES = [
  "08:00",
  "08:45",
  "09:30",
  "10:15",
  "11:30",
  "12:15",
  "13:00",
  "13:45",
] as const;

/** The footnote under the routine table, as Figma draws it. */
const ROUTINE_NOTE =
  "Morning periods 1–4 shown · Select a cell to assign a subject.";

export interface AdminRoutineProps {
  /** The classes the admin can pick, in school order. */
  classes: AdminRoutineClassOption[];
  /** The timetable the server read for the first class. */
  initialRoutine: AdminRoutineSheet | null;
}

/**
 * The admin routine page.
 *
 * Figma "Admin / Routine" (2:12718 desktop, 2:12906 tablet, 2:13055 mobile
 * and the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 76px class filter, the
 *   428px timetable table, the 19px note, the 76px selected-period field and
 *   the 49px routine actions.
 * - Tablet (768): the same rhythm.
 * - Mobile (375): 24px padding, a 111px heading, a 168px filter block, an
 *   809px table whose rows are stacked records, the 38px note, the 76px field
 *   and 112px actions.
 *
 * The morning periods are the ones Figma shows; the afternoon periods carry
 * on the same subjects so any period can be assigned.
 *
 * The school runs one group per class, so there is no section to choose: the
 * timetable belongs to the class and to the one section it carries.
 */
export function AdminRoutine({ classes, initialRoutine }: AdminRoutineProps) {
  const { toast } = useToast();

  const [selectedClassId, setSelectedClassId] = React.useState<string>(
    initialRoutine?.classId ?? classes[0]?.id ?? "",
  );
  const [sheet, setSheet] = React.useState<AdminRoutineSheet | null>(
    initialRoutine,
  );
  const [selected, setSelected] = React.useState<{
    /** The day of the cell, 0 for Sunday. */
    day: number;
    /** The period number of the cell, from 1. */
    period: number;
  }>({ day: 0, period: 1 });
  const [busy, setBusy] = React.useState(false);

  // The timetable is read again when the class changes, so the page shows
  // that it is waiting while the new sheet is on its way.
  const [loading, setLoading] = React.useState(false);

  // The top bar names the section, as Figma draws it.
  useSetPortalSection("Routine");

  const selectedClass =
    classes.find((option) => option.id === selectedClassId) ?? classes[0];

  /**
   * Reads the timetable of a class.
   */
  const loadRoutine = async (classId: string) => {
    setLoading(true);

    const result = await getRoutineAction(classId);

    setLoading(false);

    if (!result.ok) {
      toast({
        title: "Could not load the routine",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setSheet(result.data);
  };

  /**
   * The cell that is selected, with the subject and the teacher it holds.
   */
  const selectedCell = sheet?.cells.find(
    (cell) => cell.day === selected.day && cell.period === selected.period,
  );

  /**
   * The subject of the selected cell, as the dropdown shows it.
   */
  const selectedSubject = selectedCell?.subjectName ?? "No subject";

  /**
   * Assigns a subject to the selected cell.
   *
   * The subject has to be one of the subjects the class teaches.
   */
  const assignSubject = (subjectId: string, subjectName: string) => {
    setSheet((previous) => {
      if (!previous) return previous;

      const cells = previous.cells.filter(
        (cell) =>
          !(cell.day === selected.day && cell.period === selected.period),
      );

      const existing = previous.cells.find(
        (cell) =>
          cell.day === selected.day && cell.period === selected.period,
      );

      cells.push({
        day: selected.day,
        period: selected.period,
        subjectId,
        subjectName,
        teacherId: existing?.teacherId ?? null,
        teacherName: existing?.teacherName ?? null,
        startTime: PERIOD_TIMES[selected.period - 1] ?? "08:00",
        endTime: PERIOD_TIMES[selected.period] ?? "14:30",
      });

      return { ...previous, cells };
    });
  };

  /**
   * Assigns a teacher to the selected cell.
   */
  const assignTeacher = (teacherId: string, teacherName: string) => {
    setSheet((previous) => {
      if (!previous) return previous;

      const cells = previous.cells.map((cell) =>
        cell.day === selected.day && cell.period === selected.period
          ? { ...cell, teacherId, teacherName }
          : cell,
      );

      return { ...previous, cells };
    });
  };

  /**
   * Saves the timetable.
   */
  const saveRoutine = async () => {
    if (!sheet || busy) return;

    setBusy(true);

    const result = await saveRoutineAction({
      classId: sheet.classId,
      effectiveFrom: sheet.effectiveFrom || today(),
      periods: sheet.cells.map((cell) => ({
        day: cell.day,
        period: cell.period,
        subjectId: cell.subjectId ?? undefined,
        teacherId: cell.teacherId ?? undefined,
      })),
    });

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Routine not saved",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Routine saved",
      description: `${sheet.className} was saved for the term.`,
    });
  };

  /**
   * Publishes the timetable.
   */
  const publish = async () => {
    if (!sheet || busy) return;

    setBusy(true);

    const saved = await saveRoutineAction({
      classId: sheet.classId,
      effectiveFrom: sheet.effectiveFrom || today(),
      periods: sheet.cells.map((cell) => ({
        day: cell.day,
        period: cell.period,
        subjectId: cell.subjectId ?? undefined,
        teacherId: cell.teacherId ?? undefined,
      })),
    });

    if (!saved.ok) {
      setBusy(false);

      toast({
        title: "Routine not published",
        description: saved.error,
        variant: "destructive",
      });
      return;
    }

    const result = await publishRoutineAction(sheet.classId);

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Routine not published",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setSheet((previous) =>
      previous ? { ...previous, published: true } : previous,
    );

    toast({
      title: "Routine published",
      description: `${sheet.className} is now visible to students and teachers.`,
    });
  };

  // The first four periods are the ones Figma shows as columns.
  const morningTimes = PERIOD_TIMES.slice(0, 4);

  const cellFor = (day: number, period: number) =>
    sheet?.cells.find(
      (cell) => cell.day === day && cell.period === period,
    )?.subjectName ?? "—";

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader title="Routine" description={adminGreeting.context} />

      {/* The selection filters. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-end md:gap-4">
        <AdminSelectField
          label="Class"
          options={classes.map((option) => option.name)}
          value={selectedClass?.name ?? ""}
          onValueChange={(name) => {
            const option = classes.find((entry) => entry.name === name);

            if (!option) return;

            setSelectedClassId(option.id);
            void loadRoutine(option.id);
          }}
          className="md:w-[344px] md:shrink-0 xl:w-[560px]"
        />
      </div>

      {/* The timetable. */}
      <div className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6">
        <table className="hidden w-full table-fixed border-separate border-spacing-0 text-left md:table">
          <caption className="sr-only">
            Weekly routine for {selectedClass?.name ?? "the class"}
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
            {DAY_NAMES.map((day, dayIndex) => (
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
                        setSelected({ day: dayIndex, period: periodIndex + 1 })
                      }
                      aria-pressed={
                        selected.day === dayIndex &&
                        selected.period === periodIndex + 1
                      }
                      className="rounded-[6px] text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {cellFor(dayIndex, periodIndex + 1)}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile — each day becomes a stacked record. */}
        <ul className="flex w-full flex-col md:hidden">
          {DAY_NAMES.map((day, dayIndex) => (
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
                  onClick={() =>
                    setSelected({ day: dayIndex, period: periodIndex + 1 })
                  }
                  className="mt-2 block text-left text-caption leading-[19px] text-ink"
                >
                  {time}:&nbsp;&nbsp;{cellFor(dayIndex, periodIndex + 1)}
                </button>
              ))}
            </li>
          ))}
        </ul>

        <AdminTableFooter records={DAY_NAMES.length} className="mt-4 md:mt-0" />
      </div>

      <p className="text-caption leading-[1.45] text-muted">{ROUTINE_NOTE}</p>

      {/* The class has no timetable yet: the panel says so instead of leaving
          a bare table behind. */}
      {sheet && sheet.cells.length === 0 && !loading ? (
        <EmptyState
          message="No routine yet"
          title="Pick a subject in a cell, then save the routine."
        />
      ) : null}

      {/* The timetable is on its way: the panel holds the rhythm Figma draws
          while the sheet is loaded. */}
      {loading ? (
        <LoadingSkeleton
          message="Loading the routine"
          title="Fetching the timetable…"
        />
      ) : null}

      {/* The selected period. The subject and the teacher are both picked here,
          so the block keeps the 76px Figma measures. */}
      <div className="flex w-full flex-col items-start">
        <p className="text-caption font-medium leading-[1.45] text-muted">
          Selected period
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger className="mt-2 flex h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {`${fullDayName(selected.day)} · Period ${selected.period} · ${selectedSubject}`}
            <ChevronDown aria-hidden className="size-4 shrink-0 text-muted" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className="flex w-[280px] flex-col items-start rounded-[12px] border border-border bg-surface p-2 text-ink"
          >
            <p className="px-2 py-1 text-caption font-medium leading-[1.45] text-muted">
              Subject
            </p>

            {selectedClass?.subjects.map((subject) => (
              <DropdownMenuItem
                key={subject.id}
                onSelect={() => assignSubject(subject.id, subject.name)}
                className="w-full cursor-pointer rounded-[8px] text-body leading-[1.45] text-ink focus:bg-tint"
              >
                {subject.name}
              </DropdownMenuItem>
            ))}

            <p className="mt-2 px-2 py-1 text-caption font-medium leading-[1.45] text-muted">
              Teacher
            </p>

            {selectedClass?.teachers.map((teacher) => (
              <DropdownMenuItem
                key={teacher.id}
                onSelect={() => assignTeacher(teacher.id, teacher.name)}
                className="w-full cursor-pointer rounded-[8px] text-body leading-[1.45] text-ink focus:bg-tint"
              >
                {teacher.name}
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
          disabled={busy}
          onClick={() => void saveRoutine()}
        >
          Save routine
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="h-[49px] w-[178px] shrink-0"
          disabled={busy}
          onClick={() => void publish()}
        >
          Publish changes
        </Button>
      </div>
    </div>
  );
}

/** The long name of a day, e.g. "Sunday". */
function fullDayName(day: number): string {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

  return names[day] ?? "Sunday";
}

/** Today, as an ISO date (`yyyy-mm-dd`). */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
