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
  slide = false,
}: {
  items?: ExperienceGalleryItem[] | null;
  title?: string;
  /** Which gallery item receives the featured left column (defaults to first). */
  featuredIndex?: number;
  className?: string;
  slide?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  const featured = items[featuredIndex] ?? items[0]!;
  const others = items.filter((_, i) => i !== featuredIndex);

  return (
    <RevealOnScroll delayMs={120} className={cn(slide && "flex h-full min-h-0 flex-col", className)}>
      <section
        className={cn(
          slide ? "flex min-h-0 flex-1 flex-col pb-0" : cn(experienceImageSectionMt, "pb-2")
        )}
        aria-label={title ?? "Leadership"}
      >
        {title ? (
          <p className="mb-5 text-center text-xs uppercase tracking-[0.35em] text-white/45">
            {title}
          </p>
        ) : null}

        <div
          className={cn(
            "grid gap-3",
            slide
              ? "min-h-0 flex-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-4"
              : "gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-5"
          )}
        >
          <ProposalImage
            src={featured.url}
            alt={featured.caption ?? ""}
            caption={featured.caption}
            variant="portrait-featured"
            sizing={slide ? "fill" : "variant"}
            onClick={() => setActive(featuredIndex)}
            frameClassName={cn(
              slide ? "min-h-0 h-full" : "mx-auto w-full max-w-md lg:max-w-none"
            )}
          />

          {others.length > 0 ? (
            <div className="grid min-h-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-1">
              {others.map((item) => {
                const originalIndex = items.indexOf(item);
                return (
                  <ProposalImage
                    key={`${item.url}-${originalIndex}`}
                    src={item.url}
                    alt={item.caption ?? ""}
                    caption={item.caption}
                    variant="portrait-standard"
                    sizing={slide ? "fill" : "variant"}
                    onClick={() => setActive(originalIndex)}
                    frameClassName={cn(
                      slide && "min-h-0 h-full",
                      !slide &&
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
