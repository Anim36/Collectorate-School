import { StatCard } from "@/components/shared/stat-card";
import { cn } from "@/lib/utils";
import type { AdminMetric } from "@/data/admin";

export interface AdminMetricsProps {
  /** Metrics rendered in the row. */
  metrics: readonly AdminMetric[];
  className?: string;
}

/** Matches a value that carries Bengali script, e.g. the taka sign. */
const BENGALI = /[ঀ-৿]/;

/**
 * Key-metric row.
 *
 * Figma "Admin metrics" (2:9634 desktop, 2:9792 tablet, 2:9943 and 2:9952
 * mobile) and the matching dark frames:
 *
 * - Desktop (1440): four 272px cards in one row, 16px apart, 166px tall.
 * - Tablet (768): four 164px cards in one row, 16px apart, 166px tall.
 * - Mobile (375): two 155.5px cards per row, 16px apart, in two rows of 174px
 *   and 155px that are 24px apart.
 *
 * The mobile frame draws the two rows as separate frames, so on mobile the
 * wrapper dissolves and each row becomes a block of the page body. From tablet
 * up the wrapper is a four-column grid and the rows dissolve into it, which
 * puts all four cards on a single line.
 *
 * Each card follows Figma's "Admin metrics" card: a 13px label, a 16px gap, a
 * 32px value, a 16px gap and a 13px hint, inset 25px vertically and 17px
 * horizontally.
 */
export function AdminMetrics({ metrics, className }: AdminMetricsProps) {
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
              className="gap-4 px-4 py-6"
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
