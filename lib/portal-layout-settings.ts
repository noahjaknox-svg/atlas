import { z } from "zod";
import type { CSSProperties } from "react";
import type { BlockLayout, BlockWidth, ExperiencePageBlock } from "./experience-content";

export type LayoutWidthPresetId = string;

export type LayoutWidthPreset = {
  id: LayoutWidthPresetId;
  label: string;
  desktopPercent: number;
  mobilePercent: number;
};

export type PortalLayoutBreakpoints = {
  /** Min viewport width (px) where desktop width presets apply. */
  desktopMinWidth: number;
  /** Min viewport width (px) where multi-column container/row grids go horizontal. */
  gridMinWidth: number;
};

export type PortalLayoutSettings = {
  widthPresets: LayoutWidthPreset[];
  defaultPresetId: LayoutWidthPresetId;
  breakpoints?: PortalLayoutBreakpoints;
};

export type BlockVisibility = "both" | "desktop" | "mobile";

export type LayoutViewport = "desktop" | "mobile";

const PERCENT_MIN = 25;
const PERCENT_MAX = 100;

export const layoutWidthPresetSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  desktopPercent: z.number().min(PERCENT_MIN).max(PERCENT_MAX),
  mobilePercent: z.number().min(PERCENT_MIN).max(PERCENT_MAX),
});

export const DEFAULT_LAYOUT_BREAKPOINTS: PortalLayoutBreakpoints = {
  desktopMinWidth: 768,
  gridMinWidth: 1024,
};

export const portalLayoutBreakpointsSchema = z
  .object({
    desktopMinWidth: z.number().int().min(480).max(1200),
    gridMinWidth: z.number().int().min(640).max(1600),
  })
  .refine((data) => data.gridMinWidth >= data.desktopMinWidth, {
    message: "gridMinWidth must be >= desktopMinWidth",
  });

export const portalLayoutSettingsSchema = z.object({
  widthPresets: z.array(layoutWidthPresetSchema).min(1),
  defaultPresetId: z.string().min(1),
  breakpoints: portalLayoutBreakpointsSchema.optional(),
});

export const DEFAULT_LAYOUT_SETTINGS: PortalLayoutSettings = {
  defaultPresetId: "normal",
  breakpoints: DEFAULT_LAYOUT_BREAKPOINTS,
  widthPresets: [
    { id: "full", label: "Full", desktopPercent: 100, mobilePercent: 100 },
    { id: "wide", label: "Wide", desktopPercent: 90, mobilePercent: 96 },
    { id: "normal", label: "Normal", desktopPercent: 80, mobilePercent: 92 },
    { id: "narrow", label: "Narrow", desktopPercent: 65, mobilePercent: 88 },
    { id: "compact", label: "Compact", desktopPercent: 50, mobilePercent: 85 },
  ],
};

const LEGACY_WIDTH_TO_PRESET: Record<BlockWidth, LayoutWidthPresetId> = {
  full: "full",
  auto: "normal",
  medium: "wide",
  narrow: "narrow",
};

export function parsePortalLayoutSettings(raw: unknown): PortalLayoutSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_LAYOUT_SETTINGS;
  const parsed = portalLayoutSettingsSchema.safeParse(raw);
  if (!parsed.success) return DEFAULT_LAYOUT_SETTINGS;
  const hasDefault = parsed.data.widthPresets.some((p) => p.id === parsed.data.defaultPresetId);
  const breakpoints = parsed.data.breakpoints ?? DEFAULT_LAYOUT_BREAKPOINTS;
  const base = hasDefault
    ? { ...parsed.data, breakpoints }
    : { ...parsed.data, defaultPresetId: parsed.data.widthPresets[0]!.id, breakpoints };
  return base;
}

export function resolveLayoutBreakpoints(
  settings: PortalLayoutSettings = DEFAULT_LAYOUT_SETTINGS
): PortalLayoutBreakpoints {
  return settings.breakpoints ?? DEFAULT_LAYOUT_BREAKPOINTS;
}

/** Injected stylesheet for branding-configurable layout breakpoints (live portal). */
export function breakpointStyleContent(breakpoints: PortalLayoutBreakpoints): string {
  const desktopMin = breakpoints.desktopMinWidth;
  const desktopMax = desktopMin - 1;
  const gridMin = breakpoints.gridMinWidth;
  const gridMax = gridMin - 1;

  return `
@media (max-width: ${desktopMax}px) {
  .block-width-responsive {
    width: var(--block-width-mobile);
  }
}

@media (min-width: ${gridMin}px) {
  .portal-row-grid[data-row-layout="responsive"] {
    grid-template-columns: var(--portal-row-template);
  }
  .portal-container-grid[data-layout="responsive"] {
    grid-template-columns: var(--portal-col-template);
    grid-template-rows: var(--portal-row-template);
  }
}

@media (max-width: ${gridMax}px) {
  .portal-container-grid[data-layout="responsive"] {
    grid-template-columns: 1fr !important;
    grid-template-rows: auto !important;
  }
  .portal-row-grid[data-row-layout="responsive"] {
    grid-template-columns: 1fr !important;
  }
}

.portal-layout-show-desktop {
  display: none !important;
}
.portal-layout-show-mobile {
  display: block !important;
}
@media (min-width: ${desktopMin}px) {
  .portal-layout-show-desktop {
    display: block !important;
  }
  .portal-layout-show-mobile {
    display: none !important;
  }
}
`.trim();
}

export function resolveLayoutSettings(
  snapshotLayout?: PortalLayoutSettings | null,
  liveLayout?: PortalLayoutSettings | null
): PortalLayoutSettings {
  if (snapshotLayout) return parsePortalLayoutSettings(snapshotLayout);
  if (liveLayout) return parsePortalLayoutSettings(liveLayout);
  return DEFAULT_LAYOUT_SETTINGS;
}

export function findWidthPreset(
  settings: PortalLayoutSettings,
  presetId?: string | null
): LayoutWidthPreset {
  const id = presetId ?? settings.defaultPresetId;
  return (
    settings.widthPresets.find((p) => p.id === id) ??
    settings.widthPresets.find((p) => p.id === settings.defaultPresetId) ??
    DEFAULT_LAYOUT_SETTINGS.widthPresets.find((p) => p.id === "normal")!
  );
}

export function resolveBlockWidthPresetId(
  blockLayout: BlockLayout | undefined,
  viewport: LayoutViewport,
  settings: PortalLayoutSettings
): LayoutWidthPresetId {
  const explicit =
    viewport === "mobile" ? blockLayout?.widthMobile : blockLayout?.widthDesktop;
  if (explicit) return explicit;

  const other =
    viewport === "mobile" ? blockLayout?.widthDesktop : blockLayout?.widthMobile;
  if (other) return other;

  if (blockLayout?.width) {
    return LEGACY_WIDTH_TO_PRESET[blockLayout.width] ?? settings.defaultPresetId;
  }

  return settings.defaultPresetId;
}

export function widthPercentForPreset(
  preset: LayoutWidthPreset,
  viewport: LayoutViewport
): number {
  return viewport === "mobile" ? preset.mobilePercent : preset.desktopPercent;
}

export function blockWidthStyleVars(
  blockLayout: BlockLayout | undefined,
  settings: PortalLayoutSettings
): CSSProperties {
  const desktopPreset = findWidthPreset(
    settings,
    resolveBlockWidthPresetId(blockLayout, "desktop", settings)
  );
  const mobilePreset = findWidthPreset(
    settings,
    resolveBlockWidthPresetId(blockLayout, "mobile", settings)
  );
  return {
    ["--block-width" as string]: `${widthPercentForPreset(desktopPreset, "desktop")}%`,
    ["--block-width-mobile" as string]: `${widthPercentForPreset(mobilePreset, "mobile")}%`,
  };
}

export function visibilityClasses(visibility: BlockVisibility = "both"): string {
  switch (visibility) {
    case "desktop":
      return "hidden portal-layout-show-desktop";
    case "mobile":
      return "portal-layout-show-mobile";
    case "both":
    default:
      return "";
  }
}

export function isBlockVisibleInViewport(
  visibility: BlockVisibility | undefined,
  viewport: LayoutViewport,
  designMode: boolean
): boolean {
  if (!designMode) return true;
  const v = visibility ?? "both";
  if (v === "both") return true;
  if (v === "desktop") return viewport === "desktop";
  return viewport === "mobile";
}

export const BLOCK_WIDTH_RESPONSIVE_CLASS = "block-width-responsive";

type ShellBlock = Extract<ExperiencePageBlock, { type: "container" | "row" }>;

/** Resolve layout for container/row shells (legacy container fields + nested defaults). */
export function resolveShellBlockLayout(
  block: ShellBlock,
  options?: { nestedInGridCell?: boolean }
): BlockLayout {
  if (block.blockLayout) return block.blockLayout;

  if (block.type === "container" && (block.width != null || block.align != null)) {
    const layout: BlockLayout = {};
    if (block.width) {
      layout.widthDesktop = LEGACY_WIDTH_TO_PRESET[block.width] ?? "normal";
      layout.widthMobile = layout.widthDesktop;
    }
    if (block.align) layout.align = block.align;
    return layout;
  }

  if (options?.nestedInGridCell) {
    return { widthDesktop: "full", widthMobile: "full" };
  }

  return {};
}
