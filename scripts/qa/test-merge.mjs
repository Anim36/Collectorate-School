import { extendTailwindMerge, getDefaultConfig } from "tailwind-merge";

const config = getDefaultConfig();
console.log("theme.text:", JSON.stringify(config.theme.text));

const merged = extendTailwindMerge({
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

const cases = [
  "text-body bg-action text-white",
  "text-caption bg-action text-white",
  "text-body text-ink",
  "text-caption text-muted",
  "text-heading font-semibold text-ink",
  "text-body-lg font-semibold leading-[1.45] text-ink",
  "text-body-md px-3 py-3 text-ink",
  "text-title font-semibold leading-[1.45] text-ink",
  "bg-action text-white",
  "text-primary",
  "text-display font-bold leading-[1.45]",
  "text-2xl font-bold",
  "text-sm font-medium",
];

for (const value of cases) {
  console.log(`${value}\n  ->  ${merged(value)}\n`);
}
