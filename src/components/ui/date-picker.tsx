"use client";

import * as React from "react";
import { Calendar } from "lucide-react";

import { FieldLabel } from "@/components/ui/field-label";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  /** Visible label above the control. */
  label: string;
  /** ISO date (`yyyy-mm-dd`) used as the native control value. */
  value?: string;
  /** Formatted date shown to the reader. */
  displayValue?: string;
  /** Copy shown when no date is selected. */
  placeholder?: string;
  /** Fired with the ISO date whenever the reader picks a day. */
  onValueChange?: (isoDate: string) => void;
  /** Disables the control. */
  disabled?: boolean;
  /** Accessible name for the control when the label is not descriptive enough. */
  ariaLabel?: string;
  /** Classes applied to the wrapping panel. */
  containerClassName?: string;
}

/**
 * Date picker built on the native date control.
 * Figma "Date picker" (2:134–2:136): surface background, 1px border,
 * 12px radius, 16px padding, 13px medium label and a 16px value with a
 * calendar glyph on the trailing edge.
 */
export function DatePicker({
  label,
  value,
  displayValue,
  placeholder = "Select a date",
  onValueChange,
  disabled = false,
  ariaLabel,
  containerClassName,
}: DatePickerProps) {
  const generatedId = React.useId();
  const controlId = `date-${generatedId}`;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const hasValue = Boolean(value);

  // The native control stays visually hidden so the panel can show the
  // long-form date from Figma while the browser picker handles the input.
  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.showPicker?.();
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-[12px] border border-border bg-surface p-4",
        containerClassName,
      )}
    >
      <FieldLabel htmlFor={controlId}>{label}</FieldLabel>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          aria-label={ariaLabel ?? label}
          className={cn(
            "flex-1 text-left text-body leading-[1.45] text-ink",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            !hasValue && "text-muted",
          )}
        >
          {hasValue ? displayValue ?? value : placeholder}
        </button>

        <Calendar aria-hidden className="size-4 shrink-0 text-muted" />
      </div>

      <input
        id={controlId}
        ref={inputRef}
        type="date"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
