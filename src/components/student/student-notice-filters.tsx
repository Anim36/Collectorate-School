"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { DateFilterField } from "@/components/shared/date-filter-field";
import { FilterField } from "@/components/shared/filter-field";
import { cn } from "@/lib/utils";

export interface StudentNoticeFiltersProps {
  /** Current free-text query. */
  query: string;
  /** Fired when the query changes. */
  onQueryChange: (query: string) => void;
  /** Currently selected category, or "All categories". */
  category: string;
  /** Fired when the category changes. */
  onCategoryChange: (category: string) => void;
  /** Category options, the first being the reset value. */
  categories: readonly string[];
  /** ISO date the range starts at. */
  fromDate: string;
  /** Fired with the ISO date when the range start changes. */
  onFromDateChange: (isoDate: string) => void;
  /** Long-form label of the range start. */
  fromDateLabel: string;
  /** ISO date the range ends at. */
  toDate: string;
  /** Fired with the ISO date when the range end changes. */
  onToDateChange: (isoDate: string) => void;
  /** Long-form label of the range end. */
  toDateLabel: string;
  className?: string;
}

/**
 * Student notice search and filters.
 *
 * Figma draws no filter row on "Student / Notice" (2:5442 / 2:5512 / 2:5564),
 * but the sibling portal frame "Teacher / Notice" (2:8753 / 2:8899 / 2:9013)
 * puts a filter block at 149px and the results table at 249px, so the portal
 * convention is a filter row above the table. The controls themselves are the
 * public board's pattern — Figma "Notice filters" (2:1507–2:1518): a 13px
 * muted label above a 49px bordered control.
 *
 * - Desktop (1440): four controls in one row, each 272px wide.
 * - Tablet (768): the controls shrink to fit one row, so each is 169px wide.
 * - Mobile (375): the controls stack, as the public board's filters do.
 */
export function StudentNoticeFilters({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  categories,
  fromDate,
  onFromDateChange,
  fromDateLabel,
  toDate,
  onToDateChange,
  toDateLabel,
  className,
}: StudentNoticeFiltersProps) {
  const searchId = React.useId();

  return (
    <div
      data-student="notice-filters"
      className={cn(
        "flex w-full flex-col items-start gap-4 md:flex-row md:flex-nowrap md:items-end",
        className,
      )}
    >
      <div className="flex w-full flex-col items-start md:w-[169px] xl:w-[272px]">
        <label
          htmlFor={searchId}
          className="text-caption font-medium leading-[1.45] text-muted"
        >
          Search
        </label>
        <div className="relative mt-2 w-full">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-[25px] top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search notices…"
            className="h-[49px] w-full rounded-[12px] border border-border bg-surface pl-[57px] pr-[25px] text-body leading-[1.45] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <FilterField
        label="Category"
        options={categories}
        value={category}
        onValueChange={onCategoryChange}
        className="md:w-[169px] xl:w-[272px]"
      />

      <DateFilterField
        label="From date"
        value={fromDate}
        displayValue={fromDateLabel}
        onValueChange={onFromDateChange}
        className="md:w-[169px] xl:w-[272px]"
      />

      <DateFilterField
        label="To date"
        value={toDate}
        displayValue={toDateLabel}
        onValueChange={onToDateChange}
        className="md:w-[169px] xl:w-[272px]"
      />
    </div>
  );
}
