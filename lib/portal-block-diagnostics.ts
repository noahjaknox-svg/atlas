import type { ExperiencePageBlock } from "./experience-content";
import { findMissingPortalVariables, type PortalVariableContext } from "./portal-variables";
import { walkBlocks } from "./portal-block-layout";

export type BlockDiagnosticKind =
  | "empty_text"
  | "missing_image"
  | "missing_video"
  | "missing_cta_url"
  | "unresolved_variable"
  | "empty_row_column"
  | "empty_quote";

export type BlockDiagnostic = {
  blockId: string;
  kind: BlockDiagnosticKind;
  message: string;
};

function textFields(block: ExperiencePageBlock): string[] {
  switch (block.type) {
    case "text":
      return [block.markdown];
    case "heading":
      return [block.text];
    case "quote":
      return [block.text, block.attribution ?? ""];
    case "cta":
      return [block.label];
    default:
      return [];
  }
}

function isBlank(value: string | null | undefined): boolean {
  return !value?.trim();
}

export function collectBlockDiagnostics(
  blocks: ExperiencePageBlock[],
  variableContext?: PortalVariableContext
): BlockDiagnostic[] {
  const diagnostics: BlockDiagnostic[] = [];

  walkBlocks(blocks, (block) => {
    switch (block.type) {
      case "text":
        if (!block.markdown.trim()) {
          diagnostics.push({
            blockId: block.id,
            kind: "empty_text",
            message: "Text block is empty",
          });
        }
        break;
      case "heading":
        if (!block.text.trim()) {
          diagnostics.push({
            blockId: block.id,
            kind: "empty_text",
            message: "Heading is empty",
          });
        }
        break;
      case "image":
        if (isBlank(block.url)) {
          diagnostics.push({
            blockId: block.id,
            kind: "missing_image",
            message: "Image URL is missing",
          });
        }
        break;
      case "video":
        if (isBlank(block.url)) {
          diagnostics.push({
            blockId: block.id,
            kind: "missing_video",
            message: "Video URL is missing",
          });
        }
        break;
      case "cta":
        if (isBlank(block.url)) {
          diagnostics.push({
            blockId: block.id,
            kind: "missing_cta_url",
            message: "Button link URL is missing",
          });
        }
        break;
      case "quote":
        if (!block.text.trim()) {
          diagnostics.push({
            blockId: block.id,
            kind: "empty_quote",
            message: "Quote text is empty",
          });
        }
        break;
      case "row":
        block.columns.forEach((col, i) => {
          if (col.length === 0) {
            diagnostics.push({
              blockId: block.id,
              kind: "empty_row_column",
              message: `Row column ${i + 1} is empty`,
            });
          }
        });
        break;
      case "container":
        block.cells.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (cell.length === 0) {
              diagnostics.push({
                blockId: block.id,
                kind: "empty_row_column",
                message: `Cell R${r + 1}C${c + 1} is empty`,
              });
            }
          });
        });
        break;
      default:
        break;
    }

    if (variableContext) {
      for (const text of textFields(block)) {
        const missing = findMissingPortalVariables(text, variableContext);
        for (const key of missing) {
          diagnostics.push({
            blockId: block.id,
            kind: "unresolved_variable",
            message: `Unresolved variable {{${key}}}`,
          });
        }
      }
    }
  });

  return diagnostics;
}

export function diagnosticsSummary(diagnostics: BlockDiagnostic[]): string {
  if (diagnostics.length === 0) return "No issues";
  const counts = new Map<BlockDiagnosticKind, number>();
  for (const d of diagnostics) {
    counts.set(d.kind, (counts.get(d.kind) ?? 0) + 1);
  }
  const parts: string[] = [];
  Array.from(counts.entries()).forEach(([kind, count]) => {
    parts.push(`${count} ${kind.replace(/_/g, " ")}`);
  });
  return parts.join(", ");
}

export function diagnosticsForBlock(
  diagnostics: BlockDiagnostic[],
  blockId: string
): BlockDiagnostic[] {
  return diagnostics.filter((d) => d.blockId === blockId);
}
