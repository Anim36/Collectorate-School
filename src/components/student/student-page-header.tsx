import { cn } from "@/lib/utils";

export interface StudentPageHeaderProps {
  /** Page headline, e.g. "Good morning, Arif." */
  title: string;
  /** Supporting line under the headline. */
  description: string;
  className?: string;
}

/**
 * The greeting block that opens every student page.
 *
 * Figma "Good morning, Arif." (2:3660 desktop, 2:3726 tablet, 2:3811 mobile)
 * and the matching "My Profile" (2:3934) and "Attendance" (2:4176) headings:
 *
 * - Desktop and tablet: a 46px title, a 24px gap and a 23px context line, so
 *   the block is 93px tall.
 * - Mobile (375): a 41px title and a context line that wraps onto two lines,
 *   so the block is 111px tall.
 */
export function StudentPageHeader({
  title,
  description,
  className,
}: StudentPageHeaderProps) {
  return (
    <div className={cn("flex w-full flex-col items-start", className)}>
      <h2 className="text-[28px] font-bold leading-[1.45] text-ink md:text-heading">
        {title}
      </h2>
      <p className="mt-6 text-body leading-[1.45] text-muted">{description}</p>
    </div>
  );
}
