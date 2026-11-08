"use client";

import * as React from "react";

import { FieldLabel } from "@/components/ui/field-label";
import { cn } from "@/lib/utils";

export interface FieldInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visible label above the control. */
  label: string;
  /** Helper or error copy shown under the control. */
  hint?: string;
  /** Classes applied to the wrapping panel. */
  containerClassName?: string;
}

/**
 * Labelled text input.
 * Figma "Input" (2:128–2:130): surface background, 1px border, 12px radius,
 * 16px padding, 13px medium label and a 16px value.
 */
const FieldInput = React.forwardRef<HTMLInputElement, FieldInputProps>(
  ({ className, containerClassName, label, hint, id, ...props }, ref) => {
    const generatedId = React.useId();
    const controlId = id ?? generatedId;
    const hintId = hint ? `${controlId}-hint` : undefined;

    return (
      <div
        className={cn(
          "flex w-full flex-col gap-2 rounded-[12px] border border-border bg-surface p-4",
          containerClassName,
        )}
      >
        <FieldLabel htmlFor={controlId}>{label}</FieldLabel>
        <input
          id={controlId}
          ref={ref}
          aria-describedby={hintId}
          className={cn(
            "w-full bg-transparent text-body leading-[1.45] text-ink outline-none",
            "placeholder:text-muted",
            className,
          )}
          {...props}
        />
        {hint ? (
          <p id={hintId} className="text-caption leading-[1.45] text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
FieldInput.displayName = "FieldInput";

export { FieldInput };
