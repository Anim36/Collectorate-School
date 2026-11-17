import { BookOpen, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Vision and mission.
 * Figma "Vision & mission" (2:174 desktop, 2:184 tablet, 2:194 mobile): two
 * tinted cards side by side on desktop and tablet, stacked on mobile.
 *
 * The two cards are the school's words about itself, so they are written
 * here and not kept in the database.
 */

interface VisionCard {
  /** Heading, e.g. "Our vision". */
  title: string;
  /** Body copy. */
  description: string;
  /** Lucide glyph shown above the heading. */
  icon: LucideIcon;
}

const visionCards: readonly VisionCard[] = [
  {
    title: "Our vision",
    description:
      "To inspire a generation of curious, capable and compassionate citizens who contribute to a better Bangladesh.",
    icon: Target,
  },
  {
    title: "Our mission",
    description:
      "To provide inclusive, high-quality education through dedicated teaching, strong values and opportunities to explore.",
    icon: BookOpen,
  },
];

export function VisionMission() {
  return (
    <section className="flex w-full flex-col items-start gap-6 bg-background px-6 py-10 md:flex-row md:px-8 md:py-16 xl:px-20">
      {visionCards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="flex w-full flex-col items-start gap-4 rounded-[12px] bg-tint p-8 md:w-[340px] xl:w-[628px]"
          >
            <Icon aria-hidden className="size-6 text-primary" />
            <h2 className="text-title font-semibold leading-[1.45] text-ink">
              {card.title}
            </h2>
            <p className="text-body leading-[1.45] text-muted">
              {card.description}
            </p>
          </div>
        );
      })}
    </section>
  );
}
