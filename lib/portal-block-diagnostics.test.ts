import { describe, expect, it } from "vitest";
import { collectBlockDiagnostics } from "./portal-block-diagnostics";
import type { ExperiencePageBlock } from "./experience-content";

describe("portal-block-diagnostics", () => {
  it("detects empty text and missing images", () => {
    const blocks: ExperiencePageBlock[] = [
      { id: "t1", type: "text", markdown: "" },
      { id: "i1", type: "image", url: "" },
    ];
    const diagnostics = collectBlockDiagnostics(blocks);
    expect(diagnostics.some((d) => d.kind === "empty_text")).toBe(true);
    expect(diagnostics.some((d) => d.kind === "missing_image")).toBe(true);
  });

  it("treats null image url as missing without throwing", () => {
    const blocks = [
      { id: "i1", type: "image", url: null },
    ] as unknown as ExperiencePageBlock[];
    const diagnostics = collectBlockDiagnostics(blocks);
    expect(diagnostics.some((d) => d.kind === "missing_image")).toBe(true);
  });

  it("detects empty row columns", () => {
    const blocks: ExperiencePageBlock[] = [
      {
        id: "r1",
        type: "row",
        preset: "equal-2",
        columns: [[{ id: "t1", type: "text", markdown: "Hi" }], []],
      },
    ];
    const diagnostics = collectBlockDiagnostics(blocks);
    expect(diagnostics.some((d) => d.kind === "empty_row_column")).toBe(true);
  });

  it("detects empty container cells with row/col labels", () => {
    const blocks: ExperiencePageBlock[] = [
      {
        id: "c1",
        type: "container",
        rows: 2,
        cols: 2,
        cells: [
          [[{ id: "t1", type: "text", markdown: "Hi" }], []],
          [[], []],
        ],
      },
    ];
    const diagnostics = collectBlockDiagnostics(blocks);
    expect(diagnostics.some((d) => d.message === "Cell R1C2 is empty")).toBe(true);
    expect(diagnostics.some((d) => d.message === "Cell R2C1 is empty")).toBe(true);
    expect(diagnostics.some((d) => d.message === "Cell R2C2 is empty")).toBe(true);
  });

  it("detects unresolved variables", () => {
    const blocks: ExperiencePageBlock[] = [
      { id: "t1", type: "text", markdown: "Hello {{contactName}}" },
    ];
    const diagnostics = collectBlockDiagnostics(blocks, { contactName: "" });
    expect(diagnostics.some((d) => d.kind === "unresolved_variable")).toBe(true);
  });
});
