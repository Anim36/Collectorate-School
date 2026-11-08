"use client";

import * as React from "react";

import { FieldLabel } from "@/components/ui/field-label";
import {
  Select as SelectPrimitive,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FieldSelectOption {
  readonly value: string;
  readonly label: string;
}

export interface FieldSelectProps {
  /** Visible label above the control. */
  label: string;
  /** Options rendered in the dropdown. */
  options: readonly FieldSelectOption[];
  /** Currently selected value. */
  value?: string;
  /** Placeholder shown when nothing is selected. */
  placeholder?: string;
  /** Fired when the reader picks a different option. */
  onValueChange?: (value: string) => void;
  /** Disables the control. */
  disabled?: boolean;
  className?: string;
}

/**
 * Labelled select.
 * Figma "Select" (2:131–2:133): surface background, 1px border, 12px radius,
 * 16px padding, 13px medium label and a 16px value with a chevron affordance.
 */
export function FieldSelect({
  label,
  options,
  value,
  placeholder = "Select an option",
  onValueChange,
  disabled,
  className,
}: FieldSelectProps) {
  const generatedId = React.useId();
  const controlId = `select-${generatedId}`;

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-[12px] border border-border bg-surface p-4",
        className,
      )}
    >
      <FieldLabel htmlFor={controlId}>{label}</FieldLabel>
      <SelectPrimitive
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={controlId}
          className={cn(
            "h-auto w-full items-center justify-between gap-2 border-0 bg-transparent p-0",
            "text-body leading-[1.45] text-ink shadow-none",
            "focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-ring",
            "[&>span]:line-clamp-1 [&>span[data-placeholder]]:text-muted",
            "[&>svg]:text-muted [&>svg]:opacity-100",
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPrimitive>
    </div>
  );
}
