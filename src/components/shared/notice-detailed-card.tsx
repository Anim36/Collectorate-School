import { cn } from "@/lib/utils";

export interface NoticeDetailedCardProps {
  /** Date line shown above the category. */
  date: string;
  /** Category label, e.g. "ACADEMIC". */
  category: string;
  /** Notice headline. */
  title: string;
  /** Supporting copy. */
  description: string;
  /** Optional link target for the "Read notice →" affordance. */
  href?: string;
  className?: string;
}

/**
 * Notice card — the detailed variant with a description and link.
 * Figma "Notice / Detailed card" (2:17471–2:17470): 13px date, 13px bold
 * primary category, 20px semibold title, 16px muted description and a 13px
 * semibold primary link.
 */
export function NoticeDetailedCard({
  date,
  category,
  title,
  description,
  href,
  className,
}: NoticeDetailedCardProps) {
  return (
    <article
      className={cn(
        "flex w-full flex-col items-start gap-4 overflow-hidden rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <p className="text-caption font-medium leading-[1.45] text-muted">
        {date}
      </p>
      <p className="text-caption font-bold leading-[1.45] text-primary">
        {category}
      </p>
      <h3 className="text-body-lg font-semibold leading-[1.45] text-ink">
        {title}
      </h3>
      <p className="text-body leading-[1.45] text-muted">{description}</p>
      {href ? (
        <a
          href={href}
          className="text-caption font-semibold leading-[1.45] text-primary"
        >
          Read notice →
        </a>
      ) : null}
    </article>
  );
}
