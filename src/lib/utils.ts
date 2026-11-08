import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge does not know the custom type scale defined in
 * `tailwind.config.ts`, so it classifies `text-body`, `text-caption` and the
 * rest as colours and drops the later colour utility. Registering the scale
 * keeps font sizes and text colours in separate class groups.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "micro",
        "caption",
        "body-md",
        "body",
        "body-lg",
        "title",
        "heading",
        "display",
      ],
    },
  },
});

/** Merge conditional class names while resolving Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
