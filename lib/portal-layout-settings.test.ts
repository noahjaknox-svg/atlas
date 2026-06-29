import { describe, expect, it } from "vitest";
import type { BlockLayout } from "./experience-content";
import {
  DEFAULT_LAYOUT_BREAKPOINTS,
  DEFAULT_LAYOUT_SETTINGS,
  blockWidthStyleVars,
  breakpointStyleContent,
  findWidthPreset,
  isBlockVisibleInViewport,
  parsePortalLayoutSettings,
  resolveBlockWidthPresetId,
  resolveLayoutBreakpoints,
  resolveLayoutSettings,
  resolveShellBlockLayout,
  visibilityClasses,
  widthPercentForPreset,
} from "./portal-layout-settings";

describe("parsePortalLayoutSettings", () => {
  it("returns defaults for invalid input", () => {
    expect(parsePortalLayoutSettings(null).defaultPresetId).toBe("normal");
  });

  it("merges default breakpoints when omitted", () => {
    const parsed = parsePortalLayoutSettings({
      defaultPresetId: "normal",
      widthPresets: DEFAULT_LAYOUT_SETTINGS.widthPresets,
    });
    expect(parsed.breakpoints).toEqual(DEFAULT_LAYOUT_BREAKPOINTS);
  });

  it("preserves custom breakpoints", () => {
    const parsed = parsePortalLayoutSettings({
      ...DEFAULT_LAYOUT_SETTINGS,
      breakpoints: { desktopMinWidth: 900, gridMinWidth: 1100 },
    });
    expect(parsed.breakpoints).toEqual({ desktopMinWidth: 900, gridMinWidth: 1100 });
  });
});

describe("resolveLayoutBreakpoints", () => {
  it("falls back to defaults", () => {
    expect(resolveLayoutBreakpoints({ ...DEFAULT_LAYOUT_SETTINGS, breakpoints: undefined })).toEqual(
      DEFAULT_LAYOUT_BREAKPOINTS
    );
  });
});

describe("breakpointStyleContent", () => {
  it("includes configured pixel values", () => {
    const css = breakpointStyleContent({ desktopMinWidth: 900, gridMinWidth: 1100 });
    expect(css).toContain("max-width: 899px");
    expect(css).toContain("min-width: 900px");
    expect(css).toContain("min-width: 1100px");
    expect(css).toContain("max-width: 1099px");
    expect(css).toContain(".portal-layout-show-desktop");
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
  it("maps visibility to injected layout classes", () => {
    expect(visibilityClasses("both")).toBe("");
    expect(visibilityClasses("desktop")).toBe("hidden portal-layout-show-desktop");
    expect(visibilityClasses("mobile")).toBe("portal-layout-show-mobile");
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

describe("resolveShellBlockLayout", () => {
  it("returns explicit blockLayout when set", () => {
    const layout: BlockLayout = { widthDesktop: "wide", widthMobile: "full", visibility: "both" };
    expect(
      resolveShellBlockLayout({
        id: "c1",
        type: "container",
        rows: 1,
        cols: 1,
        cells: [[[]]],
        blockLayout: layout,
      })
    ).toEqual(layout);
  });

  it("migrates legacy container width and align", () => {
    expect(
      resolveShellBlockLayout({
        id: "c1",
        type: "container",
        rows: 1,
        cols: 1,
        width: "narrow",
        align: "center",
        cells: [[[]]],
      })
    ).toEqual({
      widthDesktop: "narrow",
      widthMobile: "narrow",
      align: "center",
    });
  });

  it("defaults nested shells to full width of grid cell", () => {
    expect(
      resolveShellBlockLayout(
        {
          id: "c1",
          type: "container",
          rows: 1,
          cols: 1,
          cells: [[[]]],
        },
        { nestedInGridCell: true }
      )
    ).toEqual({ widthDesktop: "full", widthMobile: "full" });
  });

  it("defaults top-level shells to empty layout for preset fallback", () => {
    expect(
      resolveShellBlockLayout({
        id: "r1",
        type: "row",
        preset: "equal-2",
        columns: [[], []],
      })
    ).toEqual({});
  });
});
