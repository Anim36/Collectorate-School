import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { teacherWelcome } from "@/data/teacher";

export interface TeacherWelcomeProps {
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
export function TeacherWelcome({ className }: TeacherWelcomeProps) {
  return (
    <section
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-tint p-6",
        className,
      )}
    >
      <h3 className="text-title font-bold leading-[1.45] text-ink">
        {teacherWelcome.title}
      </h3>
      <p className="mt-4 text-body leading-[1.45] text-muted">
        {teacherWelcome.body}
      </p>
      <Button asChild className="mt-4 h-[49px] w-[179px] px-0">
        <Link href={teacherWelcome.actionHref}>{teacherWelcome.actionLabel}</Link>
      </Button>
    </section>
  );
}
