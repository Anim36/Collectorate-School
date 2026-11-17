import Image from "next/image";

import { cn } from "@/lib/utils";

export interface TeacherCardProps {
  /** Teacher photograph inside /public/images. */
  imageSrc: string;
  /** Alternative text for the portrait. */
  imageAlt: string;
  /** Intrinsic width of the portrait. */
  imageWidth: number;
  /** Intrinsic height of the portrait. */
  imageHeight: number;
  /** Teacher's full name. */
  name: string;
  /** Role and subject line. */
  designation: string;
  /**
   * Contact address, when the member has one the school publishes.
   *
   * There is no public-contact flag yet, so the directory passes none: the
   * line disappears instead of showing an address the school has not chosen
   * to publish.
   */
  email?: string;
  className?: string;
}

/**
 * Teacher profile card.
 * Figma "Teacher card" (2:17458–2:17457): surface background, 1px border,
 * 12px radius, 24px padding, 220px portrait, 20px name, 16px designation and
 * a 13px primary-coloured email.
 */
export function TeacherCard({
  imageSrc,
  imageAlt,
  imageWidth,
  imageHeight,
  name,
  designation,
  email,
  className,
}: TeacherCardProps) {
  return (
    <article
      className={cn(
        "flex w-full flex-col items-start gap-4 overflow-hidden rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={imageWidth}
        height={imageHeight}
        className="h-[220px] w-full rounded-[12px] object-cover"
      />
      <h3 className="text-body-lg font-semibold leading-[1.45] text-ink">
        {name}
      </h3>
      <p className="text-body leading-[1.45] text-muted">{designation}</p>
      {email ? (
        <p className="text-caption leading-[1.45] text-primary">
          <a href={`mailto:${email}`}>{email}</a>
        </p>
      ) : null}
    </article>
  );
}
