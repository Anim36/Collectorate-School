import { cn } from "@/lib/utils";

export interface PageSectionHeadingProps {
  /** Section heading. */
  title: string;
  /** Anchor id, so a fragment link can jump to this section. */
  id?: string;
  className?: string;
}

/**
 * Section heading inside a public page body.
 * Figma uses a 24px bold heading (a 35px line box) above each block of cards;
 * on mobile the same headings wrap to two lines (a 70px line box).
 */
export function PageSectionHeading({
  title,
  id,
  className,
}: PageSectionHeadingProps) {
  return (
    <h2
      id={id}
      className={cn(
        "text-title font-bold leading-[1.45] text-ink",
        "scroll-mt-24",
        className,
      )}
    >
      {title}
    </h2>
  );
}
