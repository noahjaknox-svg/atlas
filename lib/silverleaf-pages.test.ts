import { describe, expect, it } from "vitest";
import { pageBlockSchema } from "./experience-section-schema";
import { CLUB_PRISMJET_PAGE_SLUG } from "./club-client-view";
import { CLUB_VARIABLE_KEYS } from "./club-variables";
import { SILVERLEAF_PAGE_SLUGS, silverleafMasterTemplates } from "./silverleaf-pages";

const USAGE_TYPE = "4d229f26-d80f-4ab9-bb8e-ee249488529e";
const templates = silverleafMasterTemplates(USAGE_TYPE);

function allText(blocks: unknown): string {
  return JSON.stringify(blocks);
}

describe("silverleaf pages", () => {
  it("builds ten pages in members → owner → PrismJet order, PrismJet last", () => {
    expect(templates).toHaveLength(10);
    expect(templates[templates.length - 1]!.pageSlug).toBe(CLUB_PRISMJET_PAGE_SLUG);
    expect(new Set(SILVERLEAF_PAGE_SLUGS).size).toBe(10);
    const orders = templates.map((t) => t.sortOrder);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it("applies only to the Silverleaf usage type", () => {
    for (const t of templates) expect(t.usageTypeIds).toEqual([USAGE_TYPE]);
  });

  it("is hidden by default so other usage types never show these pages", () => {
    for (const t of templates) expect(t.visible).toBe(false);
  });

  it("every block validates against the designer schema", () => {
    for (const t of templates) {
      for (const block of t.contentBlocks!.pageBlocks!) {
        const res = pageBlockSchema.safeParse(block);
        expect(res.success, `${t.pageSlug}: ${res.success ? "" : res.error.message}`).toBe(true);
      }
    }
  });

  it("uses only known club placeholders", () => {
    const known = new Set<string>(CLUB_VARIABLE_KEYS);
    const used = new Set(allText(templates).match(/\{\{(club\w+)\}\}/g)?.map((m) => m.slice(2, -2)));
    for (const key of used) expect(known.has(key), key).toBe(true);
  });

  it("never describes the initiation fee as a deposit, contribution or redeemable except to deny it", () => {
    for (const t of templates) {
      const text = allText(t.contentBlocks).toLowerCase();
      for (const word of ["deposit", "capital contribution", "redeemable", "refundable", "investment"]) {
        if (!text.includes(word)) continue;
        // Allowed only in the explicit denial and the "not refundable" label.
        const ok =
          text.includes(`not a ${word}`) ||
          text.includes(`not ${word}`) ||
          text.includes(`not a deposit, not a capital contribution and not redeemable`) ||
          (word === "refundable" && text.includes("not refundable"));
        expect(ok, `${t.pageSlug} mentions "${word}"`).toBe(true);
      }
    }
  });

  it("keeps internal economics off the member and owner pages", () => {
    const shared = templates.filter((t) => t.pageSlug !== CLUB_PRISMJET_PAGE_SLUG);
    for (const t of shared) {
      const text = allText(t.contentBlocks).toLowerCase();
      for (const term of ["buy rate", "interim", "charter share", "sourcing comparison", "per-trip margin", "clubprismjet"]) {
        expect(text.includes(term), `${t.pageSlug} contains "${term}"`).toBe(false);
      }
      expect(text.includes('"view":"prismjet"')).toBe(false);
    }
  });
});
