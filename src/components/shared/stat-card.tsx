import { cn } from "@/lib/utils";

export interface StatCardProps {
  /** Metric label, e.g. "Attendance". */
  label: string;
  /** Metric value, e.g. "94.5%". */
  value: string;
  /** Optional supporting copy under the value. */
  hint?: string;
  /** Extra classes for the value line, e.g. a smaller mobile size. */
  valueClassName?: string;
  className?: string;
}

/**
 * Key metric card.
 * Figma "Stat card" (2:141–2:143): surface background, 1px border,
 * 12px radius, 24px padding, 13px medium label and a 32px semibold value.
 */
export function StatCard({
  label,
  value,
  hint,
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-3 rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <p className="text-caption font-medium leading-[1.45] text-muted">
        {label}
      </p>
      <p
        className={cn(
          "text-heading font-semibold leading-[1.45] text-ink",
          valueClassName,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="text-caption leading-[1.45] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
