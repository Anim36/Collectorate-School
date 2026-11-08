"use client";

import * as React from "react";

/**
 * Keeps the keyboard inside an open overlay.
 *
 * The focus moves into the overlay when it opens, Tab cycles through the
 * controls it holds, Shift+Tab goes back, Escape closes it and the focus
 * returns to the control that opened it.
 *
 * @param open    Whether the overlay is open.
 * @param onClose Called when the reader presses Escape.
 * @param ref     The element that holds the overlay.
 */
export function useFocusTrap(
  open: boolean,
  onClose: () => void,
  ref: React.RefObject<HTMLElement | null>,
) {
  // The control that had the focus before the overlay opened, so it can be
  // given the focus back when the overlay closes.
  const openerRef = React.useRef<HTMLElement | null>(null);

  // The close handler is kept in a ref, so a new function on every render
  // does not restart the trap and pull the focus back out of the overlay.
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return;

    const node = ref.current;
    if (!node) return;

    openerRef.current = document.activeElement as HTMLElement | null;

    /** The controls the reader may move the focus to. */
    const focusables = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          element.offsetParent !== null ||
          element.getClientRects().length > 0,
      );

    // The focus moves into the overlay, so the reader is not left behind it.
    // The move waits for the current task to finish, so the key press that
    // opened the overlay cannot also activate the control it lands on.
    const focusTimer = window.setTimeout(() => {
      const first = focusables()[0];
      (first ?? node).focus({ preventScroll: true });
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;

      // Tab past the last control returns to the first, and Shift+Tab past the
      // first returns to the last.
      if (event.shiftKey && (active === firstItem || !node.contains(active))) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      // The focus goes back to the control that opened the overlay.
      openerRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, ref]);
}
