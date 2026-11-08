"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Label above a form control.
 * Figma "Input / Select / Date picker" (2:129, 2:132, 2:135):
 * 13px medium Inter in the muted colour.
 */
const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-caption font-medium leading-[1.45] text-muted",
      className,
    )}
    {...props}
  />
));
FieldLabel.displayName = "FieldLabel";

export { FieldLabel };
