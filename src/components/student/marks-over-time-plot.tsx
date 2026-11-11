"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { StudentPerformancePoint } from "@/types/student";

/**
 * The four horizontal rules Figma draws inside the plot.
 * They sit 20px from the top and then every 45px, which is the pitch the
 * attendance chart uses as well.
 */
const GRIDLINES = [20, 65, 110, 155];

export interface MarksOverTimePlotProps {
  /** One mark per month, in order. */
  points: readonly StudentPerformancePoint[];
}

/**
 * The plot of the marks-over-time card.
 *
 * Recharts is heavy, so this module is loaded on demand by
 * `marks-over-time-chart.tsx` and lands in its own chunk. The chart keeps
 * Figma's geometry: four horizontal rules 45px apart, inset 20px from the top
 * and 25px from the bottom of the 180px plot, and the line inset 12px from
 * each edge.
 */
export function MarksOverTimePlot({ points }: MarksOverTimePlotProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={[...points]}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        <CartesianGrid
          vertical={false}
          stroke="currentColor"
          className="text-border"
          horizontalPoints={GRIDLINES}
        />
        <XAxis
          dataKey="label"
          hide
          height={0}
          padding={{ left: 12, right: 12 }}
        />
        <YAxis
          hide
          width={0}
          domain={[60, 90]}
          ticks={[60, 70, 80, 90]}
          padding={{ top: 20, bottom: 25 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          dot={false}
          activeDot={{ r: 5 }}
          stroke="currentColor"
          strokeWidth={3}
          className="text-primary"
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
