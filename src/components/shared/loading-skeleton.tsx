import { cn } from "@/lib/utils";

export interface SkeletonProps {
  className?: string;
}

/** A single rounded placeholder bar. */
export function SkeletonLine({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("h-3 w-full shrink-0 rounded-[6px] bg-border", className)}
    />
  );
}

export interface LoadingSkeletonProps {
  /** Supporting line shown above the title. */
  message?: string;
  /** Title shown while content loads. */
  title?: string;
  /** Number of placeholder bars rendered under the title. */
  lines?: number;
  className?: string;
}

/**
 * Loading placeholder panel.
 * Figma "Loading skeleton" (2:150–2:155): surface background, 1px border,
 * 12px radius, 24px padding and three 12px rounded placeholder bars.
 */
export function LoadingSkeleton({
  message = "Loading your dashboard",
  title = "Fetching the latest updates…",
  lines = 3,
  className,
}: LoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex w-full flex-col items-start gap-3 rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <p className="text-caption font-medium leading-[1.45] text-muted">
        {message}
      </p>
      <p className="text-body font-semibold leading-[1.45] text-ink">{title}</p>
      <div className="flex w-full flex-col gap-3">
        {Array.from({ length: lines }, (_, index) => (
          <SkeletonLine
            key={index}
            className={index === 0 ? "w-full" : index === 1 ? "w-4/5" : "w-3/5"}
          />
        ))}
      </div>
      <span className="sr-only">{message}</span>
    </div>
  );
}
