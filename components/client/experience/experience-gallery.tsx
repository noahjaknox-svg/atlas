"use client";

import { useState } from "react";
import type { ExperienceGalleryItem } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import {
  experienceImageSectionMt,
  type ProposalImageVariant,
} from "@/lib/experience-image-system";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ProposalImage } from "./proposal-image";
import { ExperienceImageLightbox } from "./experience-image-lightbox";
import { LeadershipGrid } from "./leadership-grid";
import { EditorialImageGrid } from "./editorial-image-grid";

export type ExperienceGalleryLayout =
  | "single"
  | "welcome"
  | "leadership"
  | "editorialPair"
  | "compact";

function isVideo(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

/** Maps page layout modes to default image variants. */
const LAYOUT_VARIANT: Record<ExperienceGalleryLayout, ProposalImageVariant> = {
  single: "landscape-wide",
  welcome: "portrait-featured",
  leadership: "portrait-standard",
  editorialPair: "editorial-large",
  compact: "editorial-small",
};

/**
 * Unified gallery entry point — delegates to specialized layouts or renders
 * a single controlled image block for one-item galleries.
 */
export function ExperienceGallery({
  items,
  title,
  layout = "single",
  variant,
  className,
  featuredIndex,
  slide = false,
}: {
  items?: ExperienceGalleryItem[] | null;
  title?: string;
  layout?: ExperienceGalleryLayout;
  /** Override the default variant for single-image layouts. */
  variant?: ProposalImageVariant;
  className?: string;
  featuredIndex?: number;
  /** Compact sizing for full-viewport slide pages. */
  slide?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  if (layout === "leadership" && items.length >= 2) {
    return (
      <LeadershipGrid
        items={items}
        title={title}
        featuredIndex={featuredIndex ?? 0}
        className={className}
        slide={slide}
      />
    );
  }

  if (layout === "editorialPair" && items.length >= 2) {
    return (
      <EditorialImageGrid items={items} title={title} className={className} slide={slide} />
    );
  }

  if (layout === "welcome") {
    const [portrait, secondary] = items;
    return (
      <RevealOnScroll delayMs={80} className={cn(slide && "flex min-h-0 flex-1 flex-col", className)}>
        <section
          className={cn(
            slide ? "flex min-h-0 flex-1 flex-col gap-2" : cn(experienceImageSectionMt, "space-y-4")
          )}
        >
          {portrait && !isVideo(portrait.url) ? (
            <ProposalImage
              src={portrait.url}
              alt={portrait.caption ?? ""}
              caption={portrait.caption}
              variant="portrait-featured"
              sizing={slide ? "fill" : "variant"}
              onClick={() => setActive(0)}
              frameClassName={slide ? "min-h-0 flex-1" : undefined}
            />
          ) : null}
          {secondary && !isVideo(secondary.url) && !slide ? (
            <div className="max-w-xl">
              <ProposalImage
                src={secondary.url}
                alt={secondary.caption ?? ""}
                caption={secondary.caption}
                variant="editorial-small"
                onClick={() => setActive(1)}
              />
            </div>
          ) : null}
        </section>
        <ExperienceImageLightbox items={items} active={active} onClose={() => setActive(null)} />
      </RevealOnScroll>
    );
  }

  const imageVariant = variant ?? LAYOUT_VARIANT[layout] ?? "landscape-wide";

  return (
    <RevealOnScroll
      delayMs={120}
      className={cn(slide && "flex h-full min-h-0 flex-col", className)}
    >
      <section
        className={cn(
          slide ? "flex min-h-0 flex-1 flex-col pb-0" : cn(experienceImageSectionMt, "pb-2"),
        )}
        aria-label={title ?? "Gallery"}
      >
        {title ? (
          <p className="mb-5 text-center text-xs uppercase tracking-[0.35em] text-white/45">
            {title}
          </p>
        ) : null}

        <div className={cn(slide ? "flex min-h-0 flex-1 flex-col" : "space-y-4")}>
          {items.map((item, index) => {
            if (isVideo(item.url)) {
              return (
                <div
                  key={`${item.url}-${index}`}
                  className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                  style={{
                    aspectRatio: "16 / 9",
                    maxHeight: slide ? "100%" : "min(50vh, 520px)",
                  }}
                >
                  <video
                    src={item.url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    loop
                    autoPlay
                  />
                </div>
              );
            }
            return (
              <ProposalImage
                key={`${item.url}-${index}`}
                src={item.url}
                alt={item.caption ?? ""}
                caption={item.caption}
                variant={imageVariant}
                sizing={slide ? "fill" : "variant"}
                onClick={() => setActive(index)}
                frameClassName={slide ? "min-h-0 flex-1" : undefined}
              />
            );
          })}
        </div>
      </section>

      <ExperienceImageLightbox items={items} active={active} onClose={() => setActive(null)} />
    </RevealOnScroll>
  );
}
