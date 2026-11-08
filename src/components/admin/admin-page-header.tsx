import { cn } from "@/lib/utils";

export interface AdminPageHeaderProps {
  /** Page headline, e.g. "Your school, at a glance.". */
  title: string;
  /** Supporting line under the headline. */
  description: string;
  /**
   * Control shown on the heading row, on the trailing edge.
   * A page that splits into two views puts its switcher here, so the block
   * keeps the height Figma measures.
   */
  aside?: React.ReactNode;
  className?: string;
}

/**
 * The greeting block that opens every admin page.
 *
 * Figma "Your school, at a glance." (2:9632 desktop, 2:9790 tablet,
 * 2:9941 mobile) and the matching "Users" (2:10131 / 2:10270 / 2:10402),
 * "Classes and Subjects" (2:11577 / 2:11724 / 2:11864) headings:
 *
 * - Desktop and tablet: a 46px title, a 24px gap and a 23px context line, so
 *   the block is 93px tall.
 * - Mobile (375): a 41px title that wraps onto two lines and a context line
 *   that wraps as well, so the block is 111px tall.
 */
export function AdminPageHeader({
  title,
  description,
  aside,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn("flex w-full flex-col items-start", className)}>
      <div className="flex w-full items-start justify-between gap-4">
        <h2 className="text-[28px] font-bold leading-[1.45] text-ink md:text-heading">
          {title}
        </h2>

        {aside}
      </div>

      <p className="mt-6 text-body leading-[1.45] text-muted">{description}</p>
    </div>
  );
}
