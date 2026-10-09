import type { BlockAlign, BlockLayout, ExperiencePageBlock, PageLayout } from "./experience-content";
import { isContainerBlock, isRowBlock, type BlockPath } from "./portal-block-layout";
import { findWidthPreset, type PortalLayoutSettings } from "./portal-layout-settings";

/**
 * Layout inheritance: page → container → element.
 *
 * - The PAGE sets the width and alignment of its top-level elements.
 * - An element nested inside a container/row fills its parent (so sizes never compound:
 *   80% of an 80% container would be 64% of the page). Alignment follows the nearest parent
 *   that sets one, then the page.
 * - Anything an element sets itself (width / align) wins over what it inherits.
 */
export type InheritedLayout = {
  widthDesktop?: string;
  widthMobile?: string;
  align?: BlockAlign;
};

export function inheritedForTopLevel(pageLayout: PageLayout | undefined): InheritedLayout {
  return {
    widthDesktop: pageLayout?.widthDesktop,
    widthMobile: pageLayout?.widthMobile,
    align: pageLayout?.align,
  };
}

/** An element inside a container cell or row column fills its parent. */
export function inheritedForNested(parentAlign: BlockAlign | undefined): InheritedLayout {
  return { widthDesktop: "full", widthMobile: "full", align: parentAlign };
}

function hasExplicitWidth(layout: BlockLayout | undefined): boolean {
  return !!(layout?.widthDesktop || layout?.widthMobile || layout?.width);
}

/** Fill in whatever the element didn't set itself from what it inherits. */
export function applyInheritedLayout(
  explicit: BlockLayout | undefined,
  inherited: InheritedLayout | undefined
): BlockLayout | undefined {
  if (!inherited) return explicit;
  const next: BlockLayout = { ...explicit };
  if (!hasExplicitWidth(explicit)) {
    if (inherited.widthDesktop) next.widthDesktop = inherited.widthDesktop;
    if (inherited.widthMobile) next.widthMobile = inherited.widthMobile;
  }
  if (explicit?.align === undefined && inherited.align) next.align = inherited.align;
  return Object.keys(next).length > 0 ? next : explicit;
}

/** The alignment a container passes down to the elements inside it. */
export function alignPassedDown(
  effective: BlockLayout | undefined,
  inherited: InheritedLayout | undefined
): BlockAlign | undefined {
  return effective?.align ?? inherited?.align;
}

/**
 * What the element at `path` inherits, given the page layout and its ancestors' own settings.
 * `nested` is false for top-level elements.
 */
export function resolveInheritedFor(
  blocks: ExperiencePageBlock[],
  path: BlockPath,
  pageLayout: PageLayout | undefined
): { nested: boolean; inherited: InheritedLayout } {
  let inherited = inheritedForTopLevel(pageLayout);
  let nested = false;
  let list = blocks;
  let i = 0;
  while (i < path.length - 1) {
    const block = list[path[i]!];
    if (!block) break;
    // This block is an ancestor of the target: what it passes down is what the target inherits.
    const effective = applyInheritedLayout(block.blockLayout, inherited);
    const parentAlign = alignPassedDown(effective, inherited);
    if (isContainerBlock(block)) {
      list = block.cells[path[i + 1]!]?.[path[i + 2]!] ?? [];
      i += 3;
    } else if (isRowBlock(block)) {
      list = block.columns[path[i + 1]!] ?? [];
      i += 2;
    } else {
      break;
    }
    inherited = inheritedForNested(parentAlign);
    nested = true;
  }
  return { nested, inherited };
}

/** Human-readable inherited width for the inspector's "Inherit (…)" option. */
export function describeInheritedWidth(
  inherited: InheritedLayout,
  nested: boolean,
  viewport: "desktop" | "mobile",
  settings: PortalLayoutSettings
): string {
  if (nested) return "fill parent";
  const id = viewport === "mobile" ? inherited.widthMobile ?? inherited.widthDesktop : inherited.widthDesktop ?? inherited.widthMobile;
  return findWidthPreset(settings, id).label;
}

export function describeInheritedAlign(inherited: InheritedLayout): string {
  const a = inherited.align ?? "center";
  return a.charAt(0).toUpperCase() + a.slice(1);
}
