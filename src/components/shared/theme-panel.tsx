"use client";

import * as React from "react";

import { ThemeScopeContext, useThemeScope } from "@/lib/theme-scope";
import { cn } from "@/lib/utils";

export type PreviewTheme = "light" | "dark";

export interface ThemePanelProps {
  /** Which palette the panel renders with. */
  theme: PreviewTheme;
  /** Panel caption. */
  title: string;
  /** Panel content. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Renders a component specimen inside an explicit palette scope.
 * The `.light` / `.dark` classes re-declare the Figma colour variables from
 * `globals.css`, so both palettes can be previewed side by side regardless of
 * the active next-themes setting.
 */
export function ThemePanel({
  theme,
  title,
  children,
  className,
}: ThemePanelProps) {
  const [container, setContainer] = React.useState<HTMLElement | null>(null);

  return (
    <ThemeScopeContext.Provider value={container}>
      <div
        ref={setContainer}
        className={cn(
          "flex flex-col gap-3 rounded-[12px] border border-border bg-background p-4",
          theme,
          className,
        )}
      >
        <p className="text-caption font-bold uppercase tracking-wide text-primary">
          {title}
        </p>
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </ThemeScopeContext.Provider>
  );
}

export interface SpecimenProps {
  /** Small caption above the specimen. */
  label: string;
  /** Specimen content. */
  children: React.ReactNode;
  className?: string;
}

/** Label + content pair used to caption each specimen. */
export function Specimen({ label, children, className }: SpecimenProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-caption font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

export { useThemeScope };
