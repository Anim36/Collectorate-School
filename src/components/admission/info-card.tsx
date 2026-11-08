import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface InfoCardProps {
  /** Card heading, e.g. "Required documents". */
  title: string;
  /** Bullet lines rendered under the heading. */
  items: readonly string[];
  className?: string;
}

/**
 * "Before you apply" information card.
 * Figma "Required documents" (2:683) and "Important dates" (2:686): surface
 * background, 1px border, 12px radius, 25px padding, a 24px semibold title
 * and 16px copy. The document list uses a check glyph, the dates list uses
 * plain text, so the bullet style is chosen per card.
 */
export function InfoCard({ title, items, className }: InfoCardProps) {
  const usesCheckList = title === "Required documents";

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
      <ul className="flex w-full flex-col items-start">
        {items.map((item) => (
          <li
            key={item}
            className="flex w-full items-start gap-2 text-body leading-[1.45] text-muted"
          >
            {usesCheckList ? (
              <Check
                aria-hidden
                className="mt-[3px] size-4 shrink-0 text-success"
              />
            ) : null}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
