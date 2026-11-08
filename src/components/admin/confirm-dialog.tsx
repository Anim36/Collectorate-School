"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export interface ConfirmDialogProps {
  /** Heading of the dialog. */
  title: string;
  /** Supporting copy under the heading. */
  description: string;
  /** Label of the confirming action. */
  confirmLabel: string;
  /** Called when the admin confirms the action. */
  onConfirm: () => void;
  /** Called when the admin dismisses the dialog. */
  onClose: () => void;
}

/**
 * Confirmation dialog.
 *
 * Figma draws the admin modals on the reusable "Modal" surface (2:17451):
 * surface background, 1px border, 12px radius and 24px padding, with the
 * confirming action and a Cancel action under the body.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
      <Modal
        title={title}
        description={description}
        onClose={onClose}
        footer={
          <>
            <Button type="button" className="h-[47px]" onClick={onConfirm}>
              {confirmLabel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-[49px]"
              onClick={onClose}
            >
              Cancel
            </Button>
          </>
        }
      />
    </div>
  );
}
