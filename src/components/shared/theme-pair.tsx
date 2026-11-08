import { ThemePanel, type PreviewTheme } from "@/components/shared/theme-panel";
import { cn } from "@/lib/utils";

export interface ThemePairProps {
  /** Specimen caption. */
  label: string;
  /** Specimen body — rendered once inside each palette scope. */
  children: React.ReactNode;
  /** Palettes to render. Defaults to light and dark. */
  themes?: readonly PreviewTheme[];
  className?: string;
}

/**
 * Renders a specimen side by side in the light and dark palettes so every
 * component can be reviewed in both themes on the design-system page.
 */
export function ThemePair({
  label,
  children,
  themes = ["light", "dark"],
  className,
}: ThemePairProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="text-body font-semibold leading-[1.45] text-ink">{label}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {themes.map((theme) => (
          <ThemePanel key={theme} theme={theme} title={theme === "light" ? "Light" : "Dark"}>
            {children}
          </ThemePanel>
        ))}
      </div>
    </div>
  );
}
