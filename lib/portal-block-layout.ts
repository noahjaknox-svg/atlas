import type {
  BlockAlign,
  BlockLayout,
  BlockPadding,
  BlockVerticalAlign,
  BlockWidth,
  ExperiencePageBlock,
  GridDimension,
  RowGap,
  RowPreset,
} from "./experience-content";
import { isCompactImageSize, resolveImageDisplaySize } from "./experience-image-system";
import { cn } from "./utils";

export type BlockPath = number[];

export function isRowBlock(block: ExperiencePageBlock): block is Extract<ExperiencePageBlock, { type: "row" }> {
  return block.type === "row";
}

export function isContainerBlock(
  block: ExperiencePageBlock
): block is Extract<ExperiencePageBlock, { type: "container" }> {
  return block.type === "container";
}

export function isGridBlock(
  block: ExperiencePageBlock
): block is Extract<ExperiencePageBlock, { type: "row" }> | Extract<ExperiencePageBlock, { type: "container" }> {
  return block.type === "row" || block.type === "container";
}

export function isLeafBlock(block: ExperiencePageBlock): boolean {
  return !isGridBlock(block);
}

export type RowColumnCount = GridDimension;

export type RowColumnLayout = "responsive" | "horizontal" | "stacked";

export function rowColumnCount(preset: RowPreset): number {
  switch (preset) {
    case "equal-3":
      return 3;
    default:
      return 2;
  }
}

export function presetDefaultWeights(preset: RowPreset): number[] {
  switch (preset) {
    case "equal-3":
      return [1, 1, 1];
    case "wide-narrow":
      return [2, 1];
    case "narrow-wide":
      return [1, 2];
    case "equal-2":
    default:
      return [1, 1];
  }
}

export function equalWeights(count: number): number[] {
  return Array.from({ length: Math.max(1, Math.min(4, count)) }, () => 1);
}

export function resolveRowLayout(
  block: Extract<ExperiencePageBlock, { type: "row" }>,
  layout: RowColumnLayout = "responsive"
): { count: RowColumnCount; weights: number[]; gridClass: string; gridTemplateColumns?: string } {
  const fromColumns = block.columns.length;
  const fromPreset = rowColumnCount(block.preset);
  const count = Math.max(1, Math.min(4, fromColumns || fromPreset)) as RowColumnCount;

  let weights = block.columnWeights?.length
    ? block.columnWeights.slice(0, count).map((w) => Math.max(1, Math.round(w)))
    : presetDefaultWeights(block.preset).slice(0, count);

  while (weights.length < count) weights.push(1);
  if (weights.length > count) weights = weights.slice(0, count);

  const gridClass = getRowGridClassesFromWeights(count, weights, block.gap ?? "md", layout);
  const gridTemplateColumns = getRowGridTemplateColumns(count, weights, layout);
  return { count, weights, gridClass, gridTemplateColumns };
}

export function getRowGridTemplateColumns(
  count: RowColumnCount,
  weights: number[],
  layout: RowColumnLayout = "responsive"
): string | undefined {
  if (count <= 1 || layout === "stacked") return undefined;
  const normalized = weights.slice(0, count).map((w) => Math.max(1, Math.round(w)));
  while (normalized.length < count) normalized.push(1);
  return normalized.map((w) => `${w}fr`).join(" ");
}

export function getRowGridClassesFromWeights(
  count: RowColumnCount,
  weights: number[],
  gap: RowGap = "md",
  layout: RowColumnLayout = "responsive"
): string {
  const gapClass = gap === "sm" ? "gap-3" : gap === "lg" ? "gap-8" : "gap-5";
  if (count <= 1) return `grid grid-cols-1 ${gapClass}`;
  if (layout === "stacked") return `grid grid-cols-1 ${gapClass}`;
  return `portal-row-grid grid grid-cols-1 ${gapClass}`;
}

function gapClassFor(gap: RowGap): string {
  return gap === "sm" ? "gap-3" : gap === "lg" ? "gap-8" : "gap-5";
}

function normalizeGridWeights(weights: number[] | undefined, count: number): number[] {
  const normalized = (weights ?? equalWeights(count))
    .slice(0, count)
    .map((w) => Math.max(1, Math.round(w)));
  while (normalized.length < count) normalized.push(1);
  return normalized.slice(0, count);
}

export function getGridTemplate(weights: number[], count: number): string {
  return normalizeGridWeights(weights, count)
    .map((w) => `${w}fr`)
    .join(" ");
}

export function resolveContainerLayout(
  block: Extract<ExperiencePageBlock, { type: "container" }>,
  layout: RowColumnLayout = "responsive"
): {
  rows: GridDimension;
  cols: GridDimension;
  gridClass: string;
  colTemplate?: string;
  rowTemplate?: string;
} {
  const rows = Math.max(1, Math.min(4, block.rows)) as GridDimension;
  const cols = Math.max(1, Math.min(4, block.cols)) as GridDimension;
  const gapClass = gapClassFor(block.gap ?? "md");
  const colWeights = normalizeGridWeights(block.columnWeights, cols);
  const rowWeights = normalizeGridWeights(block.rowWeights, rows);
  const colTemplate = cols > 1 ? getGridTemplate(colWeights, cols) : "1fr";
  const rowTemplate = rows > 1 ? getGridTemplate(rowWeights, rows) : "1fr";

  const alignItems = "items-stretch";
  const gridClass = `portal-container-grid grid w-full ${gapClass} ${alignItems}`;

  return {
    rows,
    cols,
    gridClass,
    colTemplate,
    rowTemplate,
  };
}

function gridTemplateStyle(
  layout: RowColumnLayout,
  colTemplate: string,
  rowTemplate: string
): Record<string, string> {
  const gridTemplateColumns = layout === "stacked" ? "1fr" : colTemplate;
  const gridTemplateRows = layout === "stacked" ? "auto" : rowTemplate;
  return {
    gridTemplateColumns,
    gridTemplateRows,
    "--portal-col-template": colTemplate,
    "--portal-row-template": rowTemplate,
  };
}

function contentSizedRowTemplate(rows: number): string {
  return Array.from({ length: Math.max(1, rows) }, () => "auto").join(" ");
}

export function containerGridProps(
  block: Extract<ExperiencePageBlock, { type: "container" }>,
  layout: RowColumnLayout,
  options?: { contentSizedRows?: boolean }
): {
  className: string;
  style: Record<string, string>;
  "data-layout": RowColumnLayout;
} {
  const resolved = resolveContainerLayout(block, layout);
  const colTemplate = resolved.colTemplate ?? "1fr";
  const rowTemplate = resolved.rowTemplate ?? "1fr";
  const rows = resolved.rows;
  const rowTemplateForStyle =
    options?.contentSizedRows ? contentSizedRowTemplate(rows) : rowTemplate;

  let className = resolved.gridClass;
  // Keep items-stretch with content-sized rows so cells in the same row share height
  // (required for vertical block alignment within a cell).

  return {
    className,
    "data-layout": layout,
    style: gridTemplateStyle(layout, colTemplate, rowTemplateForStyle),
  };
}

export function rowGridProps(
  block: Extract<ExperiencePageBlock, { type: "row" }>,
  layout: RowColumnLayout
): {
  className: string;
  style: Record<string, string>;
  "data-row-layout": RowColumnLayout;
} {
  const { gridClass, gridTemplateColumns } = resolveRowLayout(block, layout);
  const colTemplate = gridTemplateColumns ?? "1fr";

  return {
    className: gridClass,
    "data-row-layout": layout,
    style: {
      gridTemplateColumns: layout === "stacked" ? "1fr" : colTemplate,
      "--portal-row-template": colTemplate,
    },
  };
}

/** Walk grid cells — path after grid block is [row, col, blockInCell, …]. */
export function walkGridCells(
  block: Extract<ExperiencePageBlock, { type: "container" }>,
  blockPath: BlockPath,
  visit: (blocks: ExperiencePageBlock[], cellPath: BlockPath) => void
): void {
  for (let r = 0; r < block.rows; r++) {
    for (let c = 0; c < block.cols; c++) {
      visit(block.cells[r]?.[c] ?? [], [...blockPath, r, c]);
    }
  }
}

/** @deprecated Prefer resolveRowLayout / getRowGridClassesFromWeights */
export function getRowGridClasses(preset: RowPreset, gap: RowGap = "md"): string {
  const count = rowColumnCount(preset) as RowColumnCount;
  const weights = presetDefaultWeights(preset);
  return getRowGridClassesFromWeights(count, weights, gap);
}

export function getBlockWidthClass(width: BlockWidth = "auto"): string {
  switch (width) {
    case "narrow":
      return "max-w-prose";
    case "medium":
      return "max-w-2xl";
    case "full":
      return "w-full max-w-none";
    case "auto":
    default:
      return "max-w-3xl";
  }
}

export function getBlockAlignClass(align: BlockAlign = "left"): string {
  switch (align) {
    case "center":
      return "mx-auto text-center";
    case "right":
      return "ml-auto text-right";
    case "left":
    default:
      return "";
  }
}

export function getLeafHorizontalJustifyClass(align: BlockAlign = "left"): string {
  switch (align) {
    case "center":
      return "justify-center";
    case "right":
      return "justify-end";
    case "left":
    default:
      return "justify-start";
  }
}

export function getLeafVerticalJustifyClass(align: BlockVerticalAlign = "top"): string {
  switch (align) {
    case "center":
      return "justify-center";
    case "bottom":
      return "justify-end";
    case "top":
    default:
      return "justify-start";
  }
}

/** @deprecated Block horizontal align positions the box only; use markdown HTML for text alignment. */
export function getLeafTextAlignClass(align: BlockAlign = "left"): string {
  switch (align) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    case "left":
    default:
      return "text-left";
  }
}

export function getLeafWidthClass(width: BlockWidth = "auto", fullWidth = false): string {
  if (fullWidth || width === "full") return "w-full max-w-none";
  switch (width) {
    case "narrow":
      return "w-full max-w-prose";
    case "medium":
      return "w-full max-w-2xl";
    case "auto":
    default:
      return "w-full max-w-3xl";
  }
}

/** Leaf blocks sized to content (small images, buttons) so horizontal align can center them in a cell. */
export function isShrinkWrapLeafBlock(block: ExperiencePageBlock): boolean {
  if (block.type === "cta" || block.type === "spacer") return true;
  if (block.type === "image") {
    return isCompactImageSize(resolveImageDisplaySize(block));
  }
  return false;
}

export function getLeafInnerWidthClass(width: BlockWidth = "auto", shrinkWrap = false): string {
  if (shrinkWrap) return "w-auto max-w-full";
  return getLeafWidthClass(width);
}

export function getBlockPaddingClass(padding: BlockPadding = "none"): string {
  switch (padding) {
    case "sm":
      return "p-2";
    case "md":
      return "p-4";
    case "lg":
      return "p-8";
    case "none":
    default:
      return "";
  }
}

export function getLeafLayoutClasses(blockLayout?: BlockLayout): string {
  if (!blockLayout) return "";
  return [
    getBlockWidthClass(blockLayout.width),
    getBlockAlignClass(blockLayout.align),
    getBlockPaddingClass(blockLayout.padding),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Walk all blocks depth-first, including grid cells. */
export function walkBlocks(
  blocks: ExperiencePageBlock[],
  visit: (block: ExperiencePageBlock, path: BlockPath) => void,
  path: BlockPath = []
): void {
  blocks.forEach((block, index) => {
    const blockPath = [...path, index];
    visit(block, blockPath);
    if (isContainerBlock(block)) {
      walkGridCells(block, blockPath, (cellBlocks, cellPath) => {
        walkBlocks(cellBlocks, visit, cellPath);
      });
    } else if (isRowBlock(block)) {
      block.columns.forEach((column, colIndex) => {
        walkBlocks(column, visit, [...blockPath, colIndex]);
      });
    }
  });
}

export function findBlockById(
  blocks: ExperiencePageBlock[],
  id: string
): { block: ExperiencePageBlock; path: BlockPath } | null {
  let found: { block: ExperiencePageBlock; path: BlockPath } | null = null;
  walkBlocks(blocks, (block, path) => {
    if (block.id === id && !found) {
      found = { block, path };
    }
  });
  return found;
}

function getContainerAtPath(
  blocks: ExperiencePageBlock[],
  path: BlockPath
): ExperiencePageBlock[] | null {
  if (path.length === 0) return blocks;
  if (path.length === 1) return blocks;

  let current: ExperiencePageBlock[] = blocks;
  let i = 0;
  while (i < path.length - 1) {
    const blockIndex = path[i];
    if (blockIndex === undefined) return null;
    const block = current[blockIndex];
    if (!block) return null;

    if (isContainerBlock(block)) {
      const row = path[i + 1];
      const col = path[i + 2];
      if (row === undefined || col === undefined) return null;
      current = block.cells[row]?.[col] ?? [];
      i += 3;
      continue;
    }

    if (isRowBlock(block)) {
      const colIdx = path[i + 1];
      if (colIdx === undefined) return null;
      current = block.columns[colIdx] ?? [];
      i += 2;
      continue;
    }

    return null;
  }
  return current;
}

export function updateBlockById(
  blocks: ExperiencePageBlock[],
  id: string,
  patch: Partial<ExperiencePageBlock>
): ExperiencePageBlock[] {
  const located = findBlockById(blocks, id);
  if (!located) return blocks;

  const next = structuredClone(blocks) as ExperiencePageBlock[];
  const container = getContainerAtPath(next, located.path.slice(0, -1));
  if (!container) return blocks;

  const index = located.path[located.path.length - 1]!;
  const current = container[index];
  if (!current) return blocks;

  container[index] = { ...current, ...patch } as ExperiencePageBlock;
  return next;
}

export function replaceBlockById(
  blocks: ExperiencePageBlock[],
  id: string,
  block: ExperiencePageBlock
): ExperiencePageBlock[] {
  const located = findBlockById(blocks, id);
  if (!located) return blocks;

  const next = structuredClone(blocks) as ExperiencePageBlock[];
  const container = getContainerAtPath(next, located.path.slice(0, -1));
  if (!container) return blocks;

  const index = located.path[located.path.length - 1]!;
  if (!container[index]) return blocks;

  container[index] = block;
  return next;
}

export function removeBlockById(
  blocks: ExperiencePageBlock[],
  id: string
): ExperiencePageBlock[] {
  const located = findBlockById(blocks, id);
  if (!located) return blocks;

  const next = structuredClone(blocks) as ExperiencePageBlock[];
  const container = getContainerAtPath(next, located.path.slice(0, -1));
  if (!container) return blocks;

  const index = located.path[located.path.length - 1]!;
  container.splice(index, 1);
  return next;
}

export function duplicateBlockById(
  blocks: ExperiencePageBlock[],
  id: string,
  createId: () => string
): ExperiencePageBlock[] {
  const located = findBlockById(blocks, id);
  if (!located) return blocks;

  const next = structuredClone(blocks) as ExperiencePageBlock[];
  const container = getContainerAtPath(next, located.path.slice(0, -1));
  if (!container) return blocks;

  const index = located.path[located.path.length - 1]!;
  const copy = reassignBlockIds(structuredClone(located.block) as ExperiencePageBlock, createId);
  container.splice(index + 1, 0, copy);
  return next;
}

function reassignBlockIds(block: ExperiencePageBlock, createId: () => string): ExperiencePageBlock {
  if (isContainerBlock(block)) {
    return {
      ...block,
      id: createId(),
      cells: block.cells.map((row) =>
        row.map((cell) => cell.map((child) => reassignBlockIds(child, createId)))
      ),
    };
  }
  if (isRowBlock(block)) {
    return {
      ...block,
      id: createId(),
      columns: block.columns.map((col) =>
        col.map((child) => reassignBlockIds(child, createId))
      ),
    };
  }
  return { ...block, id: createId() };
}

export function insertBlockAt(
  blocks: ExperiencePageBlock[],
  path: BlockPath,
  block: ExperiencePageBlock,
  index?: number
): ExperiencePageBlock[] {
  const next = structuredClone(blocks) as ExperiencePageBlock[];
  const container = getContainerAtPath(next, path);
  if (!container) return blocks;

  const at = index ?? container.length;
  container.splice(at, 0, block);
  return next;
}

export function reorderBlocksInContainer(
  blocks: ExperiencePageBlock[],
  containerPath: BlockPath,
  fromIndex: number,
  toIndex: number
): ExperiencePageBlock[] {
  const next = structuredClone(blocks) as ExperiencePageBlock[];
  const container = getContainerAtPath(next, containerPath);
  if (!container) return blocks;

  const [moved] = container.splice(fromIndex, 1);
  if (!moved) return blocks;
  container.splice(toIndex, 0, moved);
  return next;
}

export function getBlocksAtPath(
  blocks: ExperiencePageBlock[],
  path: BlockPath
): ExperiencePageBlock[] {
  if (path.length === 0) return blocks;
  const container = getContainerAtPath(blocks, path);
  return container ?? [];
}

export function blockLabel(block: ExperiencePageBlock): string {
  switch (block.type) {
    case "text":
      return "Text";
    case "heading":
      return `Heading H${block.level}`;
    case "image":
      return "Image";
    case "gallery":
      return "Gallery";
    case "html":
      return "Custom HTML";
    case "spacer":
      return "Spacer";
    case "quote":
      return "Quote";
    case "cta":
      return "Button";
    case "video":
      return "Video";
    case "row":
      return `Row (${resolveRowLayout(block).count} col)`;
    case "container":
      return `Container (${block.rows}×${block.cols})`;
    default:
      return "Block";
  }
}
