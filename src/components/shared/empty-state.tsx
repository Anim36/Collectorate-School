import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Short supporting line, e.g. "You’re all caught up". */
  message: string;
  /** Primary statement, e.g. "New notices will appear here." */
  title: string;
  /** Optional call to action. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Empty state panel.
 * Figma "Empty state" (2:147–2:149): surface background, 1px border,
 * 12px radius, 24px padding, 13px medium message and a 16px semibold title.
 */
export function EmptyState({
  message,
  title,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-3 rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <p className="text-caption font-medium leading-[1.45] text-muted">
        {message}
      </p>
      <p className="text-body font-semibold leading-[1.45] text-ink">{title}</p>
      {action}
    </div>
  );
}
