import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { studentWelcome } from "@/data/student";

export interface StudentWelcomeProps {
  className?: string;
}

/**
 * The welcome panel above the dashboard metrics.
 *
 * Figma "Learning welcome" (2:3662 desktop, 2:3728 tablet, 2:3813 mobile):
 *
 * - Desktop and tablet: a 189px panel with a 35px title, a 23px body line
 *   and a 49px action button.
 * - Mobile (375): the title and body each wrap to two lines, so the panel
 *   grows to 270px.
 *
 * The panel keeps Figma's 16px rhythm between its three children.
 */
export function StudentWelcome({ className }: StudentWelcomeProps) {
  return (
    <section
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-tint p-6",
        className,
      )}
    >
      <h3 className="text-title font-bold leading-[1.45] text-ink">
        {studentWelcome.title}
      </h3>
      <p className="mt-4 text-body leading-[1.45] text-muted">
        {studentWelcome.body}
      </p>
      <Button asChild className="mt-4 h-[49px] w-[194px] px-0">
        <Link href={studentWelcome.actionHref}>
          {studentWelcome.actionLabel}
        </Link>
      </Button>
    </section>
  );
}
