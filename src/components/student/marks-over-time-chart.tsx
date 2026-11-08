"use client";

import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";
import type { PerformancePoint } from "@/data/student";

export interface MarksOverTimeChartProps {
  /** One mark per month, in order. */
  points: readonly PerformancePoint[];
  className?: string;
}

/**
 * The offsets of the four grid rules inside the 180px plot, measured from the
 * top. They sit 20px down and then every 45px.
 */
const PLOT_GRIDLINES = [20, 65, 110, 155];

/**
 * Marks over time.
 * Figma "Your marks over time" (2:4686 desktop, 2:4755 tablet, 2:4844 mobile):
 * a 345px card holding a 29px title, a 19px caption, the 180px plot and the
 * month labels.
 *
 * The plot keeps Figma's geometry: four horizontal rules 45px apart, inset
 * 20px from the top and 25px from the bottom of the 180px plot, and the
 * line inset 12px from each edge. The rules sit at 90, 80, 70 and 60 marks,
 * so the line reads against the band Figma draws it in.
 *
 * Recharts is heavy, so the plot is loaded on demand: it lands in its own
 * chunk and the skeleton below holds the exact 180px height Figma measures,
 * so the page does not shift when the chart arrives.
 */
export function MarksOverTimeChart({
  points,
  className,
}: MarksOverTimeChartProps) {
  return (
    <section
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <h3 className="text-body-lg font-semibold leading-[1.45] text-ink">
        Your marks over time
      </h3>
      <p className="mt-4 text-caption leading-[1.45] text-muted">
        Marks / 100&nbsp;&nbsp;•&nbsp;&nbsp;Consistent progress
      </p>

      {/* Plot. */}
      <div
        className="mt-4 h-[180px] w-full"
        role="img"
        aria-label={`Marks over time: ${points
          .map((point) => `${point.label} ${point.value}`)
          .join(", ")}`}
      >
        <MarksOverTimePlot points={points} />
      </div>

      {/* Month labels. */}
      <div className="mt-4 flex w-full items-center justify-between">
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

const MarksOverTimePlot = dynamic(
  () =>
    import("@/components/student/marks-over-time-plot").then(
      (module) => module.MarksOverTimePlot,
    ),
  {
    ssr: false,
    loading: () => <PlotSkeleton />,
  },
);

/**
 * The plot drawn while the chart chunk is on its way.
 *
 * It keeps the 180px height of the real plot and the four grid rules Figma
 * draws, at the same offsets, so the card holds its geometry while the chart
 * loads.
 */
function PlotSkeleton() {
  return (
    <div aria-hidden className="relative h-full w-full">
      {PLOT_GRIDLINES.map((offset) => (
        <span
          key={offset}
          className="absolute left-0 block h-px w-full bg-border"
          style={{ top: offset }}
        />
      ))}
    </div>
  );
}
