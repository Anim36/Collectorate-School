"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AdminTextField } from "@/components/admin/admin-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminFeeStructureRow } from "@/types/admin-11c";

export interface IssueFeesModalProps {
  /** Called when the admin dismisses the modal. */
  onClose: () => void;
  /** Called with the slot the admin wants issued. */
  onIssue: (values: {
    classId: string;
    period: string;
    lines: string[];
  }) => void;
  /** The classes that have a fee structure. */
  rows: readonly AdminFeeStructureRow[];
}

/**
 * The lines of a billing slot the admin can issue.
 */
const LINE_OPTIONS = [
  { label: "Tuition", value: "tuition" },
  { label: "Admission", value: "admission" },
  { label: "Activities", value: "activities" },
] as const;

/**
 * The issue fees dialog.
 *
 * The admin picks a class, the month the fees belong to and the lines of that
 * month, and the school bills the students of the class. Running it twice
 * changes nothing: a student holds one line per slot and per line.
 */
export function IssueFeesModal({ onClose, onIssue, rows }: IssueFeesModalProps) {
  const [classId, setClassId] = React.useState(rows[0]?.classId ?? "");
  const [period, setPeriod] = React.useState("");
  const [lines, setLines] = React.useState<string[]>(["tuition"]);
  const [error, setError] = React.useState<string | null>(null);

  const toggle = (line: string) => {
    setLines((current) =>
      current.includes(line)
        ? current.filter((entry) => entry !== line)
        : [...current, line],
    );
  };

  const submit = () => {
    if (classId === "") {
      setError("Choose the class the fees are issued for");
      return;
    }

    if (!/^\d{4}-\d{2}$/.test(period.trim())) {
      setError("Choose the month the fees belong to");
      return;
    }

    if (lines.length === 0) {
      setError("Choose at least one fee to issue");
      return;
    }

    onIssue({ classId, period: period.trim(), lines });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-6 md:items-center">
      <Modal
        title="Issue fees"
        description="The students of the class are billed the lines of that month."
        onClose={onClose}
        className="max-w-[560px]"
        footer={
          <>
            <Button type="button" className="h-[47px]" onClick={submit}>
              Issue fees
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-[49px]"
              onClick={onClose}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Class
            </span>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger
                id="admin-issue-class"
                aria-label="Class"
                className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
              >
                <SelectValue placeholder="Every class" />
              </SelectTrigger>
              <SelectContent>
                {rows.map((row) => (
                  <SelectItem key={row.classId} value={row.classId}>
                    {row.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AdminTextField
            label="Month"
            type="month"
            value={period}
            onValueChange={setPeriod}
            placeholder="2026-12"
            hint={error ?? undefined}
            ariaLabel="Month"
          />

          <fieldset className="flex w-full flex-col items-start gap-2">
            <legend className="text-caption font-medium leading-[1.45] text-muted">
              Fees to issue
            </legend>
            <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 md:gap-x-8">
              {LINE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-1.5 text-body leading-[1.45] text-ink"
                >
                  <input
                    type="checkbox"
                    checked={lines.includes(option.value)}
                    onChange={() => toggle(option.value)}
                    className="size-4 shrink-0 rounded-[4px] border border-border accent-[hsl(var(--action))]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Modal>
    </div>
  );
}
