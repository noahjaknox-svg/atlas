"use client";

import { useState } from "react";
import type { ExperienceGalleryItem } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import { experienceImageSectionMt } from "@/lib/experience-image-system";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ProposalImage } from "./proposal-image";
import { ExperienceImageLightbox } from "./experience-image-lightbox";

/**
 * Balanced two-image editorial layout — wide primary with a supporting secondary image.
 * Both images share a coordinated row height on desktop.
 */
export function EditorialImageGrid({
  items,
  title,
  primaryIndex = 0,
  className,
  slide = false,
  designMode = false,
}: {
  items?: ExperienceGalleryItem[] | null;
  title?: string;
  /** Which item is the wide primary (defaults to first). */
  primaryIndex?: number;
  className?: string;
  slide?: boolean;
  designMode?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const openLightbox = designMode ? undefined : (index: number) => setActive(index);

  if (!items || items.length === 0) return null;

  const primary = items[primaryIndex] ?? items[0]!;
  const secondary = items.find((_, i) => i !== primaryIndex);

  if (!secondary) {
    return (
      <RevealOnScroll delayMs={120}>
        <section className={experienceImageSectionMt}>
          <ProposalImage
            src={primary.url}
            alt={primary.caption ?? ""}
            caption={primary.caption}
            variant="landscape-wide"
            onClick={openLightbox ? () => openLightbox(primaryIndex) : undefined}
          />
        </section>
        {!designMode ? (
          <ExperienceImageLightbox items={items} active={active} onClose={() => setActive(null)} />
        ) : null}
      </RevealOnScroll>
    );
  }

  const secondaryIndex = items.indexOf(secondary);

  return (
    <RevealOnScroll delayMs={120} className={cn(slide && "flex h-full min-h-0 flex-col", className)}>
      <section
        className={cn(
          slide ? "flex min-h-0 flex-1 flex-col pb-0" : cn(experienceImageSectionMt, "pb-2")
        )}
        aria-label={title ?? "Gallery"}
      >
        {title ? (
          <p className="mb-5 text-center text-xs uppercase tracking-[0.35em] text-white/45">
            {title}
          </p>
        ) : null}

        <div
          className={cn(
            "grid gap-3 md:grid-cols-[3fr_2fr] md:gap-4",
            slide ? "min-h-0 flex-1 md:h-full md:max-h-none" : "md:h-[min(48vw,480px)] md:max-h-[480px] md:min-h-[260px]"
          )}
        >
          <ProposalImage
            src={primary.url}
            alt={primary.caption ?? ""}
            caption={primary.caption}
            variant="editorial-large"
            sizing="fill"
            onClick={openLightbox ? () => openLightbox(primaryIndex) : undefined}
          />
          <ProposalImage
            src={secondary.url}
            alt={secondary.caption ?? ""}
            caption={secondary.caption}
            variant="editorial-small"
            sizing="fill"
            onClick={openLightbox ? () => openLightbox(secondaryIndex) : undefined}
          />
        </div>
      </section>

      {!designMode ? (
        <ExperienceImageLightbox items={items} active={active} onClose={() => setActive(null)} />
      ) : null}
    </RevealOnScroll>
  );
}
