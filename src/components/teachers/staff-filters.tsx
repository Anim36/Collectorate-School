"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface StaffFiltersProps {
  /** Current free-text query. */
  query: string;
  /** Fired when the query changes. */
  onQueryChange: (query: string) => void;
  /** Currently selected subject, or "All subjects". */
  subject: string;
  /** Fired when the subject changes. */
  onSubjectChange: (subject: string) => void;
  /** Subject options, the first being the reset value. */
  subjects: readonly string[];
  className?: string;
}

/**
 * Staff search and subject filter.
 * Figma "Staff filters" (2:947 desktop, 2:1038 tablet, 2:1126 mobile): a
 * 13px muted label above a 49px bordered control, two panels 16px apart —
 * side by side from tablet up and stacked on mobile.
 */
export function StaffFilters({
  query,
  onQueryChange,
  subject,
  onSubjectChange,
  subjects,
  className,
}: StaffFiltersProps) {
  const searchId = React.useId();
  const subjectId = React.useId();

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-4 md:flex-row md:gap-4",
        className,
      )}
    >
      <div className="flex w-full flex-col items-start">
        <label
          htmlFor={searchId}
          className="text-caption font-medium leading-[1.45] text-muted"
        >
          Search staff
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name…"
          className="mt-2 flex h-[49px] w-full items-center rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex w-full flex-col items-start">
        <label
          htmlFor={subjectId}
          className="text-caption font-medium leading-[1.45] text-muted"
        >
          Subject
        </label>
        <Select value={subject} onValueChange={onSubjectChange}>
          <SelectTrigger
            id={subjectId}
            className="mt-2 h-[49px] w-full items-center justify-start gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>svg]:size-4 [&>svg]:text-muted [&>svg]:opacity-100"
          >
            <SelectValue placeholder="All subjects" />
            <ChevronDown aria-hidden className="size-4 shrink-0 text-muted" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
