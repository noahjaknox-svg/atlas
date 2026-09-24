import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CONVERTIBLE_LEGACY_TYPES,
  convertLegacySectionToBlocks,
} from "@/lib/legacy-page-to-blocks";
import { EXPERIENCE_DEFAULT_SECTIONS } from "@/lib/experience-defaults";
import { pageBlockSchema } from "@/lib/experience-section-schema";
import { htmlHasAnimation, synthesizePageBlocksFromLegacy } from "@/lib/page-blocks-utils";
import type { ExperiencePageBlock } from "@/lib/experience-content";

let n = 0;
const newId = () => `b${++n}`;

function flatten(blocks: ExperiencePageBlock[]): ExperiencePageBlock[] {
  return blocks.flatMap((b) =>
    b.type === "container"
      ? [b, ...b.cells.flat(2).flatMap((c) => flatten([c]))]
      : b.type === "row"
        ? [b, ...b.columns.flat().flatMap((c) => flatten([c]))]
        : [b]
  );
}

const allText = (blocks: ExperiencePageBlock[]) =>
  flatten(blocks)
    .map((b) =>
      b.type === "text"
        ? b.markdown
        : b.type === "heading" || b.type === "quote"
          ? b.text
          : b.type === "stat"
            ? `${b.value} ${b.label}`
            : ""
    )
    .join("\n");

const section = (type: string) => {
  const s = EXPERIENCE_DEFAULT_SECTIONS.find((x) => x.sectionType === type)!;
  return { ...s, visible: true, sortOrder: 1 };
};

describe("convertLegacySectionToBlocks", () => {
  it.each(CONVERTIBLE_LEGACY_TYPES)(
    "%s: default page converts to blocks that pass the save-time schema",
    (type) => {
      const blocks = convertLegacySectionToBlocks(section(type), { newId });
      expect(blocks.length).toBeGreaterThan(0);
      // Saving goes through this exact schema — a failure here would block every save.
      expect(() => z.array(pageBlockSchema).parse(blocks)).not.toThrow();
      // Starts with the page title, like the built-in layouts.
      expect(blocks[0]).toMatchObject({ type: "heading", level: 1, text: section(type).title });
      // Block ids are unique (the renderer/designer key on them).
      const ids = flatten(blocks).map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  );

  it("about_us keeps body, every pillar, the 100+ stat and the leadership photos", () => {
    const s = section("about_us");
    const blocks = convertLegacySectionToBlocks(s, { newId });
    const text = allText(blocks);
    expect(text).toContain(s.bodyCopy!.split("\n")[0]!.slice(0, 40));
    for (const p of s.contentBlocks!.pillars!) {
      expect(text).toContain(p.title);
      expect(text).toContain(p.body);
    }
    expect(flatten(blocks).some((b) => b.type === "stat" && b.value === "100+")).toBe(true);
    const gallery = flatten(blocks).find((b) => b.type === "gallery");
    expect(gallery).toMatchObject({ layout: "leadershipRow" });
    expect(gallery && gallery.type === "gallery" && gallery.items).toHaveLength(4);
    // Pillars render as cards, like the built-in glass panels.
    expect(flatten(blocks).some((b) => b.type === "container" && b.cellCardStyle)).toBe(true);
  });

  it("aircraft_charter includes the block-vs-flight animation block and every bullet", () => {
    const s = section("aircraft_charter");
    const blocks = convertLegacySectionToBlocks(s, { newId });
    expect(flatten(blocks).some((b) => b.type === "blockVsFlight")).toBe(true);
    const text = allText(blocks);
    for (const bullet of s.contentBlocks!.introBullets!) expect(text).toContain(bullet);
    expect(text).toContain(s.contentBlocks!.quote!.text);
  });

  it("maintenance renders the comparison rows as a markdown table", () => {
    const s = section("maintenance");
    const text = allText(convertLegacySectionToBlocks(s, { newId }));
    expect(text).toContain("| Labor cost examples | Other | PrismJet |");
    for (const r of s.contentBlocks!.comparisonRows!) expect(text).toContain(r.item);
    expect(text).toContain(s.contentBlocks!.callout!.value);
  });

  it("conformity_process keeps bullets, checklist and every timeline phase", () => {
    const s = section("conformity_process");
    const text = allText(convertLegacySectionToBlocks(s, { newId }));
    for (const b of s.contentBlocks!.introBullets!) expect(text).toContain(b);
    for (const c of s.contentBlocks!.checklist!) expect(text).toContain(c.label);
    for (const p of s.contentBlocks!.timeline!) {
      expect(text).toContain(p.phase);
      expect(text).toContain(p.window);
    }
  });

  it("sales_acquisitions keeps every service tile", () => {
    const s = section("sales_acquisitions");
    const text = allText(convertLegacySectionToBlocks(s, { newId }));
    for (const t of s.contentBlocks!.serviceTiles!) {
      expect(text).toContain(t.title);
      if (t.description) expect(text).toContain(t.description);
    }
  });

  it("welcome doesn't sign the letter twice when it already signs off", () => {
    const s = section("welcome");
    expect(s.bodyCopy).toContain(s.signatoryName!);
    const text = allText(convertLegacySectionToBlocks(s, { newId }));
    expect(text.split(s.signatoryName!).length - 1).toBe(1);
    // …but adds the signature when the letter doesn't include it.
    const unsigned = { ...s, bodyCopy: "Dear {contactName},\nThank you." };
    const text2 = allText(convertLegacySectionToBlocks(unsigned, { newId }));
    expect(text2).toContain(`**${s.signatoryName}**`);
    // Legacy line breaks are preserved as markdown hard breaks.
    expect(text2).toContain("Dear {contactName},  \nThank you.");
  });

  it("leaves pro forma and the disclaimer alone", () => {
    expect(convertLegacySectionToBlocks(section("pro_forma"), { newId })).toEqual([]);
    expect(convertLegacySectionToBlocks(section("disclaimer"), { newId })).toEqual([]);
  });

  it("synthesizePageBlocksFromLegacy uses the faithful converter when the type is known", () => {
    const s = section("about_us");
    expect(synthesizePageBlocksFromLegacy(s).some((b) => b.type === "container")).toBe(true);
    // Without a type it keeps the old generic behavior.
    const generic = synthesizePageBlocksFromLegacy({
      bodyCopy: "Hello",
      imageUrl: null,
      contentBlocks: null,
    });
    expect(generic.map((b) => b.type)).toEqual(["text"]);
  });
});

describe("htmlHasAnimation", () => {
  it("flags CSS motion and ignores plain HTML", () => {
    expect(htmlHasAnimation("<style>@keyframes spin{}</style>")).toBe(true);
    expect(htmlHasAnimation('<div style="animation: spin 1s">x</div>')).toBe(true);
    expect(htmlHasAnimation('<div style="transition: opacity .3s">x</div>')).toBe(true);
    expect(htmlHasAnimation("<p>Transition to management is easy</p>")).toBe(false);
    expect(htmlHasAnimation("")).toBe(false);
  });
});

describe("parseStatValue", () => {
  it("splits prefix, animatable number and suffix", async () => {
    const { parseStatValue } = await import("@/components/client/experience/stat-block");
    expect(parseStatValue("100+")).toEqual({ prefix: "", number: 100, decimals: 0, suffix: "+" });
    expect(parseStatValue("$2.4M")).toEqual({ prefix: "$", number: 2.4, decimals: 1, suffix: "M" });
    expect(parseStatValue("1,250 hours")).toMatchObject({ number: 1250, suffix: " hours" });
    // Nothing numeric: rendered as-is, never animated.
    expect(parseStatValue("Industry first")).toMatchObject({ number: null, suffix: "Industry first" });
  });
});
