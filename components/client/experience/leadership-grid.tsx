"use client";

import { useState } from "react";
import type { ExperienceGalleryItem } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import { experienceImageSectionMt } from "@/lib/experience-image-system";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ProposalImage } from "./proposal-image";
import { ExperienceImageLightbox } from "./experience-image-lightbox";

/**
 * Structured leadership grid: one featured portrait on the left,
 * remaining portraits in a balanced stack on the right.
 */
export function LeadershipGrid({
  items,
  title,
  featuredIndex = 0,
  className,
}: {
  items?: ExperienceGalleryItem[] | null;
  title?: string;
  /** Which gallery item receives the featured left column (defaults to first). */
  featuredIndex?: number;
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  const featured = items[featuredIndex] ?? items[0]!;
  const others = items.filter((_, i) => i !== featuredIndex);

  return (
    <RevealOnScroll delayMs={120}>
      <section className={cn(experienceImageSectionMt, "pb-2", className)} aria-label={title ?? "Leadership"}>
        {title ? (
          <p className="mb-5 text-center text-xs uppercase tracking-[0.35em] text-white/45">
            {title}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-5">
          <ProposalImage
            src={featured.url}
            alt={featured.caption ?? ""}
            caption={featured.caption}
            variant="portrait-featured"
            onClick={() => setActive(featuredIndex)}
            frameClassName="mx-auto w-full max-w-md lg:max-w-none"
          />

          {others.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-4 lg:grid-cols-1">
              {others.map((item) => {
                const originalIndex = items.indexOf(item);
                return (
                  <ProposalImage
                    key={`${item.url}-${originalIndex}`}
                    src={item.url}
                    alt={item.caption ?? ""}
                    caption={item.caption}
                    variant="portrait-standard"
                    onClick={() => setActive(originalIndex)}
                    frameClassName={cn(
                      others.length === 3 &&
                        originalIndex === items.length - 1 &&
                        "col-span-2 mx-auto w-full max-w-xs sm:max-w-sm lg:col-span-1 lg:max-w-none"
                    )}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <ExperienceImageLightbox items={items} active={active} onClose={() => setActive(null)} />
    </RevealOnScroll>
  );
}
