/**
 * Convert a built-in ("legacy") portal page into editable blocks that render like it.
 *
 * The live portal renders a section with its built-in v2 layout until the section has
 * `contentBlocks.pageBlocks`; from then on it renders the blocks. The Portal Designer
 * edits blocks, so it converts built-in pages on load — and this converter is what keeps
 * that conversion faithful: each builder mirrors the matching v2 layout in
 * components/client/experience/v2/layouts/chapter-pages-v2.tsx / welcome-page-v2.tsx,
 * element for element, instead of keeping only the body text and gallery.
 *
 * Fields the v2 layouts never showed (e.g. maintenance gallery, sales contact details)
 * are left out on purpose, so converting doesn't change what clients see; they remain
 * in `contentBlocks` untouched.
 */
import type {
  BlockLayout,
  ExperienceContentBlocks,
  ExperienceGalleryItem,
  ExperiencePageBlock,
  ExperienceSectionSnapshot,
  GridDimension,
} from "./experience-content";

type Block = ExperiencePageBlock;
type LegacySection = Pick<
  ExperienceSectionSnapshot,
  "sectionType" | "title" | "bodyCopy" | "imageUrl" | "contentBlocks" | "signatoryName" | "signatoryTitle"
>;

export type LegacyConvertOptions = { newId?: () => string };

/** Built-in page types this converter reproduces. Others use the generic fallback. */
export const CONVERTIBLE_LEGACY_TYPES = [
  "welcome",
  "about_us",
  "aircraft_management",
  "aircraft_charter",
  "maintenance",
  "sales_acquisitions",
  "conformity_process",
] as const;

// Legacy chapters are left-aligned and span the content column.
const FULL_LEFT: BlockLayout = { widthDesktop: "full", widthMobile: "full", align: "left" };
const LEFT: BlockLayout = { align: "left" };

function mdEscapeCell(s: string) {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function bulletList(items: string[]) {
  return items.map((i) => `- ${i}`).join("\n");
}

function makeBuilders(newId: () => string) {
  const heading = (text: string, level: 1 | 2 | 3 = 1, layout: BlockLayout = LEFT): Block => ({
    id: newId(),
    type: "heading",
    level,
    text,
    blockLayout: layout,
  });
  const text = (markdown: string, layout: BlockLayout = LEFT): Block => ({
    id: newId(),
    type: "text",
    markdown,
    blockLayout: layout,
  });
  const quote = (t: string, attribution?: string): Block => ({
    id: newId(),
    type: "quote",
    text: t,
    ...(attribution ? { attribution } : {}),
    blockLayout: LEFT,
  });
  const gallery = (items: ExperienceGalleryItem[], layout: "single" | "leadershipRow"): Block => ({
    id: newId(),
    type: "gallery",
    layout,
    items,
    blockLayout: { widthDesktop: "full", widthMobile: "full" },
  });

  /** Grid of cells, `cols` wide, wrapping into rows (a container holds at most 4×4). */
  function grid(
    cells: Block[][],
    cols: number,
    opts: { card?: boolean; columnWeights?: number[]; layout?: BlockLayout } = {}
  ): Block[] {
    const c = Math.max(1, Math.min(4, cols)) as GridDimension;
    const out: Block[] = [];
    for (let start = 0; start < cells.length; start += c * 4) {
      const chunk = cells.slice(start, start + c * 4);
      const r = Math.max(1, Math.ceil(chunk.length / c)) as GridDimension;
      const rows: Block[][][] = Array.from({ length: r }, (_, ri) =>
        Array.from({ length: c }, (_, ci) => chunk[ri * c + ci] ?? [])
      );
      out.push({
        id: newId(),
        type: "container",
        rows: r,
        cols: c,
        gap: "md",
        columnWeights: opts.columnWeights ?? Array.from({ length: c }, () => 1),
        rowWeights: Array.from({ length: r }, () => 1),
        cellAlign: "start",
        ...(opts.card ? { cellCardStyle: true } : {}),
        blockLayout: opts.layout ?? { widthDesktop: "full", widthMobile: "full" },
        cells: rows,
      });
    }
    return out;
  }

  /** Two-column chapter body (stacks on mobile), like ChapterGrid2Col. */
  const twoCol = (left: Block[], right: Block[], columnWeights = [1, 1]): Block[] =>
    right.length === 0 ? left : grid([left, right], 2, { columnWeights, layout: FULL_LEFT });

  /** A single card (glass panel) around some blocks. */
  const card = (children: Block[]): Block[] => grid([children], 1, { card: true });

  const numberedCard = (i: number, title: string, body?: string): Block[] => [
    text(`\`${String(i + 1).padStart(2, "0")}\``),
    heading(title, 3),
    ...(body ? [text(body)] : []),
  ];

  const stat = (value: string, label: string): Block => ({
    id: newId(),
    type: "stat",
    value,
    label,
    countUp: true,
    blockLayout: { widthDesktop: "full", widthMobile: "full" },
  });

  return { newId, heading, text, quote, gallery, grid, twoCol, card, numberedCard, stat };
}

type Builders = ReturnType<typeof makeBuilders>;

const BUILDERS: Record<
  (typeof CONVERTIBLE_LEGACY_TYPES)[number],
  (s: LegacySection, cb: ExperienceContentBlocks, b: Builders) => Block[]
> = {
  // welcome-page-v2.tsx: title, "Prepared for" line, letter card with signature.
  welcome(s, _cb, b) {
    // The letter preserved line breaks (whitespace-pre-wrap); markdown needs hard breaks.
    const letter = (s.bodyCopy ?? "").trim().replace(/([^\n])\n(?!\n)/g, "$1  \n");
    // The default letter already signs off with the signatory — don't sign it twice.
    const signed =
      !!s.signatoryName && (s.bodyCopy ?? "").includes(s.signatoryName);
    const signature =
      s.signatoryName && !signed
        ? [
            b.text(
              `Sincerely,  \n**${s.signatoryName}**${s.signatoryTitle ? `  \n${s.signatoryTitle}` : ""}`
            ),
          ]
        : [];
    return [
      b.heading(s.title, 1, FULL_LEFT),
      b.text("Prepared for **{{contactName}}**  \n{{aircraftName}}", FULL_LEFT),
      ...b.card([...(letter ? [b.text(letter)] : []), ...signature]),
    ];
  },

  // AboutUsPageV2: body, 3 pillar cards, "100+" stat | leadership photos.
  about_us(s, cb, b) {
    const pillars = cb.pillars ?? [];
    const left = [
      ...(s.bodyCopy?.trim() ? [b.text(s.bodyCopy.trim())] : []),
      ...(pillars.length
        ? b.grid(
            pillars.map((p, i) => b.numberedCard(i, p.title, p.body)),
            Math.min(3, pillars.length),
            { card: true }
          )
        : []),
      // The built-in page always showed this (AboutStatRow is hardcoded).
      b.stat("100+", "Years combined experience"),
    ];
    const photos = (cb.gallery ?? []).slice(0, 4);
    const right = photos.length ? [b.gallery(photos, "leadershipRow")] : [];
    return [b.heading(s.title, 1, FULL_LEFT), ...b.twoCol(left, right)];
  },

  // AircraftManagementPageV2: body, 2-up pillar cards, callout | gallery.
  aircraft_management(s, cb, b) {
    const pillars = cb.pillars ?? [];
    const left = [
      ...(s.bodyCopy?.trim() ? [b.text(s.bodyCopy.trim())] : []),
      ...(pillars.length
        ? b.grid(
            pillars.map((p, i) => b.numberedCard(i, p.title, p.body)),
            Math.min(2, pillars.length),
            { card: true }
          )
        : []),
      ...(cb.callout?.value
        ? b.card([b.text(`${cb.callout.label ? `**${cb.callout.label.toUpperCase()}**\n\n` : ""}${cb.callout.value}`)])
        : []),
    ];
    const right = cb.gallery?.length ? [b.gallery(cb.gallery, "single")] : [];
    return [b.heading(s.title, 1, FULL_LEFT), ...b.twoCol(left, right)];
  },

  // AircraftCharterPageV2: quote, body, bullets | block-vs-flight animation, gallery.
  aircraft_charter(s, cb, b) {
    const left = [
      ...(cb.quote?.text ? [b.quote(cb.quote.text, cb.quote.attribution)] : []),
      ...(s.bodyCopy?.trim() ? [b.text(s.bodyCopy.trim())] : []),
      ...(cb.introBullets?.length ? [b.text(bulletList(cb.introBullets))] : []),
    ];
    const right: Block[] = [
      { id: b.newId(), type: "blockVsFlight", blockLayout: { widthDesktop: "full", widthMobile: "full" } },
      ...(cb.gallery?.length ? [b.gallery(cb.gallery, "single")] : []),
    ];
    return [b.heading(s.title, 1, FULL_LEFT), ...b.twoCol(left, right)];
  },

  // MaintenancePageV2: body + commitment quote, then the cost comparison table.
  maintenance(s, cb, b) {
    const rows = cb.comparisonRows ?? [];
    const table = rows.length
      ? [
          b.text(
            [
              "| Labor cost examples | Other | PrismJet |",
              "| --- | ---: | ---: |",
              ...rows.map(
                (r) =>
                  `| ${mdEscapeCell(r.item)} | ${mdEscapeCell(r.otherCost)} | **${mdEscapeCell(r.prismjetNote)}** |`
              ),
            ].join("\n"),
            FULL_LEFT
          ),
        ]
      : [];
    return [
      b.heading(s.title, 1, FULL_LEFT),
      ...(s.bodyCopy?.trim() ? [b.text(s.bodyCopy.trim())] : []),
      ...(cb.callout?.value ? [b.quote(cb.callout.value)] : []),
      ...table,
    ];
  },

  // SalesAcquisitionsPageV2: body (or quote), service tile cards | gallery.
  sales_acquisitions(s, cb, b) {
    const tiles = cb.serviceTiles ?? [];
    const hasBody = !!s.bodyCopy?.trim();
    const left = [
      ...(hasBody ? [b.text(s.bodyCopy!.trim())] : []),
      ...(!hasBody && cb.quote?.text ? [b.quote(cb.quote.text, cb.quote.attribution)] : []),
      ...(tiles.length
        ? b.grid(
            tiles.map((t) => [b.heading(t.title, 3), ...(t.description ? [b.text(t.description)] : [])]),
            Math.min(3, tiles.length),
            { card: true }
          )
        : []),
    ];
    const right = cb.gallery?.length ? [b.gallery(cb.gallery, "single")] : [];
    return [b.heading(s.title, 1, FULL_LEFT), ...b.twoCol(left, right, [62, 38])];
  },

  // ConformityPageV2: body; bullets + checklist card | timeline card.
  conformity_process(s, cb, b) {
    const left = [
      ...(cb.introBullets?.length ? [b.text(bulletList(cb.introBullets))] : []),
      ...(cb.checklist?.length
        ? b.card([b.text(`**CHECKLIST**\n\n${bulletList(cb.checklist.map((c) => c.label))}`)])
        : []),
    ];
    const phases = cb.timeline ?? [];
    const right = phases.length
      ? b.card([
          b.text("**TIMELINE**"),
          ...b.grid(
            phases.map((p, i) => b.numberedCard(i, p.phase, p.window)),
            Math.min(2, phases.length)
          ),
        ])
      : [];
    return [
      b.heading(s.title, 1, FULL_LEFT),
      ...(s.bodyCopy?.trim() ? [b.text(s.bodyCopy.trim(), FULL_LEFT)] : []),
      ...b.twoCol(left, right),
    ];
  },
};

/** Generic fallback: body text, image and gallery (for custom and unknown page types). */
function genericBlocks(s: LegacySection, b: Builders): Block[] {
  const blocks: Block[] = [];
  if (s.bodyCopy?.trim()) blocks.push(b.text(s.bodyCopy));
  if (s.imageUrl?.trim()) {
    blocks.push({ id: b.newId(), type: "image", url: s.imageUrl, caption: "" });
  }
  const gallery = s.contentBlocks?.gallery ?? [];
  if (gallery.length > 0) {
    blocks.push({ id: b.newId(), type: "gallery", items: gallery, layout: "editorialPair" });
  }
  return blocks;
}

/** Pro forma renders its calculator regardless of blocks; the disclaimer is footer text. */
const NOT_BLOCK_PAGES = new Set(["pro_forma", "disclaimer"]);

export function convertLegacySectionToBlocks(
  section: LegacySection,
  options: LegacyConvertOptions = {}
): Block[] {
  if (NOT_BLOCK_PAGES.has(section.sectionType)) return [];
  const newId = options.newId ?? defaultId;
  const b = makeBuilders(newId);
  const builder = BUILDERS[section.sectionType as (typeof CONVERTIBLE_LEGACY_TYPES)[number]];
  return builder ? builder(section, section.contentBlocks ?? {}, b) : genericBlocks(section, b);
}

function defaultId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
