"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Visible label above the control. */
  label: string;
  /** Validation message shown under the control. */
  error?: string;
  /** Classes applied to the wrapping block. */
  containerClassName?: string;
}

/**
 * Password input with a show / hide toggle.
 * Figma "Password" (2:3216) and "Password field" (2:3218): the same 57px
 * control as the text input with the "Show" affordance pinned to the right,
 * 36px from the control edge.
 */
export const PasswordField = React.forwardRef<
  HTMLInputElement,
  PasswordFieldProps
>(({ className, containerClassName, label, error, id, ...props }, ref) => {
  const generatedId = React.useId();
  const controlId = id ?? generatedId;
  const errorId = error ? `${controlId}-error` : undefined;
  const [visible, setVisible] = React.useState(false);

  return (
    <div className={cn("flex w-full flex-col", containerClassName)}>
      <label
        htmlFor={controlId}
        className="text-caption font-medium leading-[1.45] text-muted"
      >
        {label}
      </label>
      <div
        className={cn(
          "mt-[8px] flex h-[57px] w-full items-center rounded-[12px] border bg-surface px-[17px] transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          error ? "border-danger" : "border-border",
        )}
      >
        <input
          id={controlId}
          ref={ref}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            "h-full w-full bg-transparent text-body leading-[1.45] text-ink outline-none placeholder:text-muted",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="ml-3 shrink-0 rounded-[6px] px-1 text-caption font-medium leading-[1.45] text-primary transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
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
});
PasswordField.displayName = "PasswordField";
