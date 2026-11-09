"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { FilterField } from "@/components/shared/filter-field";
import { cn } from "@/lib/utils";
import { ADMIN_ROLE_OPTIONS } from "@/data/admin";

export interface AdminUserFiltersProps {
  /** Current free-text query. */
  query: string;
  /** Fired when the query changes. */
  onQueryChange: (query: string) => void;
  /** Currently selected role. */
  role: string;
  /** Fired when the admin picks a different role. */
  onRoleChange: (role: string) => void;
  /** Currently selected status. */
  status: string;
  /** Fired when the admin picks a different status. */
  onStatusChange: (status: string) => void;
  className?: string;
}

/** The status options of the filter. */
const STATUS_OPTIONS = ["All statuses", "Active", "Inactive"] as const;

/**
 * The selection filters of the users page.
 *
 * Figma "Selection filters" (2:10133 desktop, 2:10272 tablet, 2:10404 mobile):
 * a 76px labelled search box and a 76px labelled role dropdown.
 *
 * - Desktop (1440): the search box is 560px wide, as Figma draws it, and the
 *   role and status dropdowns share the rest of the row.
 * - Tablet (768): the search box is 344px wide and the two dropdowns share
 *   the rest of the row.
 * - Mobile (375): the search box sits on its own line and the two dropdowns
 *   sit side by side beneath it, so the filter block keeps the 168px Figma
 *   measures.
 */
export function AdminUserFilters({
  query,
  onQueryChange,
  role,
  onRoleChange,
  status,
  onStatusChange,
  className,
}: AdminUserFiltersProps) {
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
            placeholder="Search name, ID or email…"
            className="h-[49px] w-full rounded-[12px] border border-border bg-surface pl-[57px] pr-[25px] text-body leading-[1.45] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* The role and the status share the rest of the row, so the filter
          block keeps the height Figma measures. */}
      <div className="grid w-full grid-cols-2 items-end gap-4 md:flex md:flex-1 md:gap-4 xl:max-w-[544px]">
        <FilterField
          label="Role"
          options={ADMIN_ROLE_OPTIONS}
          value={role}
          onValueChange={onRoleChange}
          className="w-full"
        />

        <FilterField
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onValueChange={onStatusChange}
          className="w-full"
        />
      </div>
    </div>
  );
}
