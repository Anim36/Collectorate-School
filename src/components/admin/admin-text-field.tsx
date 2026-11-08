"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface AdminTextFieldProps {
  /** Visible label above the control. */
  label: string;
  /** Value of the control. */
  value: string;
  /** Fired when the value changes. */
  onValueChange: (value: string) => void;
  /** Placeholder shown while the control is empty. */
  placeholder?: string;
  /** Helper or error copy shown under the control. */
  hint?: string;
  /** Type of the control, e.g. "password". */
  type?: React.HTMLInputTypeAttribute;
  /** Name of the control, used by the form library. */
  name?: string;
  /** Reference to the underlying input. */
  ref?: React.Ref<HTMLInputElement>;
  /** Accessible name of the control. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Labelled text input.
 *
 * Figma "Search" (2:10134 desktop, 2:10273 tablet, 2:10405 mobile) and the
 * add-user modal fields (2:10626, 2:10638, 2:10642): a 13px muted label above
 * a 49px bordered control whose text sits 25px from the leading edge.
 */
export function AdminTextField({
  label,
  value,
  onValueChange,
  placeholder,
  hint,
  type = "text",
  name,
  ref,
  ariaLabel,
  className,
}: AdminTextFieldProps) {
  const generatedId = React.useId();
  const controlId = `admin-field-${generatedId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;

  return (
    <div className={cn("flex w-full flex-col items-start", className)}>
      <label
        htmlFor={controlId}
        className="text-caption font-medium leading-[1.45] text-muted"
      >
        {label}
      </label>

      <input
        id={controlId}
        ref={ref}
        name={name}
        type={type}
        value={value}
        aria-label={ariaLabel ?? label}
        aria-describedby={hintId}
        aria-invalid={hint ? true : undefined}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-[49px] w-full rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
      />

      {hint ? (
        <p id={hintId} className="mt-2 text-caption leading-[1.45] text-danger">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
