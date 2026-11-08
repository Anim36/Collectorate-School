"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterFieldProps {
  /** Visible label above the control. */
  label: string;
  /** Options rendered in the dropdown. */
  options: readonly string[];
  /** Currently selected value. */
  value: string;
  /** Fired when the reader picks a different option. */
  onValueChange: (value: string) => void;
  /** Accessible name of the control. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Labelled filter dropdown.
 * Figma "Notice filters" (2:1508–2:1510) and "Timetable filters" (2:2862–2:2864):
 * a 13px muted label above a 49px bordered control with a chevron on the
 * trailing edge. The control fills the width it is given, so the same
 * component works in the notice sidebar, the tablet filter row and the
 * routine page.
 */
export function FilterField({
  label,
  options,
  value,
  onValueChange,
  ariaLabel,
  className,
}: FilterFieldProps) {
  const generatedId = React.useId();
  const controlId = `filter-${generatedId}`;

  return (
    <div className={cn("flex w-full flex-col items-start", className)}>
      <label
        htmlFor={controlId}
        className="text-caption font-medium leading-[1.45] text-muted"
      >
        {label}
      </label>

      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={controlId}
          aria-label={ariaLabel ?? label}
          className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
        >
          <SelectValue placeholder={options[0]} />
          <ChevronDown aria-hidden className="size-4 shrink-0 text-muted" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
