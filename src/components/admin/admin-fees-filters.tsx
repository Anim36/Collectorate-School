"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { FilterField } from "@/components/shared/filter-field";
import { cn } from "@/lib/utils";

export interface AdminFeesFiltersProps {
  /** Current free-text query. */
  query: string;
  /** Fired when the query changes. */
  onQueryChange: (query: string) => void;
  /** Currently selected payment status. */
  status: string;
  /** Fired when the admin picks a different status. */
  onStatusChange: (status: string) => void;
  /** Options offered by the status dropdown. */
  statusOptions: readonly string[];
  /** Placeholder of the search box. */
  placeholder?: string;
  className?: string;
}

/**
 * The selection filters of the payments table.
 *
 * Figma "Selection filters" (2:13837 desktop, 2:14004 tablet, 2:14160 mobile):
 * a 76px labelled search box and a 76px labelled status dropdown.
 *
 * - Desktop (1440): the two controls sit side by side, each 560px wide.
 * - Tablet (768): each control is 344px wide.
 * - Mobile (375): the controls stack, so the block is 168px tall.
 */
export function AdminFeesFilters({
  query,
  onQueryChange,
  status,
  onStatusChange,
  statusOptions,
  placeholder = "Search student or receipt…",
  className,
}: AdminFeesFiltersProps) {
  const searchId = React.useId();

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-4 md:flex-row md:flex-nowrap md:items-end md:gap-4",
        className,
      )}
    >
      <div className="flex w-full flex-col items-start md:w-[344px] md:shrink-0 xl:w-[560px]">
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
            placeholder={placeholder}
            className="h-[49px] w-full rounded-[12px] border border-border bg-surface pl-[57px] pr-[25px] text-body leading-[1.45] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <FilterField
        label="Status"
        options={statusOptions}
        value={status}
        onValueChange={onStatusChange}
        className="md:w-[344px] md:shrink-0 xl:w-[560px]"
      />
    </div>
  );
}
