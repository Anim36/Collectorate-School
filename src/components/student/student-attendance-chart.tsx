import { cn } from "@/lib/utils";

export interface StudentAttendanceChartProps {
  /** One bar per month. */
  points: readonly {
    label: string;
    value: number;
    barHeight: number;
  }[];
  className?: string;
}

/**
 * Attendance trend chart.
 * Figma "Your attendance at a glance" (2:3684 desktop, 2:3750 tablet,
 * 2:3836 mobile): a 345px card holding a 29px title, a 19px caption, the
 * 180px plot and the month labels.
 *
 * The plot is a plain CSS bar chart: four 1px gridlines, then six bars whose
 * heights are the ones Figma draws (130, 144, 126, 152, 160 and 164px).
 * Figma gives every bar the same 10px gap, so the bars share the width
 * evenly.
 */
export function StudentAttendanceChart({
  points,
  className,
}: StudentAttendanceChartProps) {
  return (
    <section
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <h3 className="text-body-lg font-semibold leading-[1.45] text-ink">
        Your attendance at a glance
      </h3>
      <p className="mt-4 text-caption leading-[1.45] text-muted">
        Attendance / school days
      </p>

      {/* Plot. */}
      <div
        className="relative mt-4 flex h-[180px] w-full items-end"
        role="img"
        aria-label={`Attendance for the last ${points.length} months: ${points
          .map((point) => `${point.label} ${point.value}%`)
          .join(", ")}`}
      >
        {[20, 65, 110, 155].map((offset) => (
          <span
            key={offset}
            aria-hidden
            className="absolute left-0 h-px w-full bg-border"
            style={{ top: offset }}
          />
        ))}

        <div className="flex h-full w-full items-end gap-[10px] px-[5px]">
          {points.map((point) => (
            <div
              key={point.label}
              className="flex h-full flex-1 items-end"
            >
              <span
                className="w-full rounded-t-[4px] bg-primary"
                style={{ height: point.barHeight }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Month labels. */}
      <div className="mt-4 flex w-full items-center justify-between gap-[10px]">
        {points.map((point) => (
          <span
            key={point.label}
            className="flex-1 text-caption leading-[1.45] text-muted"
          >
            {point.label}
          </span>
        ))}
      </div>
    </section>
  );
}
