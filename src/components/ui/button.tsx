import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button variants follow the Figma "Style=Primary / Secondary / Ghost /
 * Disabled" component set (node 2:118–2:125): 24px horizontal padding,
 * 12px vertical padding, 12px corner radius and a 16px semibold Inter label.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-body font-semibold leading-[1.45] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Figma "Style=Primary" — solid action fill. */
        default: "bg-action text-white hover:bg-action/90",
        /** Figma "Style=Secondary" — bordered surface. */
        secondary: "border border-border bg-surface text-primary hover:bg-tint",
        /** Figma "Style=Ghost" — borderless surface. */
        ghost: "bg-surface text-primary hover:bg-tint",
        /** Figma "Style=Disabled" — muted fill, muted label. */
        disabled:
          "bg-border text-muted hover:bg-border",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-transparent text-primary hover:bg-tint",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        /** 24px / 12px padding — the Figma default. */
        default: "px-6 py-3",
        /** 16px / 8px padding with a 13px label. */
        sm: "px-4 py-2 text-caption",
        /** 32px / 16px padding with an 18px label. */
        lg: "px-8 py-4 text-body-lg",
        /** 44px square target for icon-only actions. */
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
