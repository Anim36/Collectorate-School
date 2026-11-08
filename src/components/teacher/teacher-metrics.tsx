import { StatCard } from "@/components/shared/stat-card";
import { cn } from "@/lib/utils";

export interface TeacherMetricsProps {
  /** Metrics rendered in the row. */
  metrics: readonly {
    label: string;
    value: string;
  }[];
  className?: string;
}

/**
 * Key-metric row for the teacher portal.
 *
 * Figma "Teacher metrics" (2:6470 desktop, 2:6634 tablet, 2:6791 and 2:6798
 * mobile) and the attendance counters (2:6985 desktop, 2:7167 tablet,
 * 2:7342 and 2:7349 mobile):
 *
 * - Desktop (1440): four 272px cards in one row, 16px apart, 126px tall.
 * - Tablet (768): four 164px cards in one row, 16px apart.
 * - Mobile (375): two 155.5px cards per row, 16px apart, in two rows of
 *   126px that are 24px apart.
 *
 * The cards carry no hint line, so the label sits 25px from the top and the
 * 32px value 60px below it.
 *
 * The mobile frame draws the two rows as separate frames, so on mobile the
 * wrapper dissolves and each row becomes a block of the page body. From tablet
 * up the wrapper is a four-column grid and the rows dissolve into it, which
 * puts all four cards on a single line.
 */
export function TeacherMetrics({ metrics, className }: TeacherMetricsProps) {
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
              className="gap-4"
              valueClassName="text-[28px]"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
