"use client";

import { useState } from "react";
import type { ExperienceGalleryItem } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import { ProposalImage } from "./proposal-image";
import { ExperienceImageLightbox } from "./experience-image-lightbox";

/** Four leadership portraits in equal horizontal squares. */
export function LeadershipRowGrid({
  items,
  title,
  className,
  slide = false,
  maxItems = 4,
}: {
  items?: ExperienceGalleryItem[] | null;
  title?: string;
  className?: string;
  slide?: boolean;
  maxItems?: number;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  const row = items.slice(0, maxItems);

  return (
    <section
      className={cn(slide && "flex h-full min-h-0 flex-col", className)}
      aria-label={title ?? "Leadership"}
    >
      {title ? (
        <p className="mb-3 shrink-0 text-center text-xs uppercase tracking-[0.35em] text-white/45">
          {title}
        </p>
      ) : null}

      <div
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-4",
          slide ? "min-h-0 flex-1" : "w-full"
        )}
      >
        {row.map((item, index) => (
          <div key={`${item.url}-${index}`} className="aspect-square min-h-0">
            <ProposalImage
              src={item.url}
              alt={item.caption ?? ""}
              caption={item.caption}
              variant="portrait-standard"
              sizing="fill"
              onClick={() => setActive(index)}
              frameClassName="h-full w-full"
            />
          </div>
        ))}
      </div>

      <ExperienceImageLightbox items={row} active={active} onClose={() => setActive(null)} />
    </section>
  );
}
