import type {
  ExperienceContentBlocks,
  ExperienceGalleryItem,
  ExperiencePageBlock,
  ExperienceSectionSnapshot,
} from "./experience-content";
import {
  duplicateBlockById,
  equalWeights,
  findBlockById,
  insertBlockAt,
  removeBlockById,
  replaceBlockById,
  updateBlockById,
  type BlockPath,
  type RowColumnCount,
} from "./portal-block-layout";
import type { GridDimension } from "./experience-content";
import { convertLegacySectionToBlocks } from "./legacy-page-to-blocks";

export { duplicateBlockById, findBlockById, insertBlockAt, removeBlockById, replaceBlockById, updateBlockById };
export type { BlockPath };

function presetForColumnCount(count: RowColumnCount): "equal-2" | "equal-3" {
  return count >= 3 ? "equal-3" : "equal-2";
}

export function createBlockId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isEmptyPortalHtml(html: string): boolean {
  const trimmed = html.trim();
  return !trimmed || trimmed === "<!-- Custom HTML -->";
}

export function createEmptyContainer(
  rows: GridDimension = 1,
  cols: GridDimension = 1
): Extract<ExperiencePageBlock, { type: "container" }> {
  const r = Math.max(1, Math.min(4, rows)) as GridDimension;
  const c = Math.max(1, Math.min(4, cols)) as GridDimension;
  return {
    id: createBlockId(),
    type: "container",
    rows: r,
    cols: c,
    gap: "md",
    columnWeights: equalWeights(c),
    rowWeights: equalWeights(r),
    width: "full",
    cellAlign: "start",
    cells: Array.from({ length: r }, () => Array.from({ length: c }, () => [])),
  };
}

export function migrateRowToContainer(
  row: Extract<ExperiencePageBlock, { type: "row" }>
): Extract<ExperiencePageBlock, { type: "container" }> {
  const count = Math.max(1, row.columns.length);
  if (row.display === "rows") {
    const rows = Math.min(4, count) as GridDimension;
    return {
      id: row.id,
      type: "container",
      rows,
      cols: 1,
      gap: row.gap,
      columnWeights: [1],
      rowWeights: equalWeights(rows),
      width: "full",
      cellAlign: "start",
      cells: row.columns.slice(0, rows).map((col) => [col]),
    };
  }
  const cols = Math.min(4, count) as GridDimension;
  return {
    id: row.id,
    type: "container",
    rows: 1,
    cols,
    gap: row.gap,
    columnWeights: row.columnWeights ?? equalWeights(cols),
    rowWeights: [1],
    width: "full",
    cellAlign: "start",
    cells: [row.columns.slice(0, cols).map((col) => col)],
  };
}

function normalizeBlock(block: ExperiencePageBlock): ExperiencePageBlock {
  if (block.type === "row") {
    const container = migrateRowToContainer(block);
    return {
      ...container,
      cells: container.cells.map((row) =>
        row.map((cell) => cell.map((child) => normalizeBlock(child)))
      ),
    };
  }
  if (block.type === "container") {
    return {
      ...block,
      cells: block.cells.map((row) =>
        row.map((cell) => cell.map((child) => normalizeBlock(child)))
      ),
    };
  }
  return block;
}

export function normalizePageBlocks(blocks: ExperiencePageBlock[]): ExperiencePageBlock[] {
  return blocks.map((block) => normalizeBlock(block));
}

export function createEmptyRow(
  columnCount: RowColumnCount = 2
): Extract<ExperiencePageBlock, { type: "row" }> {
  const count = Math.max(1, Math.min(4, columnCount)) as RowColumnCount;
  return {
    id: createBlockId(),
    type: "row",
    preset: presetForColumnCount(count),
    gap: "md",
    columnWeights: equalWeights(count),
    columns: Array.from({ length: count }, () => []),
  };
}

export function createEmptyBlock(type: ExperiencePageBlock["type"]): ExperiencePageBlock {
  switch (type) {
    case "text":
      return { id: createBlockId(), type: "text", markdown: "" };
    case "heading":
      return { id: createBlockId(), type: "heading", level: 2, text: "Heading" };
    case "image":
      return { id: createBlockId(), type: "image", url: "", alt: "", caption: "", imageSize: "fit" };
    case "gallery":
      return { id: createBlockId(), type: "gallery", items: [], layout: "editorialPair" };
    case "html":
      return { id: createBlockId(), type: "html", html: "" };
    case "spacer":
      return { id: createBlockId(), type: "spacer", size: "md" };
    case "quote":
      return { id: createBlockId(), type: "quote", text: "", attribution: "" };
    case "cta":
      return { id: createBlockId(), type: "cta", label: "Learn more", url: "", variant: "primary" };
    case "video":
      return { id: createBlockId(), type: "video", url: "", posterUrl: "", caption: "" };
    case "stat":
      return { id: createBlockId(), type: "stat", value: "100+", label: "Years combined experience", countUp: true };
    case "blockVsFlight":
      return { id: createBlockId(), type: "blockVsFlight" };
    case "row":
      return createEmptyRow(2);
    case "container":
      return createEmptyContainer(1, 1);
    default:
      return { id: createBlockId(), type: "text", markdown: "" };
  }
}

type LegacyFields = Pick<ExperienceSectionSnapshot, "bodyCopy" | "imageUrl" | "contentBlocks"> &
  Partial<Pick<ExperienceSectionSnapshot, "sectionType" | "title" | "signatoryName" | "signatoryTitle">>;

/**
 * Synthesize pageBlocks from legacy section fields when none exist.
 *
 * Built-in page types are rebuilt element-for-element from their live layout (see
 * lib/legacy-page-to-blocks.ts), so what the designer shows is what the portal will show
 * once saved. Sections without a known type fall back to body text, image and gallery.
 */
export function synthesizePageBlocksFromLegacy(section: LegacyFields): ExperiencePageBlock[] {
  if (section.sectionType) {
    return convertLegacySectionToBlocks(
      {
        sectionType: section.sectionType,
        title: section.title ?? "",
        bodyCopy: section.bodyCopy,
        imageUrl: section.imageUrl,
        contentBlocks: section.contentBlocks,
        signatoryName: section.signatoryName ?? null,
        signatoryTitle: section.signatoryTitle ?? null,
      },
      { newId: createBlockId }
    );
  }
  const blocks: ExperiencePageBlock[] = [];
  if (section.bodyCopy?.trim()) {
    blocks.push({ id: createBlockId(), type: "text", markdown: section.bodyCopy });
  }
  if (section.imageUrl?.trim()) {
    blocks.push({
      id: createBlockId(),
      type: "image",
      url: section.imageUrl,
      caption: "",
    });
  }
  const gallery: ExperienceGalleryItem[] = section.contentBlocks?.gallery ?? [];
  if (gallery.length > 0) {
    blocks.push({
      id: createBlockId(),
      type: "gallery",
      items: gallery,
      layout: "editorialPair",
    });
  }
  return blocks;
}

export function getSectionPageBlocks(section: LegacyFields): ExperiencePageBlock[] {
  const existing = section.contentBlocks?.pageBlocks;
  if (existing != null) return normalizePageBlocks(existing);
  return synthesizePageBlocksFromLegacy(section);
}

/** True when the section uses the block editor model (including an intentionally empty page). */
export function sectionUsesPageBlocks(
  section: Pick<ExperienceSectionSnapshot, "contentBlocks">
): boolean {
  return section.contentBlocks?.pageBlocks != null;
}

export function patchSectionPageBlocks(
  contentBlocks: ExperienceContentBlocks | null | undefined,
  pageBlocks: ExperiencePageBlock[]
): ExperienceContentBlocks {
  return {
    ...(contentBlocks ?? {}),
    pageBlocks,
  };
}

export function updateRowColumns(
  blocks: ExperiencePageBlock[],
  rowId: string,
  columnCount: RowColumnCount,
  weights?: number[]
): ExperiencePageBlock[] {
  const located = findBlockById(blocks, rowId);
  if (!located || located.block.type !== "row") return blocks;

  const next = structuredClone(blocks) as ExperiencePageBlock[];
  const found = findBlockById(next, rowId);
  if (!found || found.block.type !== "row") return blocks;

  const newCount = Math.max(1, Math.min(4, columnCount)) as RowColumnCount;
  const oldColumns = found.block.columns;
  const newColumns: ExperiencePageBlock[][] = Array.from({ length: newCount }, (_, i) => [
    ...(oldColumns[i] ?? []),
  ]);
  if (newCount < oldColumns.length) {
    const overflow = oldColumns.slice(newCount).flat();
    newColumns[newCount - 1] = [...(newColumns[newCount - 1] ?? []), ...overflow];
  }

  const columnWeights =
    weights?.map((w) => Math.max(1, Math.round(w))) ?? equalWeights(newCount);
  while (columnWeights.length < newCount) columnWeights.push(1);

  return updateBlockById(next, rowId, {
    preset: presetForColumnCount(newCount),
    columnWeights: columnWeights.slice(0, newCount),
    columns: newColumns,
  });
}

export function convertBlockType(
  block: ExperiencePageBlock,
  newType: ExperiencePageBlock["type"]
): ExperiencePageBlock {
  if (block.type === newType) return block;
  if (block.type === "row" || block.type === "container" || newType === "row" || newType === "container") {
    return block;
  }
  const template = createEmptyBlock(newType);
  if (template.type === "row" || template.type === "container") return block;
  return { ...template, id: block.id } as ExperiencePageBlock;
}

/** @deprecated Use updateRowColumns */
export function updateRowPreset(
  blocks: ExperiencePageBlock[],
  rowId: string,
  preset: import("./experience-content").RowPreset
): ExperiencePageBlock[] {
  const count =
    preset === "equal-3" ? 3 : preset === "wide-narrow" || preset === "narrow-wide" ? 2 : 2;
  const weights =
    preset === "wide-narrow"
      ? [2, 1]
      : preset === "narrow-wide"
        ? [1, 2]
        : equalWeights(count);
  return updateRowColumns(blocks, rowId, count as RowColumnCount, weights);
}

export function updateContainerGrid(
  blocks: ExperiencePageBlock[],
  containerId: string,
  rows: GridDimension,
  cols: GridDimension,
  options?: {
    columnWeights?: number[];
    rowWeights?: number[];
  }
): ExperiencePageBlock[] {
  const located = findBlockById(blocks, containerId);
  if (!located || located.block.type !== "container") return blocks;

  const next = structuredClone(blocks) as ExperiencePageBlock[];
  const found = findBlockById(next, containerId);
  if (!found || found.block.type !== "container") return blocks;

  const newRows = Math.max(1, Math.min(4, rows)) as GridDimension;
  const newCols = Math.max(1, Math.min(4, cols)) as GridDimension;
  const oldCells = found.block.cells;

  const newCells: ExperiencePageBlock[][][] = Array.from({ length: newRows }, (_, r) =>
    Array.from({ length: newCols }, (_, c) => [...(oldCells[r]?.[c] ?? [])])
  );

  if (newRows < oldCells.length) {
    const overflow = oldCells.slice(newRows).flat(2);
    const lastRow = newRows - 1;
    const lastCol = newCols - 1;
    newCells[lastRow]![lastCol] = [...(newCells[lastRow]![lastCol] ?? []), ...overflow];
  } else if (newCols < (oldCells[0]?.length ?? 0)) {
    for (let r = 0; r < oldCells.length; r++) {
      const overflow = oldCells[r]!.slice(newCols).flat();
      if (overflow.length > 0) {
        newCells[Math.min(r, newRows - 1)]![newCols - 1] = [
          ...(newCells[Math.min(r, newRows - 1)]![newCols - 1] ?? []),
          ...overflow,
        ];
      }
    }
  }

  const columnWeights =
    options?.columnWeights?.map((w) => Math.max(1, Math.round(w))) ?? equalWeights(newCols);
  const rowWeights =
    options?.rowWeights?.map((w) => Math.max(1, Math.round(w))) ?? equalWeights(newRows);

  return updateBlockById(next, containerId, {
    rows: newRows,
    cols: newCols,
    columnWeights: columnWeights.slice(0, newCols),
    rowWeights: rowWeights.slice(0, newRows),
    cells: newCells,
  });
}

/** True when custom HTML relies on CSS motion (keyframes, animation or transition). Such
 * motion doesn't play for reduced-motion viewers, some browsers, or PDF/print, so the
 * designer flags it. */
export function htmlHasAnimation(html: string | null | undefined): boolean {
  if (!html) return false;
  return /@keyframes|\banimation(-name)?\s*:|\btransition\s*:/i.test(html);
}
