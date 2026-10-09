import { describe, expect, it } from "vitest";
import { createEmptyBlock } from "@/lib/page-blocks-utils";
import { blockLabel } from "@/lib/portal-block-layout";
import { PALETTE_ITEMS } from "@/components/internal/portal-designer/portal-designer-block-palette";
import { DESIGNER_BLOCK_TYPES } from "@/components/internal/portal-designer/portal-designer-types";
import { pageBlockSchema, proposalSectionPatchSchema } from "@/lib/experience-section-schema";

const LEAF_TYPES = ["text", "heading", "image", "gallery", "html", "spacer", "quote", "cta", "video", "stat"] as const;

describe("new block defaults", () => {
  it("new blocks carry no layout of their own, so they inherit the page (or fill their parent)", () => {
    for (const type of LEAF_TYPES) {
      expect((createEmptyBlock(type) as { blockLayout?: unknown }).blockLayout, type).toBeUndefined();
    }
  });

  it("new containers and rows don't force a width either", () => {
    const container = createEmptyBlock("container") as { blockLayout?: unknown; width?: unknown };
    expect(container.blockLayout).toBeUndefined();
    expect(container.width).toBeUndefined();
    expect((createEmptyBlock("row") as { blockLayout?: unknown }).blockLayout).toBeUndefined();
  });

  it("new blocks still validate against the page schema", () => {
    // Blocks that need a URL/label to be valid get one; layout must never be the reason it fails.
    const filled: Record<string, object> = { image: { url: "https://x.test/a.png", alt: "x" }, video: { url: "https://x.test/v.mp4" }, cta: { url: "https://x.test" } };
    for (const type of LEAF_TYPES) {
      const block = { ...createEmptyBlock(type), ...(filled[type] ?? {}) };
      const result = pageBlockSchema.safeParse(block);
      expect(result.success, `${type}: ${JSON.stringify(result.success ? "" : result.error.issues)}`).toBe(true);
    }
  });

  it("the schema keeps the new panel and page-layout fields (it strips unknown keys)", () => {
    const withPanel = pageBlockSchema.safeParse({ id: "t", type: "text", markdown: "x", blockLayout: { panel: true, panelOpacity: 40 } });
    expect(withPanel.success && (withPanel.data as { blockLayout?: unknown }).blockLayout).toEqual({ panel: true, panelOpacity: 40 });
    expect(pageBlockSchema.safeParse({ id: "t", type: "text", markdown: "x", blockLayout: { panelOpacity: 140 } }).success).toBe(false);
    const patch = proposalSectionPatchSchema.safeParse({ id: "s1", contentBlocks: { pageLayout: { widthDesktop: "narrow", align: "left" } } });
    expect(patch.success && (patch.data.contentBlocks as { pageLayout?: unknown })?.pageLayout).toEqual({ widthDesktop: "narrow", align: "left" });
  });
});

describe("Block vs flight is no longer addable, but existing blocks keep working", () => {
  it("is absent from the palette and the add / convert lists", () => {
    expect(PALETTE_ITEMS.some((p) => p.id.endsWith("blockVsFlight"))).toBe(false);
    expect(DESIGNER_BLOCK_TYPES.some((t) => (t.type as string) === "blockVsFlight")).toBe(false);
  });

  it("an existing block still validates and keeps a readable label in the block list", () => {
    const existing = { id: "b1", type: "blockVsFlight" as const, blockHours: 1.2, flightHours: 1 };
    expect(pageBlockSchema.safeParse(existing).success).toBe(true);
    expect(blockLabel(existing)).toMatch(/block/i);
  });
});
