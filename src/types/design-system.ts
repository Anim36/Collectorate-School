/** Semantic colour tokens exposed by the Figma design system. */
export type ColorTokenName =
  | "background"
  | "surface"
  | "primary"
  | "sky"
  | "amber"
  | "success"
  | "danger"
  | "ink"
  | "muted"
  | "border"
  | "white"
  | "action"
  | "tint"
  | "navy";

export interface ColorToken {
  /** CSS custom-property name, e.g. `--primary`. */
  readonly cssVar: string;
  /** Token key used by the Tailwind theme. */
  readonly token: ColorTokenName;
  /** Human label shown in the design-system preview. */
  readonly label: string;
  /** Light-mode hex value from Figma variables. */
  readonly light: string;
  /** Dark-mode hex value from Figma variables. */
  readonly dark: string;
}

/** A step of the type scale. */
export interface TypeScaleStep {
  /** Tailwind text utility, e.g. `text-display`. */
  readonly className: string;
  /** Pixel size used in Figma. */
  readonly size: number;
  /** Font weight used in Figma. */
  readonly weight: 400 | 500 | 600 | 700;
  /** Sample copy rendered at this step. */
  readonly sample: string;
  /** Label shown in the design-system preview. */
  readonly label: string;
}
