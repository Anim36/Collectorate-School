import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Design tokens come from the Figma design-system frame
 * "00 · Foundations & reusable components" (node 2:33) and
 * "02 · Dark theme components" (node 2:28578).
 * Colour values are exposed as CSS variables in `src/app/globals.css`
 * so light and dark palettes stay in sync with the Figma variables.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/data/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "24px",
        md: "32px",
        xl: "64px",
      },
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          surface: "hsl(var(--muted-surface) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        action: "hsl(var(--action) / <alpha-value>)",
        destructive: {
          DEFAULT: "hsl(var(--danger) / <alpha-value>)",
          foreground: "hsl(var(--danger-foreground) / <alpha-value>)",
        },
        success: "hsl(var(--success) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        warning: "hsl(var(--amber) / <alpha-value>)",
        info: "hsl(var(--sky) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--border) / <alpha-value>)",
        ring: "hsl(var(--primary) / <alpha-value>)",
        ink: "hsl(var(--ink) / <alpha-value>)",
        navy: "hsl(var(--navy) / <alpha-value>)",
        tint: "hsl(var(--tint) / <alpha-value>)",
        white: "hsl(var(--white) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        bengali: ["var(--font-hind-siliguri)", "var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        micro: ["11px", { lineHeight: "1.45" }],
        caption: ["13px", { lineHeight: "1.45" }],
        "body-md": ["14px", { lineHeight: "1.45" }],
        body: ["16px", { lineHeight: "1.45" }],
        "body-lg": ["20px", { lineHeight: "1.45" }],
        title: ["24px", { lineHeight: "1.45" }],
        heading: ["32px", { lineHeight: "1.45" }],
        display: ["40px", { lineHeight: "1.45" }],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "12px",
        md: "12px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px 0 hsl(var(--shadow-color) / 0.06), 0 1px 3px 0 hsl(var(--shadow-color) / 0.08)",
        raised: "0 4px 12px -2px hsl(var(--shadow-color) / 0.10), 0 2px 6px -2px hsl(var(--shadow-color) / 0.06)",
        overlay: "0 12px 32px -8px hsl(var(--shadow-color) / 0.18)",
      },
      spacing: {
        gutter: "24px",
        "gutter-md": "32px",
        "gutter-xl": "64px",
        touch: "44px",
      },
      maxWidth: {
        content: "1280px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
