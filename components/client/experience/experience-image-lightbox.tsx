"use client";

import { useEffect } from "react";
import type { ExperienceGalleryItem } from "@/lib/experience-content";

function isVideo(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

export function ExperienceImageLightbox({
  items,
  active,
  onClose,
}: {
  items: ExperienceGalleryItem[];
  active: number | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (active === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);

  if (active === null || !items[active]) return null;

  const item = items[active]!;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 text-2xl text-white/70 hover:text-white"
        aria-label="Close"
      >
        ✕
      </button>
      <figure className="max-h-[88vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
        {isVideo(item.url) ? (
          <video src={item.url} className="max-h-[80vh] w-auto rounded-lg" controls autoPlay />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.caption ?? ""}
            className="max-h-[80vh] w-auto rounded-lg object-contain"
          />
        )}
        {item.caption ? (
          <figcaption className="mt-3 text-center text-sm text-white/70">{item.caption}</figcaption>
        ) : null}
      </figure>
    </div>
  );
}
