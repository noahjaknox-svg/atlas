import { describe, expect, it } from "vitest";
import { CLUB_ECONOMICS_VIEWS } from "@/lib/experience-block-enums";
import { CLUB_VARIABLE_KEYS } from "@/lib/club-variables";
import { createEmptyBlock } from "@/lib/page-blocks-utils";
import { pageBlockSchema } from "@/lib/experience-section-schema";
import { PORTAL_PAGE_CODE_AI_INSTRUCTIONS } from "@/lib/portal-page-code-ai-instructions";
import { PALETTE_ITEMS, blockFromPaletteItem } from "@/components/internal/portal-designer/portal-designer-block-palette";
import { DESIGNER_BLOCK_TYPES } from "@/components/internal/portal-designer/portal-designer-types";

describe("club economics block can be authored without custom tooling", () => {
  it("is in the block palette and the add / convert list", () => {
    expect(PALETTE_ITEMS.some((p) => p.id.endsWith("clubEconomics"))).toBe(true);
    expect(DESIGNER_BLOCK_TYPES.some((t) => t.type === "clubEconomics")).toBe(true);
  });

  it("a block added from the palette inherits the page layout and validates", () => {
    const item = PALETTE_ITEMS.find((p) => p.id.endsWith("clubEconomics"))!;
    const block = blockFromPaletteItem(item.item);
    expect(block.type).toBe("clubEconomics");
    expect((block as { blockLayout?: unknown }).blockLayout).toBeUndefined();
    expect(pageBlockSchema.safeParse(block).success).toBe(true);
    expect(createEmptyBlock("clubEconomics")).toMatchObject({ view: "program-stats" });
  });

  it("the AI Page Code instructions describe the block, every view and the club placeholders", () => {
    expect(PORTAL_PAGE_CODE_AI_INSTRUCTIONS).toContain('"type": "clubEconomics"');
    for (const view of CLUB_ECONOMICS_VIEWS) expect(PORTAL_PAGE_CODE_AI_INSTRUCTIONS, view).toContain(view);
    for (const key of CLUB_VARIABLE_KEYS) expect(PORTAL_PAGE_CODE_AI_INSTRUCTIONS, key).toContain(`{{${key}}}`);
  });
});
