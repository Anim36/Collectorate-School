"use client";

import * as React from "react";

import { FilterField } from "@/components/shared/filter-field";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { TeacherPageHeader } from "@/components/teacher/teacher-page-header";
import { TeacherResultMarksTable } from "@/components/teacher/teacher-result-marks-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  TEACHER_RESULT_PAGE_SIZE,
  findTeacherResultSheet,
  teacherExams,
  teacherResultClasses,
  teacherResultClassLabel,
  teacherResultGuidance,
  teacherResultSubjects,
  validateTeacherMarks,
  type TeacherMarkError,
  type TeacherResultRow,
} from "@/data/teacher-results";
import { findTeacherRoll, teacherGreeting } from "@/data/teacher";

/**
 * The teacher result entry page.
 *
 * Figma "Teacher / Result Update" (light 2:7828 desktop, 2:8006 tablet,
 * 2:8152 mobile) and "Teacher / Result validation" (light 2:8286 desktop,
 * 2:8467 tablet, 2:8616 mobile):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 76px selection
 *   filters, the 108px guidance panel, the 518px marks table, the 49px action
 *   row and the 19px status line.
 * - Tablet (768): the same rhythm with 224px filters.
 * - Mobile (375): 24px padding, the filters stack into a 260px block, the
 *   guidance panel grows to 127px and the table becomes a 799px stack of
 *   records.
 *
 * The validation frame shows the same page with a mark outside 0–100: the
 * offending row is marked invalid, an error panel appears under the table and
 * the publish button is disabled.
 */
export function TeacherResults() {
  const { toast } = useToast();

  const [exam, setExam] = React.useState("Annual exam 2026");
  const [classId, setClassId] = React.useState("class-9");
  const [section, setSection] = React.useState("A");
  const [subject, setSubject] = React.useState("Science");
  const [marks, setMarks] = React.useState<Readonly<Record<string, string>>>(
    () => findTeacherResultSheet("Annual exam 2026")?.marks ?? {},
  );
  const [status, setStatus] = React.useState<"Draft" | "Published">("Draft");
  const [savedAt, setSavedAt] = React.useState("10:42 AM");
  const [page, setPage] = React.useState(0);
  const [editingPublished, setEditingPublished] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  const students = React.useMemo(
    () => findTeacherRoll(classId, section)?.students ?? [],
    [classId, section],
  );

  // The first five students are shown; the rest are paged through.
  const pageCount = Math.max(1, Math.ceil(students.length / TEACHER_RESULT_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleStudents = students.slice(
    currentPage * TEACHER_RESULT_PAGE_SIZE,
    currentPage * TEACHER_RESULT_PAGE_SIZE + TEACHER_RESULT_PAGE_SIZE,
  );

  const rows: readonly TeacherResultRow[] = visibleStudents.map((student) => ({
    id: student.id,
    roll: student.roll,
    name: student.name,
    marks: marks[student.id] ?? "",
  }));

  const errors = React.useMemo(() => {
    const found = validateTeacherMarks(rows);
    const keyed: Record<string, TeacherMarkError> = {};

    for (const error of found) keyed[error.rowId] = error;

    return keyed;
  }, [rows]);

  const errorList = React.useMemo(() => Object.values(errors), [errors]);
  const hasErrors = errorList.length > 0;

  // The top bar and the heading name the state, as Figma draws them.
  useSetPortalSection(hasErrors ? "Result validation" : "Result Update");

  // A published sheet is read-only until the teacher asks to edit it.
  const readOnly = status === "Published" && !editingPublished;

  const classOptions = teacherResultClasses.map((item) =>
    teacherResultClassLabel(item.id, item.section),
  );

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

  const loadSheet = (
    nextExam: string,
    nextClassId: string,
    nextSection: string,
  ) => {
    // Switching away from a sheet with unsaved changes asks first.
    if (
      dirty &&
      !window.confirm(
        "You have unsaved changes. Leaving now will discard them.",
      )
    ) {
      return;
    }

    const next = findTeacherResultSheet(nextExam);

    setExam(nextExam);
    setMarks(next?.marks ?? {});
    setStatus(next?.status ?? "Draft");
    setSavedAt(next?.savedAt ?? "10:42 AM");
    setPage(0);
    setEditingPublished(false);
    setDirty(false);
    setClassId(nextClassId);
    setSection(nextSection);
  };

  const handleMarksChange = (rowId: string, value: string) => {
    setMarks((previous) => ({ ...previous, [rowId]: value }));
    setDirty(true);
  };

  const saveDraft = () => {
    const time = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());

    setSavedAt(time);
    setStatus("Draft");
    setDirty(false);
    toast({
      title: "Draft saved",
      description: `${exam} · ${teacherResultClassLabel(classId, section)} · ${subject}`,
    });
  };

  const publish = () => {
    if (hasErrors) return;

    setStatus("Published");
    setEditingPublished(false);
    setDirty(false);
    toast({
      title: "Results published",
      description: `${exam} · ${teacherResultClassLabel(classId, section)} · ${subject}`,
    });
  };

  const requestEdit = () => {
    setEditingPublished(true);
    setDirty(false);
  };

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <TeacherPageHeader
        title={hasErrors ? "Result validation" : "Result Update"}
        description={teacherGreeting.context}
      />

      {/* The selection filters. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:flex-nowrap">
        <FilterField
          label="Exam"
          options={teacherExams}
          value={exam}
          onValueChange={(value) => loadSheet(value, classId, section)}
          className="md:w-[224px] xl:w-[368px]"
        />

        <FilterField
          label="Class"
          options={classOptions}
          value={teacherResultClassLabel(classId, section)}
          onValueChange={(value) => {
            const next = teacherResultClasses.find(
              (item) => teacherResultClassLabel(item.id, item.section) === value,
            );

            if (next) loadSheet(exam, next.id, next.section);
          }}
          className="md:w-[224px] xl:w-[368px]"
        />

        <FilterField
          label="Subject"
          options={teacherResultSubjects}
          value={subject}
          onValueChange={(value) => {
            if (
              dirty &&
              !window.confirm(
                "You have unsaved changes. Leaving now will discard them.",
              )
            ) {
              return;
            }

            setSubject(value);
            setDirty(false);
          }}
          className="md:w-[224px] xl:w-[368px]"
        />
      </div>

      {/* The guidance panel. */}
      <section className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6">
        <p className="text-body font-semibold leading-[23px] text-ink">
          {teacherResultGuidance.title}
        </p>
        <p className="mt-4 text-caption leading-[19px] text-muted">
          {teacherResultGuidance.body}
        </p>
      </section>

      <TeacherResultMarksTable
        rows={rows}
        errors={errors}
        onMarksChange={handleMarksChange}
        readOnly={readOnly}
        page={currentPage}
        pageCount={pageCount}
        totalStudents={students.length}
        onPageChange={setPage}
      />

      {/* The validation panel appears only when a mark cannot be published. */}
      {hasErrors ? (
        <section className="flex w-full flex-col items-start rounded-[12px] border border-danger bg-surface p-6">
          <p className="text-body-lg font-semibold leading-[29px] text-danger">
            {errorList.length} mark{errorList.length === 1 ? "" : "s"} need
            {errorList.length === 1 ? "s" : ""} your attention
          </p>
          {errorList.map((error) => (
            <p
              key={error.rowId}
              className="mt-4 text-body leading-[23px] text-ink"
            >
              {error.message}
            </p>
          ))}
        </section>
      ) : null}

      {/* The action row. The status badge rides beside the publish button. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-center md:gap-0">
        <Button
          type="button"
          onClick={saveDraft}
          variant="secondary"
          disabled={readOnly}
          className="h-[49px] w-[131px] px-0"
        >
          Save Draft
        </Button>

        <div className="flex w-full items-center gap-3 md:w-auto md:gap-0">
          {readOnly ? (
            <Button
              type="button"
              onClick={requestEdit}
              className="h-[47px] w-[162px] px-0 md:ml-[16px]"
            >
              Edit
            </Button>
          ) : (
            <Button
              type="button"
              onClick={publish}
              disabled={hasErrors}
              className="h-[47px] w-[162px] px-0 md:ml-[16px]"
            >
              Publish results
            </Button>
          )}

          {status === "Published" ? (
            <Badge variant="success" className="md:ml-2">
              Published
            </Badge>
          ) : (
            <Badge variant="info" className="md:ml-2">
              Draft
            </Badge>
          )}
        </div>
      </div>

      <p className="text-caption leading-[19px] text-muted">
        {hasErrors
          ? "Publishing is unavailable until errors are resolved."
          : status === "Published"
            ? `Published · 04 Nov 2026, ${savedAt}`
            : `Draft saved · 04 Nov 2026, ${savedAt}`}
      </p>
    </div>
  );
}
