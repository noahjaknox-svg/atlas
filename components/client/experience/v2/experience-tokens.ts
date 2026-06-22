import { cn } from "@/lib/utils";

/** Liquid-glass panel for v2 experience slides. */
export const experienceGlassV2 = cn(
  "portal-v2-glass rounded-2xl",
  "border border-white/[0.12] bg-white/[0.06] backdrop-blur-2xl",
  "shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]"
);

/** Floating chapter nav pill. */
export const experienceNavPillV2 = cn(
  "portal-v2-glass rounded-full",
  "border border-white/15 bg-[#0B0F1A]/55 backdrop-blur-2xl",
  "shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
);

/** Bottom action dock. */
export const experienceDockV2 = cn(
  "portal-v2-glass rounded-2xl",
  "border border-white/12 bg-[#0B0F1A]/65 backdrop-blur-2xl",
  "shadow-[0_-8px_32px_rgba(0,0,0,0.4)]"
);

export const experiencePageXV2 = "px-4 sm:px-8 lg:px-16";

export const experienceContentMaxV2 = "mx-auto w-full max-w-6xl h-full min-h-0";

export const experienceSlideV2 = "flex h-full min-h-0 flex-col overflow-hidden";
