import { describe, expect, it } from "vitest";
import type { ExperiencePageBlock } from "@/lib/experience-content";
import {
  applyInheritedLayout,
  describeInheritedAlign,
  describeInheritedWidth,
  inheritedForNested,
  inheritedForTopLevel,
  resolveInheritedFor,
} from "@/lib/page-layout-inheritance";
import { DEFAULT_LAYOUT_SETTINGS, blockWidthStyleVars, resolvePanelOpacity } from "@/lib/portal-layout-settings";
import { parsePortalLayoutSettings } from "@/lib/portal-layout-settings";

const text = (id: string, blockLayout?: object): ExperiencePageBlock => ({ id, type: "text", markdown: id, ...(blockLayout ? { blockLayout } : {}) }) as ExperiencePageBlock;

describe("applyInheritedLayout", () => {
  it("top-level elements take the page's width and alignment", () => {
    const page = inheritedForTopLevel({ widthDesktop: "narrow", widthMobile: "full", align: "left" });
    expect(applyInheritedLayout(undefined, page)).toEqual({ widthDesktop: "narrow", widthMobile: "full", align: "left" });
  });

  it("an element's own width or alignment wins; the rest is inherited", () => {
    const page = inheritedForTopLevel({ widthDesktop: "narrow", widthMobile: "narrow", align: "left" });
    expect(applyInheritedLayout({ widthDesktop: "wide" }, page)).toEqual({ widthDesktop: "wide", align: "left" });
    expect(applyInheritedLayout({ align: "right" }, page)).toEqual({ align: "right", widthDesktop: "narrow", widthMobile: "narrow" });
    // legacy width counts as an explicit width
    expect(applyInheritedLayout({ width: "full" }, page)).toEqual({ width: "full", align: "left" });
  });

  it("nested elements fill their parent", () => {
    expect(applyInheritedLayout(undefined, inheritedForNested("right"))).toEqual({ widthDesktop: "full", widthMobile: "full", align: "right" });
    // so an 80% parent doesn't shrink its children to 64%
    const vars = blockWidthStyleVars(applyInheritedLayout(undefined, inheritedForNested(undefined)), DEFAULT_LAYOUT_SETTINGS) as Record<string, string>;
    expect(vars["--block-width"]).toBe("100%");
  });

  it("with nothing to inherit it leaves the layout alone", () => {
    expect(applyInheritedLayout(undefined, {})).toBeUndefined();
    const own = { align: "left" } as const;
    expect(applyInheritedLayout(own, undefined)).toBe(own);
  });
});

describe("resolveInheritedFor (what the inspector shows as 'Inherit (…)')", () => {
  const blocks: ExperiencePageBlock[] = [
    text("top"),
    {
      id: "box",
      type: "container",
      rows: 1,
      cols: 2,
      gap: "md",
      columnWeights: [1, 1],
      rowWeights: [1],
      blockLayout: { align: "left" },
      cells: [[[text("in-cell")], [{ id: "row", type: "row", preset: "equal-2", gap: "md", columns: [[text("deep")], []] } as ExperiencePageBlock]]],
    } as ExperiencePageBlock,
  ];
  const page = { widthDesktop: "narrow", align: "right" } as const;

  it("a top-level element inherits the page", () => {
    const r = resolveInheritedFor(blocks, [0], page);
    expect(r.nested).toBe(false);
    expect(r.inherited).toMatchObject({ widthDesktop: "narrow", align: "right" });
    expect(describeInheritedWidth(r.inherited, r.nested, "desktop", DEFAULT_LAYOUT_SETTINGS)).toBe("Narrow");
    expect(describeInheritedAlign(r.inherited)).toBe("Right");
  });

  it("an element in a container fills it and follows the container's alignment", () => {
    const r = resolveInheritedFor(blocks, [1, 0, 0, 0], page);
    expect(r.nested).toBe(true);
    expect(r.inherited).toMatchObject({ widthDesktop: "full", align: "left" });
    expect(describeInheritedWidth(r.inherited, r.nested, "desktop", DEFAULT_LAYOUT_SETTINGS)).toBe("fill parent");
  });

  it("alignment keeps flowing down through nested rows", () => {
    const r = resolveInheritedFor(blocks, [1, 0, 1, 0, 0, 0], page); // container -> cell -> row -> column 0 -> block
    expect(r.nested).toBe(true);
    expect(r.inherited.align).toBe("left");
  });

  it("with no page layout everything falls back to the branding default and centre", () => {
    const r = resolveInheritedFor(blocks, [0], undefined);
    expect(describeInheritedWidth(r.inherited, r.nested, "desktop", DEFAULT_LAYOUT_SETTINGS)).toBe("Normal");
    expect(describeInheritedAlign(r.inherited)).toBe("Center");
  });
});

describe("panel opacity default", () => {
  it("falls back from the element, to the branding default, to 100", () => {
    expect(resolvePanelOpacity({ panelOpacity: 40 }, DEFAULT_LAYOUT_SETTINGS)).toBe(40);
    expect(resolvePanelOpacity(undefined, { ...DEFAULT_LAYOUT_SETTINGS, panelOpacity: 60 })).toBe(60);
    expect(resolvePanelOpacity(undefined, DEFAULT_LAYOUT_SETTINGS)).toBe(100);
    expect(resolvePanelOpacity({ panelOpacity: 0 }, { ...DEFAULT_LAYOUT_SETTINGS, panelOpacity: 60 })).toBe(0); // 0 is a real value
  });
  it("is kept when branding settings are parsed", () => {
    expect(parsePortalLayoutSettings({ ...DEFAULT_LAYOUT_SETTINGS, panelOpacity: 55 }).panelOpacity).toBe(55);
    expect(parsePortalLayoutSettings({ ...DEFAULT_LAYOUT_SETTINGS, panelOpacity: 500 })).toEqual(DEFAULT_LAYOUT_SETTINGS); // invalid → defaults
  });
});
