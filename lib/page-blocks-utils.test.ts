import { describe, expect, it } from "vitest";
import {
  getSectionPageBlocks,
  sectionUsesPageBlocks,
  synthesizePageBlocksFromLegacy,
} from "./page-blocks-utils";

describe("page-blocks-utils", () => {
  it("synthesizes blocks from legacy section fields when pageBlocks is missing", () => {
    const blocks = synthesizePageBlocksFromLegacy({
      bodyCopy: "Hello",
      imageUrl: "https://example.com/a.jpg",
      contentBlocks: { gallery: [{ url: "https://example.com/g.jpg", caption: "" }] },
    });
    expect(blocks).toHaveLength(3);
  });

  it("returns empty array when pageBlocks is explicitly empty", () => {
    const blocks = getSectionPageBlocks({
      bodyCopy: "Legacy copy that should not reappear",
      imageUrl: "https://example.com/legacy.jpg",
      contentBlocks: { pageBlocks: [] },
    });
    expect(blocks).toEqual([]);
  });

  it("normalizes stored pageBlocks without falling back to legacy", () => {
    const blocks = getSectionPageBlocks({
      bodyCopy: "Legacy copy",
      imageUrl: null,
      contentBlocks: {
        pageBlocks: [{ id: "t1", type: "text", markdown: "From blocks" }],
      },
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe("text");
  });

  it("sectionUsesPageBlocks is true for explicit empty pageBlocks", () => {
    expect(
      sectionUsesPageBlocks({
        contentBlocks: { pageBlocks: [] },
      })
    ).toBe(true);
  });

  it("sectionUsesPageBlocks is false when pageBlocks was never set", () => {
    expect(sectionUsesPageBlocks({ contentBlocks: null })).toBe(false);
    expect(sectionUsesPageBlocks({ contentBlocks: {} })).toBe(false);
  });
});
