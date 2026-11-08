import { cn } from "@/lib/utils";

export interface StepCardProps {
  /** Step label, e.g. "01 / Explore". */
  title: string;
  /** One-line explanation of the step. */
  description: string;
  className?: string;
}

/**
 * Admission journey step card.
 * Figma "Cards 0" inside "Admission main" (2:669 / 2:672 / 2:675 / 2:678):
 * surface background, 1px border, 12px radius, 24px padding, a 24px semibold
 * title 25px from the card edge and 16px muted copy 76px from the edge —
 * that is a 35px title line box, a 17px gap and a 46px two-line body.
 */
export function StepCard({ title, description, className }: StepCardProps) {
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
