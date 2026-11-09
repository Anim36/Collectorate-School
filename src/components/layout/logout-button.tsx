"use client";

import { LogOut } from "lucide-react";

import { logoutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

export interface LogoutButtonProps {
  /** The class names of the row, so the button matches the navigation it sits in. */
  className?: string;
  /** The label of the row. */
  label?: string;
  /** Whether the label is shown beside the icon. */
  showLabel?: boolean;
  /** The size of the icon. */
  iconClassName?: string;
}

/**
 * The sign-out control.
 *
 * It posts to the logout server action, which records the sign-out in the
 * audit log and tears the session down before sending the user to the
 * sign-in page.
 */
export function LogoutButton({
  className,
  label = "Logout",
  showLabel = true,
  iconClassName,
}: LogoutButtonProps) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        data-portal="logout"
        className={cn(
          "flex items-center gap-3 rounded-[8px] p-3 text-left transition-colors",
          "text-white hover:bg-white/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy",
          className,
        )}
      >
        <LogOut aria-hidden className={iconClassName ?? "size-6 shrink-0"} />
        {showLabel ? (
          <span className="w-[120px] shrink-0 font-medium leading-[1.45] text-caption">
            {label}
          </span>
        ) : null}
      </button>
    </form>
  );
}
