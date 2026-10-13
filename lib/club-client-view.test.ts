import { describe, expect, it } from "vitest";
import { buildClubSnapshot } from "@/lib/club-model-store";
import { CLUB_DEFAULTS } from "@/lib/club-proforma";
import {
  CLUB_PRISMJET_PAGE_SLUG,
  buildClubClientView,
  isPrismjetPageVisible,
  sanitizeSnapshotForClient,
} from "@/lib/club-client-view";

const clubModel = buildClubSnapshot(CLUB_DEFAULTS);
const page = (visible: boolean) => ({ pageSlug: CLUB_PRISMJET_PAGE_SLUG, visible });

describe("buildClubClientView", () => {
  it("returns null for proposals without a club model", () => {
    expect(buildClubClientView({ clubModel: undefined, sections: [] })).toBeNull();
  });

  it("omits every PrismJet figure when the PrismJet page is hidden", () => {
    const view = buildClubClientView({ clubModel, sections: [page(false)] })!;
    expect(view.prismjet).toBeUndefined();
    const json = JSON.stringify(view);
    expect(json).not.toContain('"interimLift"');
    expect(json).not.toContain("margins");
    expect(json).not.toContain('"prismjet"');
    expect(view.inputs.interimLiftRates).toEqual([]);
    // The owner view still carries the operating share as a cost line.
    expect(view.owner.structures.state.operatingShare).toBeGreaterThan(0);
  });

  it("omits PrismJet figures when the page doesn't exist at all", () => {
    expect(buildClubClientView({ clubModel, sections: [] })!.prismjet).toBeUndefined();
  });

  it("includes the PrismJet view only when the page is visible", () => {
    const view = buildClubClientView({ clubModel, sections: [page(true)] })!;
    expect(view.prismjet?.structures).toHaveLength(3);
    expect(view.prismjet?.interimLift.length).toBeGreaterThan(0);
  });

  it("detects page visibility by slug", () => {
    expect(isPrismjetPageVisible([{ pageSlug: "other", visible: true }])).toBe(false);
    expect(isPrismjetPageVisible([page(true)])).toBe(true);
    expect(isPrismjetPageVisible([page(false)])).toBe(false);
  });
});

describe("sanitizeSnapshotForClient", () => {
  it("is the identity for proposals without a club model", () => {
    const payload = { clubModel: undefined, sections: [], other: 1 };
    expect(sanitizeSnapshotForClient(payload)).toBe(payload);
  });

  it("strips PrismJet data from the whole payload while the page is hidden", () => {
    const out = sanitizeSnapshotForClient({ clubModel, sections: [page(false)] });
    const json = JSON.stringify(out);
    expect(out.clubModel?.result.prismjet).toBeUndefined();
    expect(json).not.toContain('"interimLift"');
    expect(json).not.toContain("annualCash");
    expect(json).not.toContain("operatingShareAnnual");
    expect(out.clubModel?.result.owner.structures.owner).toHaveLength(3);
  });

  it("keeps PrismJet data when the page is visible", () => {
    const out = sanitizeSnapshotForClient({ clubModel, sections: [page(true)] });
    expect(out.clubModel?.result.prismjet?.structures).toHaveLength(3);
  });

  it("blanks the hidden PrismJet page's own content, not just its numbers", () => {
    const secret = "Charter share. 70% to the club and 30% to PrismJet";
    const sections = [
      { pageSlug: CLUB_PRISMJET_PAGE_SLUG, visible: false, bodyCopy: secret, contentBlocks: { pageBlocks: [{ markdown: secret }] } },
      { pageSlug: "silverleaf-welcome", visible: true, bodyCopy: "keep me", contentBlocks: { pageBlocks: [{ markdown: "keep me" }] } },
    ];
    const out = sanitizeSnapshotForClient({ clubModel, sections });
    const json = JSON.stringify(out.sections);
    expect(json).not.toContain("30% to PrismJet");
    expect(json).toContain("keep me");
    expect(out.sections).toHaveLength(2);
  });

  it("keeps the PrismJet page content when the page is visible", () => {
    const sections = [{ pageSlug: CLUB_PRISMJET_PAGE_SLUG, visible: true, bodyCopy: "visible copy", contentBlocks: null }];
    expect(sanitizeSnapshotForClient({ clubModel, sections }).sections[0]!.bodyCopy).toBe("visible copy");
  });

  it("does not mutate the stored snapshot", () => {
    const sections = [page(false)];
    sanitizeSnapshotForClient({ clubModel, sections });
    expect(clubModel.result.prismjet).toBeDefined();
  });
});
