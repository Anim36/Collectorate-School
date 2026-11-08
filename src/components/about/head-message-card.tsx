import Image from "next/image";

import { cn } from "@/lib/utils";

export interface HeadMessageCardProps {
  /** Portrait path inside /public/images. */
  imageSrc: string;
  /** Alternative text for the portrait. */
  imageAlt: string;
  /** The quoted headline. */
  quote: string;
  /** Attribution line, e.g. "Md. Anisur Rahman · Head of Institution". */
  attribution: string;
  /** Supporting paragraph under the attribution. */
  body: string;
  className?: string;
}

/**
 * Head of institution message card.
 * Figma "Head's message" (2:1264 desktop, 2:1357 tablet, 2:1451 mobile):
 * 24px padding, a 320×240 portrait, a 24px quote 16px below it and the
 * attribution and body copy as one block 16px under the quote.
 */
export function HeadMessageCard({
  imageSrc,
  imageAlt,
  quote,
  attribution,
  body,
  className,
}: HeadMessageCardProps) {
  return (
    <article
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <div className="relative h-[240px] w-full max-w-[320px] overflow-hidden rounded-[12px]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(min-width: 768px) 320px, 100vw"
          className="object-cover"
        />
      </div>

      <h3 className="mt-4 text-title font-bold leading-[1.45] text-ink">
        {quote}
      </h3>

      <p className="mt-4 text-body leading-[1.45]">
        <span className="font-semibold text-ink">{attribution}</span>
        <br />
        <span className="text-muted">{body}</span>
      </p>
    </article>
  );
}
