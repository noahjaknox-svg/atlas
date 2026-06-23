"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_CLOUD_IMAGE } from "@/lib/portal-constants";

function videoMimeType(url: string): string {
  const path = url.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".mov")) return "video/quicktime";
  return "video/mp4";
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

export function CloudBackground({
  imageUrl,
  videoUrl,
  posterUrl,
  overlay = "dark",
  fillContainer = false,
  fixed = false,
  kenBurns = false,
  priorityVideo = false,
  className,
  children,
}: {
  imageUrl?: string | null;
  videoUrl?: string | null;
  posterUrl?: string | null;
  overlay?: "dark" | "light" | "none" | "subtle";
  /** When true, fill parent height instead of min-h-screen (hero bands). */
  fillContainer?: boolean;
  /** Fixed full-viewport backdrop behind page content. */
  fixed?: boolean;
  /** Slow zoom on still/video hero (PIN gate, experience heroes). */
  kenBurns?: boolean;
  /** Eagerly preload portal backdrop video (experience shell, PIN gate). */
  priorityVideo?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const img = imageUrl || DEFAULT_CLOUD_IMAGE;
  const poster = posterUrl || img;
  const showVideo = Boolean(videoUrl) && !reducedMotion && !videoFailed;
  const showKenBurns = kenBurns && !reducedMotion && !showVideo;

  useEffect(() => {
    setVideoFailed(false);
  }, [videoUrl]);

  return (
    <div
      className={cn(
        fixed ? "pointer-events-none fixed inset-0 z-0 overflow-hidden" : "relative overflow-hidden",
        !fixed && (fillContainer ? "min-h-full h-full" : "min-h-screen"),
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          !fixed && "-z-10",
          showKenBurns && "experience-hero-kenburns overflow-hidden"
        )}
      >
        {showVideo ? (
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={poster}
            preload={priorityVideo ? "auto" : "metadata"}
            onError={() => setVideoFailed(true)}
          >
            <source src={videoUrl!} type={videoMimeType(videoUrl!)} />
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
        {overlay === "subtle" && (
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#0a0d14]/20 via-transparent to-[#0B0F1A]/70"
            aria-hidden
          />
        )}
        {overlay === "light" && (
          <div className="absolute inset-0 bg-white/20" aria-hidden />
        )}
      </div>
      {children ? <div className="relative z-0">{children}</div> : null}
    </div>
  );
}
