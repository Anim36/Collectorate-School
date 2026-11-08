import { cn } from "@/lib/utils";

export interface NoticeCardProps {
  /** Date line shown above the category. */
  date: string;
  /** Category label, e.g. "ACADEMIC". */
  category: string;
  /** Notice headline. */
  title: string;
  /** Optional supporting copy. */
  description?: string;
  /** When present the card renders a "Read notice →" link. */
  href?: string;
  className?: string;
}

/**
 * Notice card — the compact variant used in listings.
 * Figma "Notice card" (2:144–2:146): surface background, 1px border,
 * 12px radius, 24px padding, 13px medium meta and a 16px semibold title.
 */
export function NoticeCard({
  date,
  category,
  title,
  description,
  href,
  className,
}: NoticeCardProps) {
  return (
    <article
      className={cn(
        "flex w-full flex-col items-start gap-3 rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <p className="text-caption font-medium leading-[1.45] text-muted">
        {category} • {date}
      </p>
      <h3 className="text-body font-semibold leading-[1.45] text-ink">
        {title}
      </h3>
      {description ? (
        <p className="text-body leading-[1.45] text-muted">{description}</p>
      ) : null}
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
