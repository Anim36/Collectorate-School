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
  loadTeacherResultsAction,
  previewTeacherMarksAction,
  publishTeacherResultAction,
  reopenTeacherResultAction,
  saveTeacherResultDraftAction,
} from "@/app/teacher/actions";
import type {
  TeacherMarkError,
  TeacherResultData,
  TeacherResultRow,
} from "@/types/teacher";

/** Students shown on one page of the marks table. */
const PAGE_SIZE = 5;

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
 *
 * The grade, the grade point and the errors are worked out on the server by
 * one function, so the sheet stores the same numbers the table shows and the
 * browser never names a grade of its own. The sheet that is open is read from
 * the database, and a published sheet opens read-only until the teacher asks
 * to edit it.
 */
export function TeacherResults({
  initial,
}: {
  /** The result sheet the server read for the teacher. */
  initial: TeacherResultData;
}) {
  const { toast } = useToast();

  const [exams, setExams] = React.useState(initial.exams);
  const [classes, setClasses] = React.useState(initial.classes);
  const [subjects, setSubjects] = React.useState(initial.subjects);

  const [examId, setExamId] = React.useState(initial.examId);
  const [classId, setClassId] = React.useState(initial.classId);
  const [subjectId, setSubjectId] = React.useState(initial.subjectId);

  const [students, setStudents] = React.useState(initial.students);
  const [marks, setMarks] = React.useState<Record<string, string>>({
    ...initial.marks,
  });
  const [grades, setGrades] = React.useState<Record<string, string>>({
    ...initial.grades,
  });
  const [gpas, setGpas] = React.useState<Record<string, string>>({
    ...initial.gpas,
  });
  const [errors, setErrors] = React.useState<
    Readonly<Record<string, TeacherMarkError>>
  >({});
  const [published, setPublished] = React.useState(initial.published);
  const [savedAt, setSavedAt] = React.useState(initial.savedAt);
  const [savedOn, setSavedOn] = React.useState(initial.savedOn);
  const [page, setPage] = React.useState(0);
  const [editingPublished, setEditingPublished] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  // The top bar and the heading name the state, as Figma draws them.
  const errorList = React.useMemo(() => Object.values(errors), [errors]);
  const hasErrors = errorList.length > 0;

  useSetPortalSection(hasErrors ? "Result validation" : "Result Update");

  // A published sheet is read-only until the teacher asks to edit it.
  const readOnly = published && !editingPublished;

  // The first five students are shown; the rest are paged through.
  const pageCount = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleStudents = students.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  const rows: readonly TeacherResultRow[] = visibleStudents.map((student) => ({
    id: student.id,
    roll: student.roll,
    name: student.name,
    marks: marks[student.id] ?? "",
    grade: grades[student.id] ?? "",
    gpa: gpas[student.id] ?? "",
  }));

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
   * Opens another sheet.
   *
   * The server decides which classes and subjects the teacher may write, so a
   * sheet that is not theirs never reaches the page.
   */
  const loadSheet = async (next: {
    examId: string;
    classId: string;
    subjectId: string;
  }) => {
    if (
      dirty &&
      !window.confirm(
        "You have unsaved changes. Leaving now will discard them.",
      )
    ) {
      return;
    }

    setBusy(true);

    const result = await loadTeacherResultsAction(next);

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Could not load the sheet",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    const data = result.data;

    setExams(data.exams);
    setClasses(data.classes);
    setSubjects(data.subjects);
    setExamId(data.examId);
    setClassId(data.classId);
    setSubjectId(data.subjectId);
    setStudents(data.students);
    setMarks({ ...data.marks });
    setGrades({ ...data.grades });
    setGpas({ ...data.gpas });
    setErrors({});
    setPublished(data.published);
    setSavedAt(data.savedAt);
    setSavedOn(data.savedOn);
    setPage(0);
    setEditingPublished(false);
    setDirty(false);
  };

  /**
   * Works out the grade, the grade point and the errors of the marks.
   *
   * The server owns the calculation, so the table shows the numbers the sheet
   * will store. Nothing is written: the marks are only read.
   */
  const preview = React.useCallback(
    async (nextMarks: Record<string, string>) => {
      const result = await previewTeacherMarksAction({
        examId,
        classId,
        subjectId,
        marks: nextMarks,
      });

      if (!result.ok) return;

      setGrades(result.data.grades);
      setGpas(result.data.gpas);

      const keyed: Record<string, TeacherMarkError> = {};

      for (const error of result.data.errors) {
        keyed[error.rowId] = error;
      }

      setErrors(keyed);
    },
    [classId, examId, subjectId],
  );

  // The marks are previewed again after the teacher stops typing, so the
  // grades and the errors follow the table.
  React.useEffect(() => {
    if (!dirty) return;

    const timer = setTimeout(() => {
      void preview(marks);
    }, 250);

    return () => clearTimeout(timer);
  }, [dirty, marks, preview]);

  const handleMarksChange = (rowId: string, value: string) => {
    setMarks((previous) => {
      const next = { ...previous, [rowId]: value };

      void preview(next);

      return next;
    });
    setDirty(true);
  };

  const saveDraft = async () => {
    setBusy(true);

    const result = await saveTeacherResultDraftAction({
      examId,
      classId,
      subjectId,
      marks,
    });

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Could not save the draft",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setSavedAt(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date()),
    );
    setSavedOn(formatDate(new Date()));
    setDirty(false);

    toast({
      title: "Draft saved",
      description: `${examLabel(examId, exams)} · ${classLabel(classId, classes)} · ${subjectLabel(subjectId, subjects)}`,
    });
  };

  const publish = async () => {
    if (hasErrors) return;

    setBusy(true);

    const result = await publishTeacherResultAction({
      examId,
      classId,
      subjectId,
      marks,
    });

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Could not publish the results",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setPublished(true);
    setEditingPublished(false);
    setDirty(false);

    toast({
      title: "Results published",
      description: `${examLabel(examId, exams)} · ${classLabel(classId, classes)} · ${subjectLabel(subjectId, subjects)}`,
    });
  };

  /**
   * Re-opens a published sheet as a draft.
   *
   * The sheet goes back to a draft on the server, so a student never sees a
   * half-edited sheet, and the audit row records who did it.
   */
  const requestEdit = async () => {
    setBusy(true);

    const result = await reopenTeacherResultAction({
      examId,
      classId,
      subjectId,
    });

    setBusy(false);

    if (!result.ok) {
      toast({
        title: "Could not edit the sheet",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setPublished(false);
    setEditingPublished(true);
    setDirty(false);
  };

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <TeacherPageHeader
        title={hasErrors ? "Result validation" : "Result Update"}
        description={initial.context}
      />

      {/* The selection filters. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:flex-nowrap">
        <FilterField
          label="Exam"
          options={exams.map((exam) => exam.name)}
          value={examLabel(examId, exams)}
          onValueChange={(value) => {
            const next = exams.find((exam) => exam.name === value);
            if (next) void loadSheet({ examId: next.id, classId, subjectId });
          }}
          className="md:w-[224px] xl:w-[368px]"
        />

        <FilterField
          label="Class"
          options={classes.map((entry) => entry.name)}
          value={classLabel(classId, classes)}
          onValueChange={(value) => {
            const next = classes.find((entry) => entry.name === value);
            if (next) void loadSheet({ examId, classId: next.id, subjectId });
          }}
          className="md:w-[224px] xl:w-[368px]"
        />

        <FilterField
          label="Subject"
          options={subjects.map((subject) => subject.name)}
          value={subjectLabel(subjectId, subjects)}
          onValueChange={(value) => {
            const next = subjects.find((subject) => subject.name === value);
            if (next) void loadSheet({ examId, classId, subjectId: next.id });
          }}
          className="md:w-[224px] xl:w-[368px]"
        />
      </div>

      {/* The guidance panel. */}
      <section className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6">
        <p className="text-body font-semibold leading-[23px] text-ink">
          {initial.guidance.title}
        </p>
        <p className="mt-4 text-caption leading-[19px] text-muted">
          {initial.guidance.body}
        </p>
      </section>

      <TeacherResultMarksTable
        rows={rows}
        errors={errors}
        onMarksChange={handleMarksChange}
        onPageChange={setPage}
        page={currentPage}
        pageCount={pageCount}
        totalStudents={students.length}
        readOnly={readOnly}
      />

      {/* The errors of the sheet, so the teacher knows what to correct. */}
      {errorList.length > 0 ? (
        <section className="flex w-full flex-col items-start rounded-[12px] border border-danger bg-surface p-6">
          <p className="text-body font-semibold leading-[23px] text-danger">
            Correct {errorList.length} mark
            {errorList.length === 1 ? "" : "s"} before you publish
          </p>
          <ul className="mt-4 flex w-full flex-col gap-2">
            {errorList.map((error) => (
              <li
                key={error.rowId}
                className="text-caption leading-[19px] text-muted"
              >
                {error.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* The action row. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-center md:gap-0">
        <Button
          type="button"
          onClick={() => void saveDraft()}
          variant="secondary"
          disabled={readOnly || busy}
          className="h-[49px] w-[131px] px-0"
        >
          Save draft
        </Button>

        {readOnly ? (
          <Button
            type="button"
            onClick={() => void requestEdit()}
            disabled={busy}
            className="h-[47px] w-[162px] px-0 md:ml-[16px]"
          >
            Edit
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => void publish()}
            disabled={hasErrors || busy}
            className="h-[47px] w-[162px] px-0 md:ml-[16px]"
          >
            Publish
          </Button>
        )}

        {published ? (
          <Badge variant="success" className="md:ml-2">
            Published
          </Badge>
        ) : (
          <Badge variant="info" className="md:ml-2">
            Draft
          </Badge>
        )}
      </div>

      <p className="text-caption leading-[19px] text-muted">
        {hasErrors
          ? "Publishing is unavailable until errors are resolved."
          : published
            ? `Published · ${savedOn}, ${savedAt}`
            : `Draft saved · ${savedOn}, ${savedAt}`}
      </p>
    </div>
  );
}

/** The name of the exam that is open. */
function examLabel(
  examId: string,
  exams: readonly { id: string; name: string }[],
): string {
  return exams.find((exam) => exam.id === examId)?.name ?? "";
}

/** The name of the class that is open. */
function classLabel(
  classId: string,
  classes: readonly { id: string; name: string }[],
): string {
  return classes.find((entry) => entry.id === classId)?.name ?? "";
}

/** The name of the subject that is open. */
function subjectLabel(
  subjectId: string,
  subjects: readonly { id: string; name: string }[],
): string {
  if (subjects.length === 0) return "";

  return (
    subjects.find((subject) => subject.id === subjectId)?.name ??
    subjects[0].name
  );
}

/** The date the way the status line writes it, e.g. "04 Nov 2026". */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
