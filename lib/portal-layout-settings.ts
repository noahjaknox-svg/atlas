import { z } from "zod";
import type { CSSProperties } from "react";
import type { BlockLayout, BlockWidth } from "./experience-content";

export type LayoutWidthPresetId = string;

export type LayoutWidthPreset = {
  id: LayoutWidthPresetId;
  label: string;
  desktopPercent: number;
  mobilePercent: number;
};

export type PortalLayoutSettings = {
  widthPresets: LayoutWidthPreset[];
  defaultPresetId: LayoutWidthPresetId;
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

export const portalLayoutSettingsSchema = z.object({
  widthPresets: z.array(layoutWidthPresetSchema).min(1),
  defaultPresetId: z.string().min(1),
});

export const DEFAULT_LAYOUT_SETTINGS: PortalLayoutSettings = {
  defaultPresetId: "normal",
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
  if (!hasDefault) {
    return { ...parsed.data, defaultPresetId: parsed.data.widthPresets[0]!.id };
  }
  return parsed.data;
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
      return "hidden md:block";
    case "mobile":
      return "md:hidden";
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

export const BLOCK_WIDTH_RESPONSIVE_CLASS =
  "w-[var(--block-width)] max-md:w-[var(--block-width-mobile)] max-w-full";
