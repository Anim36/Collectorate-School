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
  findTeacherClass,
  findTeacherRoll,
  findTeacherSheet,
  formatTeacherDate,
  teacherAttendanceDate,
  teacherAttendanceSheets,
  teacherClasses,
  teacherGreeting,
  teacherHistoryMonth,
  teacherHistoryMonths,
  teacherToday,
  type AttendanceMarks,
  type AttendanceSheet,
  type AttendanceStatus,
} from "@/data/teacher";

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
 */
export function TeacherAttendance() {
  const { toast } = useToast();

  const [tab, setTab] = React.useState("sheet");
  const [classId, setClassId] = React.useState("class-9");
  const [section, setSection] = React.useState("A");
  const [date, setDate] = React.useState(teacherAttendanceDate);
  const [historyClass, setHistoryClass] = React.useState("class-9");
  const [historyMonth, setHistoryMonth] = React.useState(teacherHistoryMonth);

  const [marks, setMarks] = React.useState<AttendanceMarks>({});
  const [page, setPage] = React.useState(0);
  const [lastSaved, setLastSaved] = React.useState("09:12 AM");
  const [dirty, setDirty] = React.useState(false);
  /**
   * The saved sheet the teacher opened from the history, if any.
   * A sheet opened this way is read-only until the reader picks another
   * class, section or date.
   */
  const [readOnlySheetId, setReadOnlySheetId] = React.useState<string | null>(
    null,
  );

  // The top bar names the open tab, as Figma draws it.
  useSetPortalSection(
    tab === "history" ? "Attendance history" : "Attendance Sheet",
  );

  const currentClass = findTeacherClass(classId);
  const roll = findTeacherRoll(classId, section);
  const students = React.useMemo(
    () => roll?.students ?? [],
    [roll],
  );

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

  // The sheet opens on the marks of the chosen class, section and date.
  React.useEffect(() => {
    const saved = findTeacherSheet(classId, section, date);

    setMarks(saved?.marks ?? {});
    setPage(0);
    setDirty(false);
  }, [classId, section, date]);

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

  const confirmSwitch = (action: () => void) => {
    if (
      dirty &&
      !window.confirm(
        "You have unsaved attendance changes. Leaving now will discard them.",
      )
    ) {
      return;
    }

    // Picking another class, section or date leaves the read-only sheet.
    setReadOnlySheetId(null);
    action();
  };

  const handleMarkChange = (studentId: string, status: AttendanceStatus) => {
    setMarks((previous) => ({ ...previous, [studentId]: status }));
    setDirty(true);
  };

  const markAllPresent = () => {
    const next: Record<string, AttendanceStatus> = { ...marks };

    for (const student of students) {
      next[student.id] = "present";
    }

    setMarks(next);
    setDirty(true);
  };

  const save = () => {
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
      description: `${currentClass?.label ?? "Class"} · Section ${section} · ${formatTeacherDate(date)}`,
    });
  };

  const openSheet = (sheet: AttendanceSheet) => {
    setReadOnlySheetId(sheet.id);
    setClassId(sheet.classId);
    setSection(sheet.section);
    setDate(sheet.date);
    setTab("sheet");
  };

  const monthName = historyMonth.split(" ")[0];
  const historySheets = teacherAttendanceSheets.filter((sheet) => {
    const classMatches =
      historyClass === "all" || sheet.classId === historyClass;
    const monthMatches = sheet.dateLabel.split(" ")[1] === monthName.slice(0, 3);

    return classMatches && monthMatches;
  });

  const classOptions = teacherClasses.map((item) => item.label);
  const sectionOptions = (currentClass?.sections ?? []).map(
    (item) => `Section ${item}`,
  );

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <TeacherPageHeader
        title="Attendance Sheet"
        description={teacherGreeting.context}
      />

      {/* The filters sit above the tab line, as Figma draws them. */}
      {tab === "sheet" ? (
        <div className="flex w-full flex-col items-start gap-4 md:flex-row md:flex-nowrap">
          <FilterField
            label="Class"
            options={classOptions}
            value={currentClass?.label ?? ""}
            onValueChange={(value) => {
              const next = teacherClasses.find((item) => item.label === value);
              if (!next) return;

              confirmSwitch(() => {
                setClassId(next.id);
                setSection(next.sections[0]);
              });
            }}
            className="md:w-[224px] xl:w-[368px]"
          />

          <FilterField
            label="Section"
            options={sectionOptions}
            value={`Section ${section}`}
            onValueChange={(value) => {
              const next = value.replace("Section ", "");
              confirmSwitch(() => setSection(next));
            }}
            className="md:w-[224px] xl:w-[368px]"
          />

          <DateFilterField
            label="Date"
            value={date}
            displayValue={formatTeacherDate(date)}
            onValueChange={setDate}
            maxDate={teacherToday}
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
              historyClass === "all"
                ? "All classes"
                : (findTeacherClass(historyClass)?.label ?? "All classes")
            }
            onValueChange={(value) => {
              if (value === "All classes") {
                setHistoryClass("all");
                return;
              }

              const next = teacherClasses.find((item) => item.label === value);
              if (next) setHistoryClass(next.id);
            }}
            className="md:w-[224px] xl:w-[368px]"
          />

          <FilterField
            label="Month"
            options={teacherHistoryMonths}
            value={historyMonth}
            onValueChange={setHistoryMonth}
            className="md:w-[224px] xl:w-[368px]"
          />
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={setTab}
        className="contents"
      >
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
            className="h-[49px] w-[175px] px-0"
          >
            Mark all present
          </Button>

          <TeacherAttendanceMarkingTable
            title={`${currentClass?.label ?? "Class"} · ${section}  /  ${visibleStudents.length} of ${students.length} students shown`}
            students={visibleStudents}
            marks={marks}
            onMarkChange={handleMarkChange}
            onPageChange={setPage}
            page={currentPage}
            pageCount={pageCount}
            totalStudents={students.length}
            readOnly={readOnlySheetId !== null}
          />

          <Button
            type="button"
            onClick={save}
            disabled={readOnlySheetId !== null}
            className="h-[47px] w-[178px] px-0"
          >
            Save attendance
          </Button>

          <p className="text-caption leading-[1.45] text-muted">
            Last saved {lastSaved} · All changes saved
          </p>
        </TabsContent>

        <TabsContent value="history" className="contents">
          <TeacherAttendanceHistoryTable
            sheets={historySheets}
            onOpenSheet={openSheet}
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
