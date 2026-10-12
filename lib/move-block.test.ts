import { describe, expect, it } from "vitest";
import { findBlockById, moveBlockToPath } from "./portal-block-layout";
import { createEmptyContainer } from "./page-blocks-utils";
import type { ExperiencePageBlock } from "./experience-content";

const text = (id: string): ExperiencePageBlock => ({ id, type: "text", markdown: id });

function tree(): ExperiencePageBlock[] {
  const box = createEmptyContainer(1, 1);
  box.id = "box";
  box.cells = [[[text("inside")]]];
  return [text("a"), box, text("c")];
}

describe("moveBlockToPath", () => {
  it("moves a top-level block into a LATER container's cell without losing it", () => {
    const moved = moveBlockToPath(tree(), "a", [1, 0, 0], 0);
    expect(moved).not.toBeNull();
    const found = findBlockById(moved!.blocks, "a");
    expect(found?.path).toEqual([0, 0, 0, 0]);
    expect(moved!.blocks.map((b) => b.id)).toEqual(["box", "c"]);
  });

  it("moves a block out of a container to the top level", () => {
    const moved = moveBlockToPath(tree(), "inside", [], 0);
    expect(moved!.blocks.map((b) => b.id)).toEqual(["inside", "a", "box", "c"]);
  });

  it("refuses to drop a container into its own cell", () => {
    expect(moveBlockToPath(tree(), "box", [1, 0, 0], 0)).toBeNull();
  });

  it("adjusts the index when moving later within the same list", () => {
    const moved = moveBlockToPath(tree(), "a", [], 3);
    expect(moved!.blocks.map((b) => b.id)).toEqual(["box", "c", "a"]);
  });

  it("returns null for an unknown block", () => {
    expect(moveBlockToPath(tree(), "nope", [], 0)).toBeNull();
  });
});
