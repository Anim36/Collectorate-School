import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TeacherWelcomeProps {
  /** The copy of the panel, read from the database. */
  welcome: {
    /** The headline of the panel. */
    title: string;
    /** The line under the headline. */
    body: string;
    /** The label of the action button. */
    actionLabel: string;
    /** Where the action button leads. */
    actionHref: string;
  };
  className?: string;
}

/**
 * The welcome panel above the dashboard metrics.
 *
 * Figma "Today's teaching plan" (2:6465 desktop, 2:6629 tablet, 2:6786
 * mobile):
 *
 * - Desktop and tablet: a 189px panel with a 35px title, a 23px body line
 *   and a 49px action button.
 * - Mobile (375): the body line wraps onto two lines, so the panel grows to
 *   212px.
 *
 * The panel keeps Figma's 16px rhythm between its three children.
 */
export function TeacherWelcome({ welcome, className }: TeacherWelcomeProps) {
  return (
    <section
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-tint p-6",
        className,
      )}
    >
      <h3 className="text-title font-bold leading-[1.45] text-ink">
        {welcome.title}
      </h3>
      <p className="mt-4 text-body leading-[1.45] text-muted">
        {welcome.body}
      </p>
      <Button asChild className="mt-4 h-[49px] w-[179px] px-0">
        <Link href={welcome.actionHref}>{welcome.actionLabel}</Link>
      </Button>
    </section>
  );
}
