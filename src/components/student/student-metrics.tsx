import { StatCard } from "@/components/shared/stat-card";
import { cn } from "@/lib/utils";

export interface StudentMetricsProps {
  /** Metrics rendered in the row. */
  metrics: readonly {
    label: string;
    value: string;
    hint: string;
  }[];
  className?: string;
}

/** Matches a value that carries Bengali script, e.g. the taka sign. */
const BENGALI = /[ঀ-৿]/;

/**
 * Key-metric row.
 *
 * Figma "Key metrics 0" (2:3667 desktop, 2:3733 tablet, 2:3818 mobile) and
 * "Key metrics 2" (2:3827 mobile):
 *
 * - Desktop (1440): four 272px cards in one row, 16px apart, 166px tall.
 * - Tablet (768): four 164px cards in one row, 16px apart. A card grows with
 *   its copy, so the tallest one ("Fee due") makes the row 212px tall.
 * - Mobile (375): two 155.5px cards per row, 16px apart, in two rows of
 *   155px that are 24px apart.
 *
 * The mobile frame draws the two rows as separate frames, so on mobile the
 * wrapper dissolves and each row becomes a block of the page body. From
 * tablet up the wrapper is a four-column grid and the rows dissolve into it,
 * which puts all four cards on a single line.
 *
 * Each card follows Figma's "Key metrics" card: a 13px label, a 16px gap, a
 * 32px value, a 16px gap and a 13px hint, inset 25px vertically (24px
 * padding plus the 1px border) and 17px horizontally on mobile.
 *
 * The horizontal padding is one pixel under Figma's, because Figma measures
 * its text box from the padding alone: a 164px card holds a 116px line, which
 * is 48px less than the card. The 1px border would take that to 114px, and
 * "Across all subjects" is 115px wide, so it would wrap where Figma keeps it
 * on one line.
 */
export function StudentMetrics({ metrics, className }: StudentMetricsProps) {
  const rows = [metrics.slice(0, 2), metrics.slice(2, 4)];

  return (
    <div className={cn("contents md:grid md:grid-cols-4 md:gap-x-4", className)}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid w-full grid-cols-2 items-start gap-4 md:contents"
        >
          {row.map((metric) => (
            <StatCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              hint={metric.hint}
              className="gap-4 px-[15px] py-6 md:px-[23px]"
              valueClassName={cn(
                "text-title md:text-heading",
                BENGALI.test(metric.value) && "font-numeric-bengali",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
