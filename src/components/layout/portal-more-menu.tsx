"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LogoutButton } from "@/components/layout/logout-button";
import { portalIcons } from "@/components/layout/portal-icons";
import { isActivePortalPath } from "@/components/layout/portal-sidebar";
import type { PortalNavItem } from "@/data/portal-navigation";
import { cn } from "@/lib/utils";

export interface PortalMoreMenuProps {
  /** Entries revealed by the menu. */
  items: readonly PortalNavItem[];
  /** Accessible label for the menu. */
  label: string;
}

/**
 * Overflow menu behind the "More" bottom tab.
 *
 * The Figma portal frames only show the closed tab bar, so this menu follows
 * the reusable "Modal" surface (Figma "Modal / Payment method", 2:17451):
 * surface background, 1px border, 12px radius and 24px padding. The entries
 * reuse the sidebar's row styling so the two navigations stay in step.
 */
export function PortalMoreMenu({ items, label }: PortalMoreMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on Escape and when focus leaves the menu.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls="portal-more-menu"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-start gap-1 overflow-hidden rounded-[8px] px-1 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open ? "text-primary" : "text-muted hover:text-primary",
        )}
      >
        <Ellipsis aria-hidden className="size-6 shrink-0" />
        <span className="whitespace-nowrap text-[10px] font-medium leading-[1.5] md:text-caption">
          More
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-foreground/40"
          />

          <div
            ref={panelRef}
            id="portal-more-menu"
            role="menu"
            aria-label={label}
            className="fixed inset-x-3 bottom-[79px] z-50 flex flex-col gap-2 rounded-[12px] border border-border bg-surface p-6 shadow-overlay md:inset-x-auto md:bottom-[107px] md:left-6 md:w-[320px]"
          >
            <p className="text-caption font-semibold uppercase tracking-wide text-muted">
              More
            </p>

            {items.map((item) => {
              const isActive = isActivePortalPath(pathname, item.href);
              const Icon = item.icon ? portalIcons[item.icon] : null;

              // The sign-out entry posts to the logout action instead of
              // linking away, so the session is torn down and the sign-out
              // is recorded.
              if (item.kind === "logout") {
                return (
                  <LogoutButton
                    key={item.label}
                    label={item.label}
                    showLabel={Boolean(Icon)}
                    className="w-full items-center gap-3 rounded-[12px] px-3 py-3 text-ink hover:bg-tint hover:text-primary"
                    iconClassName="size-6 shrink-0"
                  />
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[12px] px-3 py-3 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-tint text-primary"
                      : "text-ink hover:bg-tint hover:text-primary",
                  )}
                >
                  {Icon ? (
                    <Icon aria-hidden className="size-6 shrink-0" />
                  ) : null}
                  <span className="text-body-md font-medium leading-[1.45]">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}
    </>
  );
}
