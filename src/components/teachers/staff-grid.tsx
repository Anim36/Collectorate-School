import { cn } from "@/lib/utils";

export interface StaffGridProps {
  /** The staff cards rendered inside the grid. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Grid wrapper for the staff directory cards.
 * Figma "Staff row 0" (2:956 desktop, 2:1047 tablet, 2:1135 mobile): three
 * cards across on desktop with 24px between them, two on tablet and one per
 * row on mobile with 32px between rows.
 */
export function StaffGrid({ children, className }: StaffGridProps) {
  return (
    <ul
      className={cn(
        "grid w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-6 xl:grid-cols-3",
        className,
      )}
    >
      {children}
    </ul>
  );
}
