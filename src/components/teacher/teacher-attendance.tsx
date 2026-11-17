"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { DateFilterField } from "@/components/shared/date-filter-field";
import { FilterField } from "@/components/shared/filter-field";
import { TeacherAttendanceHistoryTable } from "@/components/teacher/teacher-attendance-history-table";
import { TeacherAttendanceMarkingTable } from "@/components/teacher/teacher-attendance-marking-table";
import { TeacherMetrics } from "@/components/teacher/teacher-metrics";
import { TeacherPageHeader } from "@/components/teacher/teacher-page-header";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  loadTeacherAttendanceAction,
  saveTeacherAttendanceAction,
} from "@/app/teacher/actions";
import type {
  TeacherAttendanceData,
  TeacherAttendanceHistoryRow,
  TeacherAttendanceStatus,
  TeacherStudentRow,
} from "@/types/teacher";

/** Students shown on one page of the marking table. */
const PAGE_SIZE = 5;

/**
 * The teacher attendance sheet and its history.
 *
 * Figma "Teacher / Attendance Sheet" (light 2:6847 desktop, 2:7061 tablet,
 * 2:7243 mobile and the matching dark frames) and
 * "Teacher / Attendance history" (light 2:7419 desktop, 2:7581 tablet,
 * 2:7711 mobile):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 76px selection
 *   filters, the 23px tab line, the 126px counter row, the 49px "Mark all
 *   present" button, the 379px marking table, the 47px save button and the
 *   19px "Last saved" line.
 * - Tablet (768): the same rhythm with 224px filters.
 * - Mobile (375): 24px padding, the filters stack and the counters split
 *   into two rows of two.
 *
 * The sheet is editable and the history is read-only; opening a saved sheet
 * from the history shows its marks without letting the teacher change them.
 *
 * The filters sit above the tab line, as Figma draws them, and the tab root
 * dissolves so that the page body keeps one 24px rhythm from the heading to
 * the "Last saved" line.
 *
 * The class and the day are read on the server, so the sheet of a class that
 * is not the teacher's is never shown. The counters are counted again by the
 * server when the sheet is saved, so the numbers after a save are the numbers
 * the database holds.
 */
export function TeacherAttendance({
  initial,
}: {
  /** The attendance the server read for the teacher. */
  initial: TeacherAttendanceData;
}) {
  const { toast } = useToast();

  const [tab, setTab] = React.useState("sheet");
  const [classId, setClassId] = React.useState(initial.classes[0]?.id ?? "");
  const [date, setDate] = React.useState(initial.sheet?.date ?? initial.today);
  const [historyClassId, setHistoryClassId] = React.useState("");
  const [historyMonth, setHistoryMonth] = React.useState("");

  const [students, setStudents] = React.useState<readonly TeacherStudentRow[]>(
    initial.students,
  );
  const [marks, setMarks] = React.useState<Record<string, TeacherAttendanceStatus>>(
    { ...(initial.sheet?.marks ?? {}) },
  );
  const [history, setHistory] = React.useState<
    readonly TeacherAttendanceHistoryRow[]
  >(initial.history);
  const [months, setMonths] = React.useState<readonly string[]>(
    initial.months,
  );
  const [editable, setEditable] = React.useState(initial.editable);
  const [lockedReason, setLockedReason] = React.useState(initial.lockedReason);
  const [page, setPage] = React.useState(0);
  const [lastSaved, setLastSaved] = React.useState(initial.sheet?.savedAt ?? "");
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // The top bar names the open tab, as Figma draws it.
  useSetPortalSection(
    tab === "history" ? "Attendance history" : "Attendance Sheet",
  );

  const currentClass = initial.classes.find((entry) => entry.id === classId);

  // The first five students are shown; the rest are paged through.
  const pageCount = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleStudents = students.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  const counts = React.useMemo(() => {
    const tally = { present: 0, absent: 0, late: 0, total: students.length };

    for (const student of students) {
      const status = marks[student.id] ?? "present";
      if (status === "absent") tally.absent += 1;
      else if (status === "late") tally.late += 1;
      else tally.present += 1;
    }

    return tally;
  }, [marks, students]);

  // Leaving the page with unsaved changes asks for a confirmation.
  React.useEffect(() => {
    if (!dirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /**
   * Reads the sheet of another class or day from the server.
   *
   * The server decides which classes the teacher may open, so a class that is
   * not theirs never reaches the page.
   */
  const loadSheet = React.useCallback(
    async (next: {
      classId: string;
      date: string;
      historyClassId?: string;
      historyMonth?: string;
    }) => {
      if (
        dirty &&
        !window.confirm(
          "You have unsaved attendance changes. Leaving now will discard them.",
        )
      ) {
        return;
      }

      const result = await loadTeacherAttendanceAction(next);

      if (!result.ok) {
        toast({
          title: "Could not load the sheet",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      const data = result.data;

      setClassId(next.classId);
      setDate(next.date);
      setStudents(data.students);
      setMarks({ ...data.sheet?.marks });
      setHistory(data.history);
      setMonths(data.months);
      setEditable(data.editable);
      setLockedReason(data.lockedReason);
      setPage(0);
      setDirty(false);
      setLastSaved(data.sheet?.savedAt ?? "");
    },
    [dirty, toast],
  );

  const handleMarkChange = (
    studentId: string,
    status: TeacherAttendanceStatus,
  ) => {
    setMarks((previous) => ({ ...previous, [studentId]: status }));
    setDirty(true);
  };

  const markAllPresent = () => {
    const next: Record<string, TeacherAttendanceStatus> = { ...marks };

    for (const student of students) {
      next[student.id] = "present";
    }

    setMarks(next);
    setDirty(true);
  };

  /**
   * Saves the sheet.
   *
   * The server counts the marks again and writes them in one transaction, so
   * the counters that come back are the counts the database holds.
   */
  const save = async () => {
    setSaving(true);

    const result = await saveTeacherAttendanceAction({
      classId,
      date,
      marks: students.map((student) => ({
        studentId: student.id,
        status: marks[student.id] ?? "present",
      })),
    });

    setSaving(false);

    if (!result.ok) {
      toast({
        title: "Could not save the attendance",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setDirty(false);
    setLastSaved(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date()),
    );

    toast({
      title: "Attendance saved",
      description: `${currentClass?.name ?? "Class"} · ${formatDate(date)}`,
    });
  };

  const openSheet = async (sheet: TeacherAttendanceHistoryRow) => {
    await loadSheet({
      classId: sheet.classId,
      date: sheet.date,
      historyClassId,
      historyMonth,
    });
    setTab("sheet");
  };

  const classOptions = initial.classes.map((item) => item.name);

  // The months come from every sheet of the teacher and not from the history
  // that is on the screen, so the filter still offers the other months after
  // one of them has been picked.
  const monthLabels = monthOptions(months);

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <TeacherPageHeader
        title="Attendance Sheet"
        description={initial.context}
      />

      {/* The filters sit above the tab line, as Figma draws them. */}
      {tab === "sheet" ? (
        <div className="flex w-full flex-col items-start gap-4 md:flex-row md:flex-nowrap">
          <FilterField
            label="Class"
            options={classOptions}
            value={currentClass?.name ?? ""}
            onValueChange={(value) => {
              const next = initial.classes.find((item) => item.name === value);
              if (!next) return;

              void loadSheet({ classId: next.id, date });
            }}
            className="md:w-[224px] xl:w-[368px]"
          />

          <DateFilterField
            label="Date"
            value={date}
            displayValue={formatDate(date)}
            onValueChange={(value) => void loadSheet({ classId, date: value })}
            maxDate={initial.today}
            showCalendarIcon
            className="md:w-[224px] xl:w-[368px]"
          />
        </div>
      ) : (
        <div className="flex w-full flex-col items-start gap-4 md:flex-row md:flex-nowrap">
          <FilterField
            label="Class"
            options={["All classes", ...classOptions]}
            value={
              historyClassId === ""
                ? "All classes"
                : (initial.classes.find((entry) => entry.id === historyClassId)
                    ?.name ?? "All classes")
            }
            onValueChange={(value) => {
              if (value === "All classes") {
                setHistoryClassId("");
                return;
              }

              const next = initial.classes.find((item) => item.name === value);
              if (next) setHistoryClassId(next.id);
            }}
            className="md:w-[224px] xl:w-[368px]"
          />

          <FilterField
            label="Month"
            options={monthLabels}
            value={
              months.includes(historyMonth) ? historyMonth : months[0] ?? ""
            }
            onValueChange={(value) => {
              const next = months.find((key) => monthLabel(key) === value);

              setHistoryMonth(next ?? "");
            }}
            className="md:w-[224px] xl:w-[368px]"
          />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="contents">
        <TabsList className="w-full p-0">
          <TabsTrigger value="sheet">Attendance sheet</TabsTrigger>
          <span aria-hidden className="px-4 text-body leading-[1.45] text-muted">
            /
          </span>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="sheet" className="contents">
          <TeacherMetrics
            metrics={[
              { label: "Present", value: String(counts.present) },
              { label: "Absent", value: String(counts.absent) },
              { label: "Late", value: String(counts.late) },
              { label: "Total", value: String(counts.total) },
            ]}
          />

          <Button
            type="button"
            onClick={markAllPresent}
            disabled={!editable || students.length === 0}
            className="h-[49px] w-[175px] px-0"
          >
            Mark all present
          </Button>

          <TeacherAttendanceMarkingTable
            title={`${currentClass?.name ?? "Class"}  /  ${visibleStudents.length} of ${students.length} students shown`}
            students={visibleStudents}
            marks={marks}
            onMarkChange={handleMarkChange}
            onPageChange={setPage}
            page={currentPage}
            pageCount={pageCount}
            totalStudents={students.length}
            readOnly={!editable}
          />

          {lockedReason ? (
            <p className="text-caption leading-[1.45] text-muted">
              {lockedReason}
            </p>
          ) : null}

          <Button
            type="button"
            onClick={() => void save()}
            disabled={!editable || saving || students.length === 0}
            className="h-[47px] w-[178px] px-0"
          >
            Save attendance
          </Button>

          <p className="text-caption leading-[1.45] text-muted">
            {lastSaved ? `Last saved ${lastSaved} · ` : ""}
            {dirty ? "Unsaved changes" : "All changes saved"}
          </p>
        </TabsContent>

        <TabsContent value="history" className="contents">
          <TeacherAttendanceHistoryTable
            sheets={history}
            onOpenSheet={(sheet) => void openSheet(sheet)}
          />

          <Button type="button" className="h-[49px] w-[194px] px-0">
            <Download aria-hidden className="size-4" />
            Export attendance
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * The date the way the tables show it, e.g. "04 Nov 2026".
 */
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);

  if (!year || !month || !day) return isoDate;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * The months the history holds, newest first, e.g. "November 2026".
 */
function monthOptions(months: readonly string[]): string[] {
  return months.map(monthLabel);
}

/**
 * The label of a month key, e.g. "November 2026".
 */
function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
