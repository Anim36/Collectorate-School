"use client";

import * as React from "react";
import { X } from "lucide-react";

import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn } from "@/lib/utils";

export interface ModalProps {
  /** Modal heading. */
  title: string;
  /** Supporting copy under the heading. */
  description?: string;
  /** Body content — form rows, option lists, etc. */
  children?: React.ReactNode;
  /** Footer actions. */
  footer?: React.ReactNode;
  /** Called when the reader dismisses the modal. */
  onClose?: () => void;
  /** Accessible label for the close control. */
  closeLabel?: string;
  className?: string;
}

/**
 * Modal dialog.
 * Figma "Modal / Payment method" (2:17451–2:17440): surface background,
 * 1px border, 12px radius, 24px padding, a 24px semibold title with a close
 * glyph, 16px muted description and footer actions.
 */
export function Modal({
  title,
  description,
  children,
  footer,
  onClose,
  closeLabel = "Close dialog",
  className,
}: ModalProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);

  // The focus stays inside the dialog, Escape closes it and the focus goes
  // back to the control that opened it.
  useFocusTrap(true, () => onClose?.(), panelRef);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "flex w-full max-w-[560px] flex-col items-start gap-4 overflow-hidden rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      {/* The close glyph sits on the title line, as Figma draws it, so it is
          taken out of the flow: the header row stays one title line tall. */}
      <div className="relative flex w-full items-start justify-between gap-4">
        <h2
          id={titleId}
          className="text-title font-semibold leading-[1.45] text-ink"
        >
          {title}
        </h2>
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="absolute right-0 top-0 flex size-11 shrink-0 items-center justify-center rounded-[12px] text-muted transition-colors hover:bg-tint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      {description ? (
        <p
          id={descriptionId}
          className="text-body leading-[1.45] text-muted"
        >
          {description}
        </p>
      ) : null}

      {children}

      {footer ? (
        <div className="flex w-full flex-col items-start gap-4">{footer}</div>
      ) : null}
    </div>
  );
}
