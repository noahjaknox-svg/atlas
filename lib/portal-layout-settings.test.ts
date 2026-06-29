import { describe, expect, it } from "vitest";
import type { BlockLayout } from "./experience-content";
import {
  DEFAULT_LAYOUT_SETTINGS,
  blockWidthStyleVars,
  findWidthPreset,
  isBlockVisibleInViewport,
  parsePortalLayoutSettings,
  resolveBlockWidthPresetId,
  resolveLayoutSettings,
  visibilityClasses,
  widthPercentForPreset,
} from "./portal-layout-settings";

describe("parsePortalLayoutSettings", () => {
  it("returns defaults for invalid input", () => {
    expect(parsePortalLayoutSettings(null).defaultPresetId).toBe("normal");
  });
});

describe("resolveBlockWidthPresetId", () => {
  it("uses desktop and mobile presets separately", () => {
    const layout: BlockLayout = { widthDesktop: "wide", widthMobile: "full" };
    expect(resolveBlockWidthPresetId(layout, "desktop", DEFAULT_LAYOUT_SETTINGS)).toBe("wide");
    expect(resolveBlockWidthPresetId(layout, "mobile", DEFAULT_LAYOUT_SETTINGS)).toBe("full");
  });

  it("migrates legacy width", () => {
    expect(
      resolveBlockWidthPresetId({ width: "auto" }, "desktop", DEFAULT_LAYOUT_SETTINGS)
    ).toBe("normal");
    expect(
      resolveBlockWidthPresetId({ width: "medium" }, "desktop", DEFAULT_LAYOUT_SETTINGS)
    ).toBe("wide");
  });
});

describe("blockWidthStyleVars", () => {
  it("sets css variables from presets", () => {
    const style = blockWidthStyleVars(
      { widthDesktop: "normal", widthMobile: "full" },
      DEFAULT_LAYOUT_SETTINGS
    );
    expect(style["--block-width"]).toBe("80%");
    expect(style["--block-width-mobile"]).toBe("100%");
  });
});

describe("visibilityClasses", () => {
  it("maps visibility to tailwind", () => {
    expect(visibilityClasses("both")).toBe("");
    expect(visibilityClasses("desktop")).toBe("hidden md:block");
    expect(visibilityClasses("mobile")).toBe("md:hidden");
  });
});

describe("isBlockVisibleInViewport", () => {
  it("filters in design mode only", () => {
    expect(isBlockVisibleInViewport("desktop", "mobile", true)).toBe(false);
    expect(isBlockVisibleInViewport("desktop", "mobile", false)).toBe(true);
  });
});

describe("resolveLayoutSettings", () => {
  it("prefers snapshot over live", () => {
    const custom = {
      ...DEFAULT_LAYOUT_SETTINGS,
      defaultPresetId: "compact",
    };
    expect(resolveLayoutSettings(custom, DEFAULT_LAYOUT_SETTINGS).defaultPresetId).toBe("compact");
  });
});

describe("widthPercentForPreset", () => {
  it("returns viewport-specific percent", () => {
    const normal = findWidthPreset(DEFAULT_LAYOUT_SETTINGS, "normal");
    expect(widthPercentForPreset(normal, "desktop")).toBe(80);
    expect(widthPercentForPreset(normal, "mobile")).toBe(92);
  });
});
