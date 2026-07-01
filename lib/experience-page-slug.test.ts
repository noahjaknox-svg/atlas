import { describe, expect, it } from "vitest";
import {
  normalizePageSlug,
  resolveSectionByPageSlug,
  sectionNavSlug,
  validatePageSlug,
} from "./experience-page-slug";
import type { ExperienceSectionSnapshot } from "./experience-content";

const sections: ExperienceSectionSnapshot[] = [
  {
    sectionType: "welcome",
    title: "Welcome",
    bodyCopy: null,
    visible: true,
    sortOrder: 1,
    imageUrl: null,
    videoUrl: null,
    posterUrl: null,
    signatoryName: null,
    signatoryTitle: null,
    layoutVariant: null,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    contentBlocks: null,
  },
  {
    sectionType: "custom_page",
    pageSlug: "our-team",
    title: "Our Team",
    bodyCopy: null,
    visible: true,
    sortOrder: 5,
    imageUrl: null,
    videoUrl: null,
    posterUrl: null,
    signatoryName: null,
    signatoryTitle: null,
    layoutVariant: null,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    contentBlocks: { pageBlocks: [] },
  },
];

describe("experience-page-slug", () => {
  it("normalizes slugs", () => {
    expect(normalizePageSlug("  Our Team Page! ")).toBe("our-team-page");
  });

  it("rejects reserved slugs", () => {
    expect(validatePageSlug("welcome")).toMatch(/reserved/i);
  });

  it("resolves custom pages by pageSlug", () => {
    const found = resolveSectionByPageSlug(sections, "our-team");
    expect(found?.title).toBe("Our Team");
  });

  it("falls back to system slug map", () => {
    const found = resolveSectionByPageSlug(sections, "welcome");
    expect(found?.sectionType).toBe("welcome");
  });

  it("sectionNavSlug prefers pageSlug for custom pages", () => {
    expect(sectionNavSlug(sections[1]!)).toBe("our-team");
    expect(sectionNavSlug(sections[0]!)).toBe("welcome");
  });
});
