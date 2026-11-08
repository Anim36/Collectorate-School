import type { Metadata } from "next";
import Image from "next/image";

import { ComponentShowcase } from "@/components/shared/component-showcase";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  colorTokens,
  radiusScale,
  spacingScale,
  typeScale,
} from "@/data/design-tokens";
import { schoolPhotos } from "@/data/photos";

export const metadata: Metadata = {
  title: "Design system",
  description:
    "Colour, typography, spacing and radius tokens extracted from the Figma design system.",
};

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-background p-6 text-ink md:p-8 xl:p-16">
      <div className="mx-auto flex w-full max-w-content flex-col gap-12">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <p className="text-caption font-bold uppercase tracking-wide text-primary">
              SCHOOL / DIGITAL CAMPUS
            </p>
            <h1 className="text-display font-bold leading-[1.45]">
              An education in possibility.
            </h1>
            <p className="text-body text-muted">
              Design tokens transcribed from the Figma design-system frame.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <section aria-labelledby="colours-heading" className="flex flex-col gap-6">
          <h2
            id="colours-heading"
            className="text-title font-semibold leading-[1.45]"
          >
            01 / Semantic colour · Light &amp; Dark
          </h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
            {colorTokens.map((token) => (
              <div
                key={token.token}
                className="flex w-full flex-col gap-2 rounded-[12px] bg-surface p-4"
              >
                <div
                  className="h-16 w-full rounded-[12px] border border-border"
                  style={{ backgroundColor: `var(${token.cssVar})` }}
                  aria-hidden
                />
                <p className="text-caption font-medium leading-[1.45]">
                  {token.label}
                </p>
                <p className="text-caption leading-[1.45] text-muted">
                  {token.light}
                </p>
                <p className="text-caption leading-[1.45] text-muted">
                  {token.dark}
                </p>
                <code className="text-caption leading-[1.45] text-muted">
                  var({token.cssVar})
                </code>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="type-heading" className="flex flex-col gap-6">
          <h2
            id="type-heading"
            className="text-title font-semibold leading-[1.45]"
          >
            02 / Typography · Inter + Hind Siliguri
          </h2>

          <div className="flex flex-col divide-y divide-border rounded-[12px] border border-border bg-surface">
            {typeScale.map((step) => (
              <div
                key={step.className}
                className="flex flex-col gap-2 p-6 md:flex-row md:items-baseline md:gap-8"
              >
                <p className="w-full shrink-0 text-caption font-medium uppercase tracking-wide text-muted md:w-52">
                  {step.label}
                </p>
                <p
                  className={`${step.className} break-words leading-[1.45]`}
                  style={{ fontWeight: step.weight }}
                >
                  {step.sample}
                </p>
              </div>
            ))}
            <div className="flex flex-col gap-2 p-6 md:flex-row md:items-baseline md:gap-8">
              <p className="w-full shrink-0 text-caption font-medium uppercase tracking-wide text-muted md:w-52">
                Bengali / 24 · Regular
              </p>
              <p
                lang="bn"
                className="font-bengali text-title leading-[1.45]"
              >
                শিক্ষা • শৃঙ্খলা • মানবতা
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="spacing-heading"
          className="flex flex-col gap-6"
        >
          <h2
            id="spacing-heading"
            className="text-title font-semibold leading-[1.45]"
          >
            03 / Spacing &amp; radius
          </h2>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-6">
              <h3 className="text-body font-semibold leading-[1.45]">
                Spacing (8px base)
              </h3>
              <ul className="flex flex-col gap-2">
                {spacingScale.map((step) => (
                  <li
                    key={step.px}
                    className="flex items-center gap-4 text-caption text-muted"
                  >
                    <span
                      className={`${step.className} bg-tint`}
                      aria-hidden
                    />
                    <span>{step.label}px</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-6">
              <h3 className="text-body font-semibold leading-[1.45]">
                Radius
              </h3>
              <ul className="flex flex-col gap-2">
                {radiusScale.map((step) => (
                  <li
                    key={step.px}
                    className="flex items-center gap-4 text-caption text-muted"
                  >
                    <span
                      className={`${step.className} size-16 bg-tint`}
                      aria-hidden
                    />
                    <span>
                      {step.label} · {step.px}px
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="components-heading" className="flex flex-col gap-6">
          <h2
            id="components-heading"
            className="text-title font-semibold leading-[1.45]"
          >
            04 / Reusable components · Light &amp; Dark
          </h2>

          <ComponentShowcase />
        </section>

        <section aria-labelledby="photos-heading" className="flex flex-col gap-6">
          <h2
            id="photos-heading"
            className="text-title font-semibold leading-[1.45]"
          >
            05 / Campus &amp; community photography
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {schoolPhotos.map((photo) => (
              <figure key={photo.id} className="flex flex-col gap-2">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  className="h-[150px] w-full rounded-[12px] object-cover"
                />
                <figcaption className="text-caption leading-[1.45] text-muted">
                  {photo.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
