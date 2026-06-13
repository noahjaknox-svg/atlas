"use client";

import { cn } from "@/lib/utils";
import { DEFAULT_CLOUD_IMAGE } from "@/lib/portal-constants";

export function CloudBackground({
  imageUrl,
  videoUrl,
  posterUrl,
  overlay = "dark",
  fillContainer = false,
  kenBurns = false,
  className,
  children,
}: {
  imageUrl?: string | null;
  videoUrl?: string | null;
  posterUrl?: string | null;
  overlay?: "dark" | "light" | "none";
  /** When true, fill parent height instead of min-h-screen (hero bands). */
  fillContainer?: boolean;
  /** Slow zoom on still/video hero (PIN gate, experience heroes). */
  kenBurns?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const img = imageUrl || DEFAULT_CLOUD_IMAGE;
  const poster = posterUrl || img;

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        fillContainer ? "min-h-full h-full" : "min-h-screen",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 -z-10",
          kenBurns && "experience-hero-kenburns overflow-hidden"
        )}
      >
        {videoUrl ? (
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={poster}
            preload="metadata"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-full w-full object-cover" />
        )}
        {overlay === "dark" && (
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#0a0d14]/75 via-[#0a0d14]/55 to-[#0a0d14]/85"
            aria-hidden
          />
        )}
        {overlay === "light" && (
          <div className="absolute inset-0 bg-white/20" aria-hidden />
        )}
      </div>
      <div className="relative z-0">{children}</div>
    </div>
  );
}
