"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ToastCardProps {
  /** Short status line, e.g. "Changes saved". */
  title: string;
  /** Supporting message. */
  message: string;
  /** Optional trailing action. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Toast card.
 * Figma "Toast" (2:137–2:139): surface background, 1px border, 12px radius,
 * 16px padding, a 13px medium muted title and a 16px message.
 */
export function ToastCard({
  title,
  message,
  action,
  className,
}: ToastCardProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full flex-col items-start gap-2 rounded-[12px] border border-border bg-surface p-4",
        className,
      )}
    >
      <p className="text-caption font-medium leading-[1.45] text-muted">
        {title}
      </p>
      <p className="text-body leading-[1.45] text-ink">{message}</p>
      {action}
    </div>
  );
}
