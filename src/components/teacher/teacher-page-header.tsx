import { cn } from "@/lib/utils";

export interface TeacherPageHeaderProps {
  /** Page headline, e.g. "Good morning, Nusrat." */
  title: string;
  /** Supporting line under the headline. */
  description: string;
  className?: string;
}

/**
 * The greeting block that opens every teacher page.
 *
 * Figma "Good morning, Nusrat." (2:6463 desktop, 2:6627 tablet, 2:6784 mobile)
 * and the matching "Attendance Sheet" (2:6969 / 2:7151 / 2:7326) and
 * "Attendance history" (2:7541 / 2:7671 / 2:7794) headings:
 *
 * - Desktop and tablet: a 46px title, a 24px gap and a 23px context line, so
 *   the block is 93px tall.
 * - Mobile (375): a 41px title and a context line that wraps onto two lines,
 *   so the block is 111px tall.
 */
export function TeacherPageHeader({
  title,
  description,
  className,
}: TeacherPageHeaderProps) {
  return (
    <div className={cn("flex w-full flex-col items-start", className)}>
      <h2 className="text-[28px] font-bold leading-[1.45] text-ink md:text-heading">
        {title}
      </h2>
      <p className="mt-6 text-body leading-[1.45] text-muted">{description}</p>
    </div>
  );
}
