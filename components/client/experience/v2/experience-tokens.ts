import { cn } from "@/lib/utils";

/** Liquid-glass panel for v2 experience slides (transform-safe — no backdrop-filter). */
export const experienceGlassV2 = "portal-v2-glass";

/** Floating chapter nav — liquid glass pill (outside deck transform; blur OK). */
export const experienceNavPillV2 = "portal-v2-liquid-glass";

/** Bottom action dock. */
export const experienceDockV2 = cn(
  "portal-v2-glass",
  "border-white/12 bg-[#0B0F1A]/65"
);

/** Horizontal page inset — block width presets control spacing at all viewports. */
export const experiencePageXV2 = "px-0";

export const experienceContentMaxV2 = "mx-auto w-full max-w-6xl min-h-0";

/** Block-based portal pages — full width of content band; spacing from block presets. */
export const experienceBlockPageContentV2 = "mx-0 w-full max-w-none min-h-0";

export const experienceSlideV2 = "flex min-h-0 flex-col";

/** Fill parent content band — inner regions scroll instead of the page. */
export const experienceViewportLockV2 = cn(
  "h-full min-h-0 max-h-full overflow-hidden"
);
