import { cn } from "@/lib/utils";

/**
 * Account guidance panel below the auth form.
 * Figma "Account guidance" (2:3224): a 97px surface panel with 16px padding,
 * the "Accounts are created by the school admin." note and the office contact
 * details. The 1px stroke is drawn inside the panel so the copy keeps the
 * 16px padding line and the block stays exactly 97px tall.
 */
export function AccountGuidance({ className }: { className?: string }) {
  return (
    <div
      data-auth="guidance"
      className={cn(
        "flex w-full flex-col rounded-[12px] bg-surface p-4",
        "shadow-[inset_0_0_0_1px_hsl(var(--border))]",
        className,
      )}
    >
      <p className="text-caption leading-[1.45] text-ink">
        Accounts are created by the school admin.
      </p>
      <p className="mt-2 text-caption leading-[1.45] text-muted">
        Need help? Contact the school office.
        <br />+880 2 5500
      </p>
    </div>
  );
}
