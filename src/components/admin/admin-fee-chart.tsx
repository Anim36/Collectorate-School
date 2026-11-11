import * as React from "react";

import { cn } from "@/lib/utils";
import type { AdminFeeMonth } from "@/types/admin-11c";

export interface AdminFeeChartProps {
  /** One bar per month, in order. */
  months: readonly AdminFeeMonth[];
  className?: string;
}

/**
 * Fee collection overview.
 * Figma "Fee collection overview" (2:9651 desktop, 2:9809 tablet, 2:9961
 * mobile) and the matching dark frames:
 *
 * - Desktop (1440): a 385px card holding a 29px title, a 19px caption, the
 *   220px plot and the 19px month labels.
 * - Tablet (768): the same card, 704px wide.
 * - Mobile (375): the title wraps onto two lines (a 58px block), the labels
 *   wrap onto two lines as well, so the card is 433px tall.
 *
 * The plot is a plain CSS bar chart, as the attendance chart is: six bars whose
 * heights follow the money that was really collected in each month, sitting
 * on a 220px baseline. The bars are inset 6px from the plot and 12px apart,
 * which is the rhythm Figma measures.
 */
export function AdminFeeChart({ months, className }: AdminFeeChartProps) {
  return (
    <section
      className={cn(
        "flex w-full flex-col items-start rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <h3 className="text-body-lg font-semibold leading-[1.45] text-ink">
        Fees collected · Last 6 months
      </h3>
      <p className="mt-4 text-caption leading-[1.45] text-muted">
        BDT thousands · Collected each month
      </p>

      {/* Plot. */}
      <div
        className="relative mt-4 flex h-[220px] w-full items-end"
        role="img"
        aria-label={`Fees collected over the last ${months.length} months: ${months
          .map((month) => `${month.label} ${month.amount}`)
          .join(", ")}`}
      >
        <div className="flex h-full w-full items-end gap-[12px] px-[6px]">
          {months.map((month) => (
            <div
              key={month.label}
              className="flex h-full flex-1 items-end"
            >
              <span
                className="w-full rounded-t-[4px] bg-primary"
                style={{ height: month.barHeight }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Month labels. Figma draws them as one run of text, so they wrap
          together on the narrow card. */}
      <p className="mt-4 w-full text-caption leading-[1.45] text-muted">
        {months.map((month, index) => (
          <React.Fragment key={month.label}>
            {index > 0 ? "   " : null}
            {month.label} {month.amount}
          </React.Fragment>
        ))}
      </p>
    </section>
  );
}
