import { cn } from "@/lib/utils";

export interface StudentNoticeEmptyStateProps {
  className?: string;
}

/**
 * The "no unread notices" panel.
 *
 * Figma "No unread notices" (2:5509 desktop, 2:5540 tablet, 2:5586 mobile and
 * the matching dark frames) sits under the results table:
 *
 * - Desktop and tablet: a 124px panel with the 35px title and the 23px
 *   supporting line, 25px in from the panel edge.
 * - Mobile (375): the supporting line wraps onto two lines, so the panel
 *   grows to 147px.
 */
export function StudentNoticeEmptyState({
  className,
}: StudentNoticeEmptyStateProps) {
  return (
    <section
      className={cn(
        "flex w-full flex-col items-start gap-4 rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <h2 className="text-title font-semibold leading-[1.45] text-ink">
        You’re all caught up.
      </h2>
      <p className="text-body leading-[1.45] text-muted">
        New notices from your school will appear here.
      </p>
    </section>
  );
}
