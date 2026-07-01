import { describe, expect, it } from "vitest";
import {
  containerGridProps,
  findBlockById,
  getGridTemplate,
  getLeafHorizontalJustifyClass,
  getLeafVerticalJustifyClass,
  getRowGridClasses,
  getRowGridClassesFromWeights,
  getRowGridTemplateColumns,
  resolveContainerLayout,
  resolveRowLayout,
  removeBlockById,
  updateBlockById,
  walkBlocks,
} from "./portal-block-layout";
import type { ExperiencePageBlock } from "./experience-content";
import { migrateRowToContainer, normalizePageBlocks } from "./page-blocks-utils";

const sampleBlocks: ExperiencePageBlock[] = [
  { id: "t1", type: "text", markdown: "Hello" },
  {
    id: "r1",
    type: "row",
    preset: "equal-2",
    gap: "md",
    columns: [
      [{ id: "t2", type: "text", markdown: "Col 1" }],
      [{ id: "i1", type: "image", url: "https://example.com/a.jpg" }],
    ],
  },
];

describe("portal-block-layout", () => {
  it("maps row presets to grid classes", () => {
    expect(getRowGridClasses("equal-2")).toContain("portal-row-grid");
    expect(getRowGridClasses("equal-3")).toContain("portal-row-grid");
    expect(getRowGridTemplateColumns(2, [1, 1], "responsive")).toBe("1fr 1fr");
    expect(getRowGridTemplateColumns(3, [1, 1, 1], "horizontal")).toBe("1fr 1fr 1fr");
  });

  it("builds weighted grid templates for 1–4 columns", () => {
    expect(getRowGridClassesFromWeights(1, [1])).not.toContain("portal-row-grid");
    expect(getRowGridTemplateColumns(4, [1, 1, 1, 1], "horizontal")).toBe("1fr 1fr 1fr 1fr");
    expect(getRowGridTemplateColumns(3, [2, 1, 1], "horizontal")).toBe("2fr 1fr 1fr");
  });

  it("uses horizontal layout class for designer desktop", () => {
    expect(getRowGridClassesFromWeights(3, [1, 1, 1], "md", "horizontal")).toContain(
      "portal-row-grid"
    );
    expect(getRowGridTemplateColumns(3, [1, 1, 1], "horizontal")).toBe("1fr 1fr 1fr");
  });

  it("uses stacked layout for designer mobile", () => {
    expect(getRowGridClassesFromWeights(3, [1, 1, 1], "md", "stacked")).toBe("grid grid-cols-1 gap-5");
    expect(getRowGridTemplateColumns(3, [1, 1, 1], "stacked")).toBeUndefined();
  });

  it("resolveRowLayout uses column count from columns array", () => {
    const row = sampleBlocks[1]!;
    if (row.type !== "row") throw new Error("expected row");
    expect(resolveRowLayout(row).count).toBe(2);
  });

  it("walks nested blocks", () => {
    const ids: string[] = [];
    walkBlocks(sampleBlocks, (block) => ids.push(block.id));
    expect(ids).toEqual(["t1", "r1", "t2", "i1"]);
  });

  it("finds blocks by id in nested tree", () => {
    const found = findBlockById(sampleBlocks, "t2");
    expect(found?.block.type).toBe("text");
    expect(found?.path).toEqual([1, 0, 0]);
  });

  it("updates block by id anywhere in tree", () => {
    const next = updateBlockById(sampleBlocks, "t2", { markdown: "Updated" });
    const found = findBlockById(next, "t2");
    expect(found?.block.type).toBe("text");
    if (found?.block.type === "text") {
      expect(found.block.markdown).toBe("Updated");
    }
  });

  it("removes block by id anywhere in tree", () => {
    const next = removeBlockById(sampleBlocks, "t2");
    expect(findBlockById(next, "t2")).toBeNull();
    expect(findBlockById(next, "r1")).not.toBeNull();
  });

  it("resolves container grid templates for 2×2 with weights", () => {
    const container: ExperiencePageBlock = {
      id: "c1",
      type: "container",
      rows: 2,
      cols: 2,
      gap: "md",
      columnWeights: [2, 1],
      rowWeights: [1, 2],
      cells: [
        [[{ id: "a", type: "text", markdown: "A" }], []],
        [[], [{ id: "b", type: "text", markdown: "B" }]],
      ],
    };
    const resolved = resolveContainerLayout(container, "horizontal");
    expect(resolved.rows).toBe(2);
    expect(resolved.cols).toBe(2);
    expect(resolved.colTemplate).toBe("2fr 1fr");
    expect(resolved.rowTemplate).toBe("1fr 2fr");
    expect("wrapperClass" in resolved).toBe(false);
    expect(getGridTemplate([2, 1], 2)).toBe("2fr 1fr");
  });

  it("containerGridProps sets inline grid templates for multi-cell grids", () => {
    const container: ExperiencePageBlock = {
      id: "c1",
      type: "container",
      rows: 2,
      cols: 2,
      gap: "md",
      cells: [[[], []], [[], []]],
    };
    if (container.type !== "container") throw new Error("expected container");
    const props = containerGridProps(container, "horizontal");
    expect(props["data-layout"]).toBe("horizontal");
    expect(props.style.gridTemplateColumns).toBe("1fr 1fr");
    expect(props.style.gridTemplateRows).toBe("1fr 1fr");
    expect(props.style["--portal-col-template"]).toBe("1fr 1fr");
    expect(props.style["--portal-row-template"]).toBe("1fr 1fr");
  });

  it("containerGridProps uses single column for stacked layout", () => {
    const container: ExperiencePageBlock = {
      id: "c1",
      type: "container",
      rows: 1,
      cols: 2,
      gap: "md",
      cells: [[[], []]],
    };
    if (container.type !== "container") throw new Error("expected container");
    const props = containerGridProps(container, "stacked");
    expect(props["data-layout"]).toBe("stacked");
    expect(props.style.gridTemplateColumns).toBe("1fr");
    expect(props.style.gridTemplateRows).toBe("auto");
  });

  it("getLeaf align helpers map horizontal and vertical alignment", () => {
    expect(getLeafHorizontalJustifyClass("center")).toBe("justify-center");
    expect(getLeafVerticalJustifyClass("bottom")).toBe("justify-end");
  });

  it("containerGridProps applies weighted templates for 1×2 horizontal", () => {
    const container: ExperiencePageBlock = {
      id: "c1",
      type: "container",
      rows: 1,
      cols: 2,
      gap: "md",
      columnWeights: [2, 1],
      cells: [[[], []]],
    };
    if (container.type !== "container") throw new Error("expected container");
    const props = containerGridProps(container, "horizontal");
    expect(props.style.gridTemplateColumns).toBe("2fr 1fr");
    expect(props.style.gridTemplateRows).toBe("1fr");
  });

  it("containerGridProps applies weighted row and column templates for 2×2", () => {
    const container: ExperiencePageBlock = {
      id: "c1",
      type: "container",
      rows: 2,
      cols: 2,
      gap: "md",
      columnWeights: [2, 1],
      rowWeights: [1, 2],
      cells: [[[], []], [[], []]],
    };
    if (container.type !== "container") throw new Error("expected container");
    const props = containerGridProps(container, "horizontal");
    expect(props.style.gridTemplateColumns).toBe("2fr 1fr");
    expect(props.style.gridTemplateRows).toBe("1fr 2fr");
  });

  it("containerGridProps uses auto row tracks in design mode", () => {
    const container: ExperiencePageBlock = {
      id: "c1",
      type: "container",
      rows: 1,
      cols: 2,
      gap: "md",
      cells: [[[], []]],
    };
    if (container.type !== "container") throw new Error("expected container");
    const props = containerGridProps(container, "horizontal", { contentSizedRows: true });
    expect(props.style.gridTemplateRows).toBe("auto");
    expect(props.className).toContain("items-stretch");
  });

  it("walks container cells with row/col/block path segments", () => {
    const blocks: ExperiencePageBlock[] = [
      {
        id: "c1",
        type: "container",
        rows: 1,
        cols: 2,
        gap: "md",
        cells: [
          [
            [{ id: "t1", type: "text", markdown: "Left" }],
            [{ id: "t2", type: "text", markdown: "Right" }],
          ],
        ],
      },
    ];
    const ids: string[] = [];
    walkBlocks(blocks, (block) => ids.push(block.id));
    expect(ids).toEqual(["c1", "t1", "t2"]);
    expect(findBlockById(blocks, "t2")?.path).toEqual([0, 0, 1, 0]);
  });

  it("normalizePageBlocks migrates legacy row to container", () => {
    const row: ExperiencePageBlock = {
      id: "r1",
      type: "row",
      preset: "equal-2",
      gap: "md",
      columns: [
        [{ id: "t1", type: "text", markdown: "Col 1" }],
        [{ id: "t2", type: "text", markdown: "Col 2" }],
      ],
    };
    const migrated = migrateRowToContainer(row as Extract<ExperiencePageBlock, { type: "row" }>);
    expect(migrated.type).toBe("container");
    expect(migrated.rows).toBe(1);
    expect(migrated.cols).toBe(2);
    expect(migrated.cells[0]?.[0]?.[0]?.id).toBe("t1");

    const normalized = normalizePageBlocks([row]);
    expect(normalized[0]?.type).toBe("container");
  });
});
