import { describe, expect, it } from "vitest";
import { createEmptyBlock, NEW_BLOCK_LAYOUT } from "@/lib/page-blocks-utils";
import { blockLabel } from "@/lib/portal-block-layout";
import { PALETTE_ITEMS } from "@/components/internal/portal-designer/portal-designer-block-palette";
import { DESIGNER_BLOCK_TYPES } from "@/components/internal/portal-designer/portal-designer-types";
import { pageBlockSchema } from "@/lib/experience-section-schema";

const LEAF_TYPES = ["text", "heading", "image", "gallery", "html", "spacer", "quote", "cta", "video", "stat"] as const;

describe("new block defaults", () => {
  it("every new leaf block is Normal width, centered, and carries its own copy of the layout", () => {
    expect(NEW_BLOCK_LAYOUT).toEqual({ widthDesktop: "normal", widthMobile: "normal", align: "center" });
    for (const type of LEAF_TYPES) {
      const block = createEmptyBlock(type) as { blockLayout?: unknown };
      expect(block.blockLayout, type).toEqual(NEW_BLOCK_LAYOUT);
    }
    const a = createEmptyBlock("text") as { blockLayout: object };
    const b = createEmptyBlock("text") as { blockLayout: object };
    expect(a.blockLayout).not.toBe(b.blockLayout); // editing one must not change the other
  });

  it("containers and rows are left to their own layout resolution", () => {
    expect((createEmptyBlock("container") as { blockLayout?: unknown }).blockLayout).toBeUndefined();
    expect((createEmptyBlock("row") as { blockLayout?: unknown }).blockLayout).toBeUndefined();
  });

  it("new blocks still validate against the page schema (layout included)", () => {
    // Blocks that need a URL/label to be valid get one; the layout field itself must never be the reason it fails.
    const filled: Record<string, object> = { image: { url: "https://x.test/a.png", alt: "x" }, video: { url: "https://x.test/v.mp4" }, cta: { url: "https://x.test" } };
    for (const type of LEAF_TYPES) {
      const block = { ...createEmptyBlock(type), ...(filled[type] ?? {}) };
      const result = pageBlockSchema.safeParse(block);
      expect(result.success, `${type}: ${JSON.stringify(result.success ? "" : result.error.issues)}`).toBe(true);
    }
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
