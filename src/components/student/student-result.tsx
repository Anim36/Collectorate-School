"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortalTable } from "@/components/shared/portal-table";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { cn } from "@/lib/utils";
import type {
  StudentExamOption,
  StudentExamResult,
  StudentResultRow,
} from "@/types/student";

export interface StudentResultProps {
  /** The published exams the student can pick from. */
  exams: readonly StudentExamOption[];
  /** The result the page opens on. */
  initial: StudentExamResult | null;
  className?: string;
}

/**
 * Student result page body.
 * Figma "Result content" (2:4953 desktop, 2:5019 tablet, 2:5104 mobile and
 * the matching dark frames):
 *
 * - Desktop (1440): 32px padding. A 93px greeting, the 76px exam selector,
 *   the 608px marks table, the 147px overall card and the download button.
 * - Tablet (768): 32px padding; every block keeps its height.
 * - Mobile (375): 24px padding, an 88px greeting, a 981px table of stacked
 *   records and a 170px overall card whose copy wraps to two lines.
 */
export function StudentResult({ exams, initial, className }: StudentResultProps) {
  const router = useRouter();

  const [examId, setExamId] = React.useState(initial?.id ?? exams[0]?.id ?? "");

  const exam = initial && initial.id === examId ? initial : null;

  const rows = exam?.rows ?? [];

  // The download uses the print flow, so the file is the printed result. The
  // marks that reach the paper are the ones the server read for this student
  // alone, so a result of another student can never be printed here.
  const print = () => window.print();

  const columns = [
    {
      header: "Subject",
      cell: (row: StudentResultRow) => row.subject,
    },
    {
      header: "Marks / 100",
      cell: (row: StudentResultRow) => row.marks,
    },
    {
      header: "Grade",
      cell: (row: StudentResultRow) => row.grade,
    },
    {
      header: "GPA",
      cell: (row: StudentResultRow) => row.gpa,
    },
  ];

  const mobileRecords = rows.map((row) => ({
    id: row.subject,
    lines: [
      { label: "Subject", value: row.subject },
      { label: "Marks / 100", value: row.marks },
      { label: "Grade", value: row.grade },
      { label: "GPA", value: row.gpa },
    ],
  }));

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8",
        className,
      )}
    >
      <div className="contents" data-result="screen">
        <StudentPageHeader
          title="Result"
          description="Your school life, clearly organised."
        />
      </div>

      {/* Exam selector. */}
      <div className="flex w-full flex-col items-start" data-result="screen">
        <label
          htmlFor="result-exam"
          className="text-caption font-medium leading-[1.45] text-muted"
        >
          Exam
        </label>

        <Select
          value={examId}
          onValueChange={(value) => {
            setExamId(value);
            router.push(`/student/result?exam=${encodeURIComponent(value)}`);
          }}
        >
          <SelectTrigger
            id="result-exam"
            aria-label="Exam"
            className="mt-2 h-[49px] w-full max-w-[480px] items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
          >
            <SelectValue placeholder="Choose an exam" />
            <ChevronDown aria-hidden className="size-4 shrink-0 text-muted" />
          </SelectTrigger>
          <SelectContent>
            {exams.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {exam ? (
        <>
          <PortalTable
            caption={`Marks for ${exam.label}`}
            columns={columns}
            rows={rows}
            mobileRecords={mobileRecords}
          />

          {/* Overall result. */}
          <section className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6">
            <p className="text-display font-semibold leading-[1.45] text-ink">
              {exam.gpa}
            </p>
            <p className="mt-4 text-body leading-[1.45] text-muted">
              {exam.totalMarks}
              {"  •  "}
              {exam.outcome}
            </p>
          </section>

          {/* The action is hidden when the result prints. */}
          <div className="flex w-full flex-col items-start" data-result="action">
            <Button
              type="button"
              className="h-[47px] w-[178px] px-0"
              onClick={print}
            >
              <Download aria-hidden className="size-4" />
              Download Result
            </Button>
          </div>
        </>
      ) : (
        <p className="text-body leading-[1.45] text-muted">
          No published result yet. Your marks appear here once the school
          publishes the exam.
        </p>
      )}
    </div>
  );
}
