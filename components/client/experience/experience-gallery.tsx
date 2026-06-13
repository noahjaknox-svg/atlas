"use client";

import { useEffect, useState } from "react";
import type { ExperienceGalleryItem } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceImage } from "./experience-image";

function isVideo(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

/** Premium photo gallery for the client report: masonry-ish grid with a lightbox. */
export function ExperienceGallery({
  items,
  title,
  variant,
}: {
  items?: ExperienceGalleryItem[] | null;
  title?: string;
  /** First image breaks full-bleed between sections on select pages. */
  variant?: "default" | "fullBleed";
}) {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
      if (e.key === "ArrowRight") setActive((i) => (i === null ? i : (i + 1) % items!.length));
      if (e.key === "ArrowLeft")
        setActive((i) => (i === null ? i : (i - 1 + items!.length) % items!.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, items]);

  if (!items || items.length === 0) return null;

  const fullBleed = variant === "fullBleed" && items[0] && !isVideo(items[0].url);

  return (
    <RevealOnScroll delayMs={120}>
      <div className="mt-12">
        {title ? (
          <p className="mb-5 text-center text-xs uppercase tracking-[0.35em] text-white/45">
            {title}
          </p>
        ) : null}

        {fullBleed ? (
          <button
            type="button"
            onClick={() => setActive(0)}
            className="group relative -mx-6 mb-8 block h-56 w-[calc(100%+3rem)] overflow-hidden sm:-mx-12 sm:h-72 sm:w-[calc(100%+6rem)] lg:-mx-20 lg:h-80 lg:w-[calc(100%+10rem)]"
          >
            <ExperienceImage
              src={items[0]!.url}
              alt={items[0]!.caption ?? ""}
              fill
              className="transition-transform duration-700 group-hover:scale-[1.02]"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A]/80 via-transparent to-transparent" />
            {items[0]!.caption ? (
              <span className="absolute bottom-4 left-6 text-sm text-white/85">{items[0]!.caption}</span>
            ) : null}
          </button>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {items.map((item, index) => {
            if (fullBleed && index === 0) return null;
            return (
              <button
                key={`${item.url}-${index}`}
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]",
                  index === 0 && !fullBleed && "col-span-2 sm:col-span-2 sm:row-span-2"
                )}
              >
                {isVideo(item.url) ? (
                  <video
                    src={item.url}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    muted
                    playsInline
                    loop
                    autoPlay
                  />
                ) : (
                  <ExperienceImage
                    src={item.url}
                    alt={item.caption ?? ""}
                    className={cn(
                      "transition-transform duration-700 group-hover:scale-105",
                      index === 0 && !fullBleed ? "h-64 sm:h-full" : "h-40 sm:h-48"
                    )}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                {item.caption ? (
                  <span className="absolute bottom-2 left-3 right-3 text-left text-xs text-white/85 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    {item.caption}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {active !== null ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setActive(null)}
            className="absolute right-5 top-5 text-2xl text-white/70 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
          <figure className="max-h-[88vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {isVideo(items[active]!.url) ? (
              <video
                src={items[active]!.url}
                className="max-h-[80vh] w-auto rounded-lg"
                controls
                autoPlay
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={items[active]!.url}
                alt={items[active]!.caption ?? ""}
                className="max-h-[80vh] w-auto rounded-lg"
              />
            )}
            {items[active]!.caption ? (
              <figcaption className="mt-3 text-center text-sm text-white/70">
                {items[active]!.caption}
              </figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}
    </RevealOnScroll>
  );
}
