import { describe, expect, it } from "vitest";
import { containerWantsFill } from "./portal-block-layout";
import { createEmptyContainer } from "./page-blocks-utils";
import type { ExperiencePageBlock } from "./experience-content";

type Container = Extract<ExperiencePageBlock, { type: "container" }>;
const box = (extra: Partial<Container> = {}, child?: ExperiencePageBlock): Container => {
  const c = createEmptyContainer(1, 1);
  c.cells = [[child ? [child] : []]];
  return { ...c, ...extra };
};

describe("containerWantsFill", () => {
  it("is off by default and for non-containers", () => {
    expect(containerWantsFill(box())).toBe(false);
    expect(containerWantsFill({ id: "t", type: "text", markdown: "x" })).toBe(false);
  });

  it("is on for 'Fill the available space' and for packing/spreading rows", () => {
    expect(containerWantsFill(box({ minHeight: "fill" }))).toBe(true);
    expect(containerWantsFill(box({ spaceRows: "end" }))).toBe(true);
    expect(containerWantsFill(box({ spaceRows: "stretch" }))).toBe(false);
    expect(containerWantsFill(box({ minHeight: "lg" }))).toBe(false); // a fixed height is not fill
  });

  it("passes up through every level, so nested containers can grow", () => {
    const inner = box({ minHeight: "fill" });
    const middle = box({}, inner); // default settings, but holds a filler
    const outer = box({}, middle);
    expect(containerWantsFill(middle)).toBe(true);
    expect(containerWantsFill(outer)).toBe(true);
    expect(containerWantsFill(box({}, { id: "t", type: "text", markdown: "x" }))).toBe(false);
  });
});
