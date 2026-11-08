"use client";

import * as React from "react";
import { Calendar } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DateFilterFieldProps {
  /** Visible label above the control. */
  label: string;
  /** ISO date (`yyyy-mm-dd`) used as the native control value. */
  value: string;
  /** Date shown to the reader, e.g. "01 October 2026". */
  displayValue: string;
  /** Fired with the ISO date whenever the reader picks a day. */
  onValueChange: (isoDate: string) => void;
  /**
   * Latest ISO date the reader may pick.
   * A date field that must not run into the future passes today here.
   */
  maxDate?: string;
  /**
   * Shows a calendar glyph on the trailing edge.
   * The public notice board omits it; the teacher attendance sheet draws it.
   */
  showCalendarIcon?: boolean;
  className?: string;
}

/**
 * Date filter control.
 * Figma "Notice filters" (2:1512–2:1515): a 13px muted label above a 49px
 * bordered control with 25px of horizontal padding. The native date input
 * stays visually hidden so the panel can show the long-form Figma date
 * while the browser picker handles the selection.
 */
export function DateFilterField({
  label,
  value,
  displayValue,
  onValueChange,
  maxDate,
  showCalendarIcon = false,
  className,
}: DateFilterFieldProps) {
  const generatedId = React.useId();
  const controlId = `date-filter-${generatedId}`;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const openPicker = () => {
    inputRef.current?.showPicker?.();
  };

  return (
    <div className={cn("flex w-full flex-col items-start", className)}>
      <label
        htmlFor={controlId}
        className="text-caption font-medium leading-[1.45] text-muted"
      >
        {label}
      </label>

      <button
        type="button"
        id={controlId}
        onClick={openPicker}
        aria-label={`${label}: ${displayValue}`}
        className="mt-2 flex h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-left text-body leading-[1.45] text-ink transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {displayValue}
        {showCalendarIcon ? (
          <Calendar aria-hidden className="size-4 shrink-0 text-muted" />
        ) : null}
      </button>

      <input
        ref={inputRef}
        type="date"
        value={value}
        max={maxDate}
        onChange={(event) => onValueChange(event.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
