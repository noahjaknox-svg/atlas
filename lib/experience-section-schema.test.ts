import { describe, expect, it } from "vitest";
import { pageBlockSchema, proposalSectionPatchSchema } from "./experience-section-schema";

const pageRecordSchema = proposalSectionPatchSchema.omit({ id: true });

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

  it("rejects a block missing a required field (cta without url)", () => {
    const result = pageBlockSchema.safeParse({ id: "1", type: "cta", label: "Learn more" });
    expect(result.success).toBe(false);
  });

  it("rejects a block with an unknown type literal", () => {
    const result = pageBlockSchema.safeParse({ id: "1", type: "carousel", items: [] });
    expect(result.success).toBe(false);
  });
});

describe("Page Code full page record (proposalSectionPatchSchema.omit({ id: true }))", () => {
  it("accepts a full page record with nested row/container blocks", () => {
    const result = pageRecordSchema.safeParse({
      title: "Why PrismJet",
      visible: true,
      sortOrder: 0,
      contentBlocks: {
        pageBlocks: [
          { id: "1", type: "heading", level: 1, text: "Why owners choose PrismJet" },
          {
            id: "2",
            type: "row",
            preset: "equal-2",
            columns: [
              [{ id: "3", type: "text", markdown: "Left column copy." }],
              [{ id: "4", type: "image", url: "https://example.com/a.jpg" }],
            ],
          },
          {
            id: "5",
            type: "container",
            rows: 1,
            cols: 2,
            cells: [[[{ id: "6", type: "quote", text: "Great service." }], []]],
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it("drops sectionType and id — they aren't part of the schema", () => {
    const result = pageRecordSchema.safeParse({
      sectionType: "about_us",
      title: "About",
    });
    expect(result.success).toBe(true);
    expect(result.success && "sectionType" in result.data).toBe(false);
  });
});
