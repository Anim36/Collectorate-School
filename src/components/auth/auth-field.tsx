"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface AuthFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visible label above the control. */
  label: string;
  /** Validation message shown under the control. */
  error?: string;
  /** Classes applied to the wrapping block. */
  containerClassName?: string;
  /** Measurement hook used by the Figma comparison script. */
  "data-auth"?: string;
}

/**
 * Labelled auth input.
 * Figma "Student ID / email" (2:3212) and its field (2:3214): a 13px medium
 * muted label, an 8px gap, then a 57px control with a 1px border, 12px radius
 * and 17px horizontal padding. The whole block is 84px tall.
 */
export const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ className, containerClassName, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const controlId = id ?? generatedId;
    const errorId = error ? `${controlId}-error` : undefined;

    return (
      <div
        data-auth={props["data-auth"]}
        className={cn("flex w-full flex-col", containerClassName)}
      >
        <label
          htmlFor={controlId}
          className="text-caption font-medium leading-[1.45] text-muted"
        >
          {label}
        </label>
        <input
          id={controlId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            "mt-[8px] flex h-[57px] w-full rounded-[12px] border bg-surface px-[17px] text-body leading-[1.45] text-ink transition-colors",
            "placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-danger" : "border-border",
            className,
          )}
          {...props}
        />
        {error ? (
          <p
            id={errorId}
            className="mt-[6px] text-caption leading-[1.45] text-danger"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
AuthField.displayName = "AuthField";
