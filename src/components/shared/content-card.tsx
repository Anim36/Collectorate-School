import { cn } from "@/lib/utils";

export interface ContentCardProps {
  /** Card heading. */
  title: string;
  /** Supporting copy under the heading. */
  description: string;
  className?: string;
}

/**
 * Simple content card.
 * Figma card pattern (2:141–2:155): surface background, 1px border,
 * 12px radius, 25px padding, a 24px semibold heading (a 35px line box) and
 * 16px muted copy 51px from the card edge.
 */
export function ContentCard({
  title,
  description,
  className,
}: ContentCardProps) {
  return (
    <article
      className={cn(
        "flex w-full flex-col items-start gap-4 rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <h3 className="text-title font-semibold leading-[1.45] text-ink">
        {title}
      </h3>
      <p className="text-body leading-[1.45] text-muted">{description}</p>
    </article>
  );
}
