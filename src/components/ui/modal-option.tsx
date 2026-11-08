"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ModalOptionProps {
  /** Radio-style option label. */
  label: string;
  /** Marks the option as selected. */
  selected?: boolean;
  /** Click handler. */
  onSelect?: () => void;
  className?: string;
}

/**
 * Selectable option inside a modal.
 * Figma "Modal / Payment method" options (2:17442–2:17447): tinted surface,
 * 1px border, 12px radius, 24px padding and a 16px semibold primary label.
 */
export function ModalOption({
  label,
  selected = false,
  onSelect,
  className,
}: ModalOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-[12px] border border-border bg-tint p-6 text-left transition-colors",
        "hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-primary" : "border-muted",
        )}
      >
        {selected ? (
          <span className="size-2 rounded-full bg-primary" />
        ) : null}
      </span>
      <span className="text-body font-semibold leading-[1.45] text-primary">
        {label}
      </span>
    </button>
  );
}
