import { cn } from "@/lib/utils";
import type { SubjectMark } from "@/data/student";

export interface SubjectMarkBarsProps {
  /** One bar per subject, in order. */
  marks: readonly SubjectMark[];
  className?: string;
}

/**
 * Subject-wise mark bars.
 * Figma "Subject marks" (2:4697 desktop, 2:4766 tablet, 2:4855 mobile):
 * a 506px card holding eight rows. Each row is a 19px caption line and an
 * 8px bar, and the rows sit on a 59px pitch.
 *
 * Figma draws the label and the mark on one line — "Bangla  ·  86/100" — so
 * the bar follows 16px below it and the next label starts 59px after the
 * previous one.
 */
export function SubjectMarkBars({ marks, className }: SubjectMarkBarsProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      {marks.map((entry, index) => (
        <div
          key={entry.subject}
          className={cn("w-full", index < marks.length - 1 && "pb-4")}
        >
          <p className="text-caption leading-[1.45] text-ink">
            {entry.subject}
            {"  ·  "}
            {entry.mark}/100
          </p>

          {/* Bar. */}
          <div
            className="mt-4 h-2 w-full overflow-hidden rounded-[4px] bg-tint"
            role="img"
            aria-label={`${entry.subject}: ${entry.mark} out of 100`}
          >
            <span
              className="block h-full rounded-[4px] bg-primary"
              style={{ width: `${entry.mark}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
