import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badges follow the Figma badge set (2:17366, 2:17369, 2:17372, 2:17375):
 * tinted surface, 8px radius, 8px padding and a 13px semibold label. The
 * "late" badge uses the amber fill with ink-coloured text.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-[8px] border border-transparent p-2 text-caption font-semibold leading-[1.45]",
  {
    variants: {
      variant: {
        default: "bg-tint text-primary",
        success: "bg-tint text-success",
        danger: "bg-tint text-danger",
        warning: "bg-warning text-ink",
        info: "bg-tint text-info",
        solid: "bg-primary text-primary-foreground",
        outline: "border-border bg-transparent text-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
