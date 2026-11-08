import type { ColorToken, TypeScaleStep } from "@/types/design-system";

/**
 * Semantic colours transcribed from the Figma variables of
 * "00 · Foundations & reusable components" (2:33) and
 * "02 · Dark theme components" (2:28578).
 */
export const colorTokens: readonly ColorToken[] = [
  {
    cssVar: "--background",
    token: "background",
    label: "background",
    light: "#F8FAFC",
    dark: "#0B1220",
  },
  {
    cssVar: "--surface",
    token: "surface",
    label: "surface",
    light: "#FFFFFF",
    dark: "#111D30",
  },
  {
    cssVar: "--primary",
    token: "primary",
    label: "primary",
    light: "#1E3A8A",
    dark: "#93B8FF",
  },
  {
    cssVar: "--sky",
    token: "sky",
    label: "sky",
    light: "#3B82F6",
    dark: "#60A5FA",
  },
  {
    cssVar: "--amber",
    token: "amber",
    label: "amber",
    light: "#F59E0B",
    dark: "#FBBF24",
  },
  {
    cssVar: "--success",
    token: "success",
    label: "success",
    light: "#16803D",
    dark: "#69DB9D",
  },
  {
    cssVar: "--danger",
    token: "danger",
    label: "danger",
    light: "#DC2626",
    dark: "#FF9292",
  },
  {
    cssVar: "--ink",
    token: "ink",
    label: "ink",
    light: "#0F172A",
    dark: "#F1F5F9",
  },
  {
    cssVar: "--muted",
    token: "muted",
    label: "muted",
    light: "#526277",
    dark: "#AABBD0",
  },
  {
    cssVar: "--border",
    token: "border",
    label: "border",
    light: "#DFE7F0",
    dark: "#2A3A50",
  },
  {
    cssVar: "--white",
    token: "white",
    label: "white",
    light: "#FFFFFF",
    dark: "#FFFFFF",
  },
  {
    cssVar: "--action",
    token: "action",
    label: "action",
    light: "#1E3A8A",
    dark: "#2563EB",
  },
  {
    cssVar: "--tint",
    token: "tint",
    label: "tint",
    light: "#F1F5F9",
    dark: "#172C49",
  },
  {
    cssVar: "--navy",
    token: "navy",
    label: "navy",
    light: "#1E3A8A",
    dark: "#08172F",
  },
];

/** Type scale transcribed from the Figma typography specimen (2:104–2:110). */
export const typeScale: readonly TypeScaleStep[] = [
  {
    className: "text-display",
    size: 40,
    weight: 700,
    sample: "An education in possibility.",
    label: "Display / 40 · Bold",
  },
  {
    className: "text-heading",
    size: 32,
    weight: 400,
    sample: "A place to learn. A place to belong.",
    label: "Heading / 32 · Regular",
  },
  {
    className: "text-title",
    size: 24,
    weight: 400,
    sample: "Growing together, every day.",
    label: "Title / 24 · Regular",
  },
  {
    className: "text-body-lg",
    size: 20,
    weight: 400,
    sample: "Clear, friendly and accessible communication.",
    label: "Body large / 20 · Regular",
  },
  {
    className: "text-body",
    size: 16,
    weight: 400,
    sample: "A place to learn. A place to belong.",
    label: "Body / 16 · Regular",
  },
  {
    className: "text-caption",
    size: 13,
    weight: 400,
    sample: "Caption / Updated 04 November 2026",
    label: "Caption / 13 · Regular",
  },
];

/** Spacing steps taken from the Figma 8px base scale. */
export const spacingScale: readonly { label: string; className: string; px: number }[] = [
  { label: "8", className: "p-2", px: 8 },
  { label: "12", className: "p-3", px: 12 },
  { label: "16", className: "p-4", px: 16 },
  { label: "24", className: "p-6", px: 24 },
  { label: "32", className: "p-8", px: 32 },
  { label: "64", className: "p-16", px: 64 },
];

/** Corner radii used across the system. */
export const radiusScale: readonly { label: string; className: string; px: number }[] = [
  { label: "sm", className: "rounded-sm", px: 6 },
  { label: "default / md / lg", className: "rounded-[12px]", px: 12 },
  { label: "xl", className: "rounded-xl", px: 16 },
];
