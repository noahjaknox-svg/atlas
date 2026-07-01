import { describe, expect, it } from "vitest";
import { pageBlockSchema } from "./experience-section-schema";

describe("experience-section-schema recursive pageBlocks", () => {
  it("validates nested row blocks", () => {
    const blocks = [
      {
        id: "r1",
        type: "row",
        preset: "equal-2",
        gap: "md",
        columns: [
          [{ id: "t1", type: "text", markdown: "Left" }],
          [
            { id: "q1", type: "quote", text: "Great service" },
            { id: "c1", type: "cta", label: "Contact", url: "https://example.com" },
          ],
        ],
      },
    ];

    const result = pageBlockSchema.array().safeParse(blocks);
    expect(result.success).toBe(true);
  });

  it("validates leaf blocks with blockLayout", () => {
    const blocks = [
      {
        id: "t1",
        type: "text",
        markdown: "Hello",
        blockLayout: { width: "narrow", align: "center", padding: "md" },
      },
    ];
    const result = pageBlockSchema.array().safeParse(blocks);
    expect(result.success).toBe(true);
  });

  it("validates container blocks with nested cells", () => {
    const blocks = [
      {
        id: "c1",
        type: "container",
        rows: 2,
        cols: 2,
        gap: "md",
        columnWeights: [1, 1],
        rowWeights: [1, 1],
        width: "full",
        cellAlign: "stretch",
        cells: [
          [[{ id: "t1", type: "text", markdown: "A" }], []],
          [[], [{ id: "t2", type: "text", markdown: "B" }]],
        ],
      },
    ];
    const result = pageBlockSchema.array().safeParse(blocks);
    expect(result.success).toBe(true);
  });
});
