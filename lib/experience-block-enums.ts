/**
 * Single source of truth for every constrained (enum-like) field on the portal
 * experience block schema. Both the TypeScript types (lib/experience-content.ts,
 * lib/portal-layout-settings.ts) and the Zod validation schema
 * (lib/experience-section-schema.ts) derive from these arrays, so they cannot
 * drift out of sync with each other — and the Page Code AI instructions
 * (lib/portal-page-code-ai-instructions.ts) read the same arrays to document
 * the exact accepted values.
 */

export const BLOCK_WIDTHS = ["auto", "narrow", "medium", "full"] as const;
export const BLOCK_ALIGNS = ["left", "center", "right"] as const;
export const BLOCK_VERTICAL_ALIGNS = ["top", "center", "bottom"] as const;
export const BLOCK_PADDINGS = ["none", "sm", "md", "lg"] as const;
export const BLOCK_VISIBILITIES = ["both", "desktop", "mobile"] as const;

export const ROW_PRESETS = ["equal-2", "equal-3", "wide-narrow", "narrow-wide"] as const;
export const ROW_GAPS = ["sm", "md", "lg"] as const;
export const ROW_DISPLAYS = ["columns", "rows"] as const;
export const CONTAINER_CELL_ALIGNS = ["start", "stretch"] as const;

/** Container spacing (all optional; absent = the container's original equal-weights layout). */
export const CONTAINER_GAPS = ["none", "sm", "md", "lg", "xl"] as const;
/** How a container's columns (or rows) are distributed along their axis. "stretch" = equal tracks sized by the weights. */
export const SPACE_DISTRIBUTIONS = ["stretch", "start", "center", "end", "between", "around", "evenly"] as const;
/** Where each cell sits within its row track. */
export const ALIGN_CELLS = ["stretch", "start", "center", "end"] as const;
/** Minimum height of a container — gives vertical spacing room to act. */
export const CONTAINER_MIN_HEIGHTS = ["auto", "sm", "md", "lg", "screen", "fill"] as const;

export const IMAGE_DISPLAY_SIZES = ["icon", "small", "fit", "large"] as const;
export const CTA_VARIANTS = ["primary", "secondary"] as const;
export const EXPERIENCE_GALLERY_LAYOUTS = [
  "single",
  "leadership",
  "leadershipRow",
  "editorialPair",
  "welcome",
  "compact",
] as const;
