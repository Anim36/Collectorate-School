"use client";

import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

/**
 * Fires the live toast so the shadcn toast component set can be exercised on
 * the design-system page.
 */
export function ToastTrigger() {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() =>
        toast({
          title: "Changes saved",
          description: "Your attendance sheet is up to date.",
        })
      }
    >
      Show toast
    </Button>
  );
}
