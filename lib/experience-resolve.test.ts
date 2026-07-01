import { describe, expect, it } from "vitest";
import {
  resolvePublishedSections,
  resolveFrozenSections,
  isFrozenSnapshot,
} from "./experience-resolve";
import type { ExperienceMasterTemplate } from "./experience-master";
import type { ProposalSnapshotPayload } from "./snapshot";

const master: ExperienceMasterTemplate[] = [
  {
    sectionType: "about_us",
    title: "Master About Title",
    bodyCopy: "Master about body",
    visible: true,
    sortOrder: 2,
    imageUrl: "/master-hero.jpg",
    videoUrl: null,
    posterUrl: null,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "mission_vision_values",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: {
      gallery: [{ url: "/master-gallery.jpg", caption: "Master" }],
    },
  },
];

describe("resolvePublishedSections", () => {
  it("uses proposal working copy as primary source at publish", () => {
    const resolved = resolvePublishedSections(
      [
        {
          sectionType: "about_us",
          title: "Proposal About",
          bodyCopy: "Proposal body",
          visible: true,
          sortOrder: 2,
          imageUrl: "/proposal-hero.jpg",
          videoUrl: null,
          posterUrl: null,
          calloutMetricLabel: null,
          calloutMetricValue: null,
          layoutVariant: "mission_vision_values",
          signatoryName: null,
          signatoryTitle: null,
          contentBlocks: {
            gallery: [{ url: "/proposal-gallery.jpg", caption: "Proposal" }],
          },
        },
      ],
      master
    );

    const about = resolved.find((s) => s.sectionType === "about_us");
    expect(about?.title).toBe("Proposal About");
    expect(about?.imageUrl).toBe("/proposal-hero.jpg");
    expect(about?.contentBlocks?.gallery?.[0]?.url).toBe("/proposal-gallery.jpg");
  });

  it("falls back to master when proposal section is missing", () => {
    const resolved = resolvePublishedSections([], master);
    const about = resolved.find((s) => s.sectionType === "about_us");
    expect(about?.title).toBe("Master About Title");
  });
});

describe("frozen snapshots", () => {
  it("renders published sections verbatim without master merge", () => {
    const payload = {
      renderSchemaVersion: 3,
      sections: [
        {
          sectionType: "about_us",
          title: "Frozen About",
          bodyCopy: "Frozen body",
          visible: true,
          sortOrder: 2,
          imageUrl: "/frozen.jpg",
          videoUrl: null,
          posterUrl: null,
          calloutMetricLabel: null,
          calloutMetricValue: null,
          layoutVariant: null,
          contentBlocks: null,
          signatoryName: null,
          signatoryTitle: null,
        },
      ],
    } as ProposalSnapshotPayload;

    expect(isFrozenSnapshot(payload)).toBe(true);
    const sections = resolveFrozenSections(payload);
    expect(sections[0]?.title).toBe("Frozen About");
    expect(sections[0]?.imageUrl).toBe("/frozen.jpg");
  });
});
