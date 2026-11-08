"use client";

import * as React from "react";

/**
 * Exposes the nearest palette scope so portalled overlays (select dropdowns,
 * popovers, dialogs) can render inside a preview panel instead of at the
 * document root — keeping them inside the intended colour palette.
 */
export const ThemeScopeContext = React.createContext<HTMLElement | null>(null);

/** Reads the nearest palette scope, if any. */
export function useThemeScope(): HTMLElement | null {
  return React.useContext(ThemeScopeContext);
}
