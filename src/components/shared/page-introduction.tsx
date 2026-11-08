import { cn } from "@/lib/utils";

export interface PageIntroductionProps {
  /** Breadcrumb line, e.g. "HOME  /  ADMISSION". */
  eyebrow: string;
  /** Page headline. */
  title: string;
  /** Supporting line under the headline. */
  description: string;
  className?: string;
}

/**
 * Page introduction block.
 * Figma "Page introduction" (2:662 desktop, 2:752 tablet, 2:839 mobile):
 * 80px padding on desktop, 32px on tablet and 24px on mobile, with 16px
 * between the lines. The headline is 40px from tablet up and 32px on mobile.
 */
export function PageIntroduction({
  eyebrow,
  title,
  description,
  className,
}: PageIntroductionProps) {
  return (
    <section
      className={cn(
        "flex w-full flex-col items-start gap-4 px-6 py-6 md:px-8 md:py-8 xl:px-20 xl:py-20",
        className,
      )}
    >
      <p className="text-caption font-bold leading-[1.45] text-primary">
        {eyebrow}
      </p>
      <h1 className="text-heading font-bold leading-[1.45] text-ink md:text-display">
        {title}
      </h1>
      <p className="text-body leading-[1.45] text-muted">{description}</p>
    </section>
  );
}
