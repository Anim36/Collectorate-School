import { cn } from "@/lib/utils";

export interface SectionHeadingProps {
  /** Small primary-coloured label above the heading. */
  eyebrow: string;
  /** Section heading. */
  title: string;
  /** Optional supporting line under the heading. */
  description?: string;
  className?: string;
}

/**
 * Eyebrow + heading pair used by every home page section.
 * Figma renders a 13px bold primary eyebrow above a heading that is 32px on
 * tablet and desktop and 28px on mobile (a 41px line box).
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex w-full flex-col items-start gap-6", className)}>
      <p className="text-caption font-bold leading-[1.45] text-primary">
        {eyebrow}
      </p>
      <h2 className="text-[28px] font-bold leading-[1.45] text-ink md:text-heading">
        {title}
      </h2>
      {description ? (
        <p className="text-body leading-[1.45] text-muted">{description}</p>
      ) : null}
    </div>
  );
}
