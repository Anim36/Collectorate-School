"use client";

import * as React from "react";
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
import {
  examResults,
  initialExamIndex,
  summariseResult,
  type ResultRow,
} from "@/data/student";

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
export function StudentResult({ className }: { className?: string }) {
  const [examIndex, setExamIndex] = React.useState(initialExamIndex);

  const exam = examResults[examIndex];
  const summary = summariseResult(exam);

  const columns = [
    {
      header: "Subject",
      cell: (row: ResultRow) => row.subject,
    },
    {
      header: "Marks / 100",
      cell: (row: ResultRow) => String(row.marks),
    },
    {
      header: "Grade",
      cell: (row: ResultRow) => row.grade,
    },
    {
      header: "GPA",
      cell: (row: ResultRow) => row.gpa,
    },
  ];

  const mobileRecords = exam.rows.map((row) => ({
    id: row.subject,
    lines: [
      { label: "Subject", value: row.subject },
      { label: "Marks / 100", value: String(row.marks) },
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
      <StudentPageHeader
        title="Result"
        description="Your school life, clearly organised."
      />

      {/* Exam selector. */}
      <div className="flex w-full flex-col items-start">
        <label
          htmlFor="result-exam"
          className="text-caption font-medium leading-[1.45] text-muted"
        >
          Exam
        </label>

        <Select
          value={String(examIndex)}
          onValueChange={(value) => setExamIndex(Number(value))}
        >
          <SelectTrigger
            id="result-exam"
            aria-label="Exam"
            className="mt-2 h-[49px] w-full max-w-[480px] items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
          >
            <SelectValue placeholder={exam.label} />
            <ChevronDown aria-hidden className="size-4 shrink-0 text-muted" />
          </SelectTrigger>
          <SelectContent>
            {examResults.map((entry, index) => (
              <SelectItem key={entry.label} value={String(index)}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PortalTable
        caption={`Marks for ${exam.label}`}
        columns={columns}
        rows={exam.rows}
        mobileRecords={mobileRecords}
      />

      {/* Overall result. */}
      <section className="flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6">
        <p className="text-display font-semibold leading-[1.45] text-ink">
          {summary.gpa}
        </p>
        <p className="mt-4 text-body leading-[1.45] text-muted">
          {summary.totalMarks}
          {"  •  "}
          {summary.outcome}
        </p>
      </section>

      <Button type="button" className="h-[47px] w-[178px] px-0">
        <Download aria-hidden className="size-4" />
        Download Result
      </Button>
    </div>
  );
}
