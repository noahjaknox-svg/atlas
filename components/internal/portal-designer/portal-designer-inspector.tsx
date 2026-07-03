"use client";

import { useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import type {
  BlockAlign,
  BlockLayout,
  BlockPadding,
  BlockVerticalAlign,
  ExperiencePageBlock,
  ImageDisplaySize,
  RowDisplay,
  RowGap,
} from "@/lib/experience-content";
import {
  resolveBlockWidthPresetId,
  resolveShellBlockLayout,
  type BlockVisibility,
  type PortalLayoutSettings,
} from "@/lib/portal-layout-settings";
import { diagnosticsForBlock, type BlockDiagnostic } from "@/lib/portal-block-diagnostics";
import {
  isContainerBlock,
  isRowBlock,
  resolveContainerLayout,
  resolveRowLayout,
  type BlockPath,
  type RowColumnCount,
} from "@/lib/portal-block-layout";
import { updateContainerGrid, updateRowColumns } from "@/lib/page-blocks-utils";
import type { GridDimension } from "@/lib/experience-content";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { MediaUploadField } from "@/components/internal/media-upload-field";
import { GalleryEditor } from "@/components/internal/gallery-editor";
import { MarkdownToolbar } from "./markdown-toolbar";
import { isCustomPortalPage } from "@/lib/experience-page-slug";
import { resolveImageDisplaySize } from "@/lib/experience-image-system";
import { PortalDesignerImageCropModal } from "./portal-designer-image-crop-modal";
import type { DesignerSection, PreviewViewport } from "./portal-designer-types";
import { PORTAL_HTML_AI_INSTRUCTIONS } from "@/lib/portal-html-ai-instructions";
import { cn } from "@/lib/utils";

export function PortalDesignerInspector({
  section,
  selectedBlock,
  onPatchSection,
  onPatchBlock,
  onPatchBlocks,
  proposalId,
  diagnostics = [],
  layoutSettings,
  designViewport,
  selectedBlockPath,
}: {
  section: DesignerSection;
  selectedBlock: ExperiencePageBlock | null;
  onPatchSection: (patch: Partial<DesignerSection>) => void;
  onPatchBlock: (blockId: string, patch: Partial<ExperiencePageBlock>) => void;
  onPatchBlocks?: (blocks: ExperiencePageBlock[]) => void;
  proposalId?: string;
  diagnostics?: BlockDiagnostic[];
  layoutSettings: PortalLayoutSettings;
  designViewport?: PreviewViewport;
  selectedBlockPath?: BlockPath;
}) {
  const blockWarnings = selectedBlock
    ? diagnosticsForBlock(diagnostics, selectedBlock.id)
    : [];
  const [aiInstructionsCopied, setAiInstructionsCopied] = useState(false);

  async function copyHtmlAiInstructions() {
    try {
      await navigator.clipboard.writeText(PORTAL_HTML_AI_INSTRUCTIONS);
      setAiInstructionsCopied(true);
      window.setTimeout(() => setAiInstructionsCopied(false), 2000);
    } catch {
      window.prompt("Copy these instructions:", PORTAL_HTML_AI_INSTRUCTIONS);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center border-b border-atlas-border px-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-atlas-muted">Settings</p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <Label className="text-sm">Page name</Label>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Used in the page list and navigation only. Add a Heading block to show a title on the page.
          </p>
          <Input
            value={section.title}
            onChange={(e) => onPatchSection({ title: e.target.value })}
            className="mt-1 h-9 text-sm"
          />
        </div>

        {isCustomPortalPage(section) ? (
          <div>
            <Label className="text-sm">URL slug</Label>
            <Input
              value={section.pageSlug ?? ""}
              onChange={(e) => onPatchSection({ pageSlug: e.target.value })}
              className="mt-1 h-9 font-mono text-sm"
              placeholder="my-custom-page"
            />
          </div>
        ) : null}

        {selectedBlock ? (
          <>
            {blockWarnings.length > 0 ? (
              <ul className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-200">
                {blockWarnings.map((w, i) => (
                  <li key={`${w.kind}-${i}`}>{w.message}</li>
                ))}
              </ul>
            ) : null}
            <BlockEditor
              block={selectedBlock}
              onPatch={(patch) => onPatchBlock(selectedBlock.id, patch)}
              onPatchRowColumns={
                onPatchBlocks && isRowBlock(selectedBlock)
                  ? (columnCount, weights) => {
                      const blocks = section.contentBlocks?.pageBlocks ?? [];
                      onPatchBlocks(
                        updateRowColumns(blocks, selectedBlock.id, columnCount, weights)
                      );
                    }
                  : undefined
              }
              onPatchContainerGrid={
                onPatchBlocks && isContainerBlock(selectedBlock)
                  ? (rows, cols, options) => {
                      const blocks = section.contentBlocks?.pageBlocks ?? [];
                      onPatchBlocks(
                        updateContainerGrid(blocks, selectedBlock.id, rows, cols, options)
                      );
                    }
                  : undefined
              }
              proposalId={proposalId}
              layoutSettings={layoutSettings}
              designViewport={designViewport}
              selectedBlockPath={selectedBlockPath}
            />
          </>
        ) : (
          <p className="text-sm text-atlas-muted">
            Select a block in the preview or block list to edit its content.
          </p>
        )}
      </div>

      {selectedBlock?.type === "html" ? (
        <div className="shrink-0 border-t border-atlas-border bg-atlas-surface/20 p-4">
          <p className="mb-2 text-xs text-atlas-muted">
            Paste into another AI, add your request, then copy its single code block (use the copy
            button on the block — not the surrounding text) and paste into the field above.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="h-9 w-full gap-2 text-sm"
            onClick={() => void copyHtmlAiInstructions()}
          >
            {aiInstructionsCopied ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden />
                Copy AI instructions
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ResponsiveWidthControls({
  blockLayout,
  layoutSettings,
  onPatch,
  designViewport,
}: {
  blockLayout?: BlockLayout;
  layoutSettings: PortalLayoutSettings;
  onPatch: (layout: BlockLayout) => void;
  designViewport?: PreviewViewport;
}) {
  const presetOptions = layoutSettings.widthPresets.map(
    (preset) => [preset.id, preset.label] as [string, string]
  );

  return (
    <>
      <LayoutSelect
        label="Desktop width"
        value={resolveBlockWidthPresetId(blockLayout, "desktop", layoutSettings)}
        options={presetOptions}
        highlighted={designViewport === "desktop"}
        onChange={(widthDesktop) => onPatch({ ...blockLayout, widthDesktop })}
      />
      <LayoutSelect
        label="Mobile width"
        value={resolveBlockWidthPresetId(blockLayout, "mobile", layoutSettings)}
        options={presetOptions}
        highlighted={designViewport === "mobile"}
        onChange={(widthMobile) => onPatch({ ...blockLayout, widthMobile })}
      />
      <LayoutSelect
        label="Show on"
        value={blockLayout?.visibility ?? "both"}
        options={[
          ["both", "Both"],
          ["desktop", "Desktop only"],
          ["mobile", "Mobile only"],
        ]}
        onChange={(visibility) =>
          onPatch({ ...blockLayout, visibility: visibility as BlockVisibility })
        }
      />
    </>
  );
}

function ImageLayoutControls({
  blockLayout,
  layoutSettings,
  onPatch,
  designViewport,
}: {
  blockLayout?: BlockLayout;
  layoutSettings: PortalLayoutSettings;
  onPatch: (layout: BlockLayout) => void;
  designViewport?: PreviewViewport;
}) {
  return (
    <div className="space-y-2 rounded border border-atlas-border/60 bg-atlas-bg/30 p-2">
      <p className="text-sm font-medium text-atlas-muted">Layout</p>
      <div className="grid grid-cols-1 gap-2">
        <ResponsiveWidthControls
          blockLayout={blockLayout}
          layoutSettings={layoutSettings}
          onPatch={onPatch}
          designViewport={designViewport}
        />
        <LayoutSelect
          label="Horizontal align"
          value={blockLayout?.align ?? "left"}
          options={[
            ["left", "Left"],
            ["center", "Center"],
            ["right", "Right"],
          ]}
          onChange={(align) => onPatch({ ...blockLayout, align: align as BlockAlign })}
        />
        <LayoutSelect
          label="Vertical align"
          value={blockLayout?.verticalAlign ?? "top"}
          options={[
            ["top", "Top"],
            ["center", "Center"],
            ["bottom", "Bottom"],
          ]}
          onChange={(verticalAlign) =>
            onPatch({ ...blockLayout, verticalAlign: verticalAlign as BlockVerticalAlign })
          }
        />
        <LayoutSelect
          label="Padding"
          value={blockLayout?.padding ?? "none"}
          options={[
            ["none", "None"],
            ["sm", "Small"],
            ["md", "Medium"],
            ["lg", "Large"],
          ]}
          onChange={(padding) => onPatch({ ...blockLayout, padding: padding as BlockPadding })}
        />
      </div>
    </div>
  );
}

function BlockLayoutControls({
  blockLayout,
  layoutSettings,
  onPatch,
  designViewport,
}: {
  blockLayout?: BlockLayout;
  layoutSettings: PortalLayoutSettings;
  onPatch: (layout: BlockLayout) => void;
  designViewport?: PreviewViewport;
}) {
  return (
    <div className="space-y-2 rounded border border-atlas-border/60 bg-atlas-bg/30 p-2">
      <p className="text-sm font-medium text-atlas-muted">Responsive layout</p>
      <div className="grid grid-cols-1 gap-2">
        <ResponsiveWidthControls
          blockLayout={blockLayout}
          layoutSettings={layoutSettings}
          onPatch={onPatch}
          designViewport={designViewport}
        />
        <LayoutSelect
          label="Horizontal align"
          value={blockLayout?.align ?? "left"}
          options={[
            ["left", "Left"],
            ["center", "Center"],
            ["right", "Right"],
          ]}
          onChange={(align) => onPatch({ ...blockLayout, align: align as BlockAlign })}
        />
        <LayoutSelect
          label="Vertical align"
          value={blockLayout?.verticalAlign ?? "top"}
          options={[
            ["top", "Top"],
            ["center", "Center"],
            ["bottom", "Bottom"],
          ]}
          onChange={(verticalAlign) =>
            onPatch({ ...blockLayout, verticalAlign: verticalAlign as BlockVerticalAlign })
          }
        />
        <LayoutSelect
          label="Padding"
          value={blockLayout?.padding ?? "none"}
          options={[
            ["none", "None"],
            ["sm", "Small"],
            ["md", "Medium"],
            ["lg", "Large"],
          ]}
          onChange={(padding) => onPatch({ ...blockLayout, padding: padding as BlockPadding })}
        />
      </div>
    </div>
  );
}

function LayoutSelect({
  label,
  value,
  options,
  onChange,
  highlighted,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
  highlighted?: boolean;
}) {
  return (
    <div className={cn(highlighted && "rounded-md ring-1 ring-atlas-accent/40")}>
      <Label className="text-sm">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="atlas-input mt-0.5 h-7 w-full text-sm"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function BlockEditor({
  block,
  onPatch,
  onPatchRowColumns,
  onPatchContainerGrid,
  proposalId,
  layoutSettings,
  designViewport,
  selectedBlockPath,
}: {
  block: ExperiencePageBlock;
  onPatch: (patch: Partial<ExperiencePageBlock>) => void;
  onPatchRowColumns?: (columnCount: RowColumnCount, weights?: number[]) => void;
  onPatchContainerGrid?: (
    rows: GridDimension,
    cols: GridDimension,
    options?: { columnWeights?: number[]; rowWeights?: number[] }
  ) => void;
  proposalId?: string;
  layoutSettings: PortalLayoutSettings;
  designViewport?: PreviewViewport;
  selectedBlockPath?: BlockPath;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const shellLayoutPatch = (blockLayout: BlockLayout) =>
    onPatch({ blockLayout } as Partial<ExperiencePageBlock>);

  const nestedInGridCell = (selectedBlockPath?.length ?? 0) >= 2;

  const shellBlockLayout = (shell: Extract<ExperiencePageBlock, { type: "container" | "row" }>) =>
    shell.blockLayout ?? resolveShellBlockLayout(shell, { nestedInGridCell });

  if (isContainerBlock(block)) {
    const { rows, cols } = resolveContainerLayout(block);
    const colWeights = block.columnWeights ?? Array.from({ length: cols }, () => 1);
    const rowWeights = block.rowWeights ?? Array.from({ length: rows }, () => 1);

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-sm">Rows</Label>
            <select
              value={rows}
              onChange={(e) =>
                onPatchContainerGrid?.(
                  parseInt(e.target.value, 10) as GridDimension,
                  cols
                )
              }
              className="atlas-input mt-1 h-8 w-full text-sm"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-sm">Columns</Label>
            <select
              value={cols}
              onChange={(e) =>
                onPatchContainerGrid?.(
                  rows,
                  parseInt(e.target.value, 10) as GridDimension
                )
              }
              className="atlas-input mt-1 h-8 w-full text-sm"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        {cols >= 2 ? (
          <div className="space-y-2">
            <Label className="text-sm">Column widths (relative weights)</Label>
            <div className="grid grid-cols-2 gap-2">
              {colWeights.slice(0, cols).map((weight, index) => (
                <div key={`col-weight-${index}`}>
                  <Label className="text-xs text-atlas-muted">Col {index + 1}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={weight}
                    onChange={(e) => {
                      const next = [...colWeights.slice(0, cols)];
                      next[index] = Math.max(1, parseInt(e.target.value, 10) || 1);
                      onPatchContainerGrid?.(rows, cols, { columnWeights: next });
                    }}
                    className="mt-0.5 h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {rows >= 2 ? (
          <div className="space-y-2">
            <Label className="text-sm">Row heights (relative weights)</Label>
            <div className="grid grid-cols-2 gap-2">
              {rowWeights.slice(0, rows).map((weight, index) => (
                <div key={`row-weight-${index}`}>
                  <Label className="text-xs text-atlas-muted">Row {index + 1}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={weight}
                    onChange={(e) => {
                      const next = [...rowWeights.slice(0, rows)];
                      next[index] = Math.max(1, parseInt(e.target.value, 10) || 1);
                      onPatchContainerGrid?.(rows, cols, { rowWeights: next });
                    }}
                    className="mt-0.5 h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div>
          <Label className="text-sm">Gap</Label>
          <select
            value={block.gap ?? "md"}
            onChange={(e) => onPatch({ gap: e.target.value as RowGap } as Partial<ExperiencePageBlock>)}
            className="atlas-input mt-1 h-8 w-full text-sm"
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </div>
        <LayoutSelect
          label="Cell stretch"
          value={block.cellAlign ?? "stretch"}
          options={[
            ["start", "Top align cells"],
            ["stretch", "Stretch cells to fill"],
          ]}
          onChange={(cellAlign) =>
            onPatch({ cellAlign: cellAlign as "start" | "stretch" } as Partial<ExperiencePageBlock>)
          }
        />
        <BlockLayoutControls
          blockLayout={shellBlockLayout(block)}
          layoutSettings={layoutSettings}
          designViewport={designViewport}
          onPatch={shellLayoutPatch}
        />
      </div>
    );
  }

  if (isRowBlock(block)) {
    const { count, weights } = resolveRowLayout(block);
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-sm">Layout direction</Label>
          <select
            value={block.display ?? "columns"}
            onChange={(e) =>
              onPatch({ display: e.target.value as RowDisplay } as Partial<ExperiencePageBlock>)
            }
            className="atlas-input mt-1 h-8 w-full text-sm"
          >
            <option value="columns">Columns (side by side)</option>
            <option value="rows">Rows (stacked)</option>
          </select>
        </div>
        <div>
          <Label className="text-sm">Column count</Label>
          <select
            value={count}
            onChange={(e) =>
              onPatchRowColumns?.(parseInt(e.target.value, 10) as RowColumnCount)
            }
            className="atlas-input mt-1 h-8 w-full text-sm"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
        {count >= 2 ? (
          <div className="space-y-2">
            <Label className="text-sm">Column widths (relative weights)</Label>
            <div className="grid grid-cols-2 gap-2">
              {weights.map((weight, index) => (
                <div key={`col-weight-${index}`}>
                  <Label className="text-xs text-atlas-muted">Col {index + 1}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={weight}
                    onChange={(e) => {
                      const next = [...weights];
                      next[index] = Math.max(1, parseInt(e.target.value, 10) || 1);
                      onPatchRowColumns?.(count, next);
                    }}
                    className="mt-0.5 h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div>
          <Label className="text-sm">Gap</Label>
          <select
            value={block.gap ?? "md"}
            onChange={(e) => onPatch({ gap: e.target.value as RowGap } as Partial<ExperiencePageBlock>)}
            className="atlas-input mt-1 h-8 w-full text-sm"
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </div>
        <BlockLayoutControls
          blockLayout={shellBlockLayout(block)}
          layoutSettings={layoutSettings}
          designViewport={designViewport}
          onPatch={shellLayoutPatch}
        />
      </div>
    );
  }

  const layoutPatch = (blockLayout: BlockLayout) =>
    onPatch({ blockLayout } as Partial<ExperiencePageBlock>);

  switch (block.type) {
    case "text":
      return (
        <div>
          <Label className="text-sm">Markdown text</Label>
          <MarkdownToolbar
            textareaRef={textareaRef}
            value={block.markdown}
            onChange={(markdown) => onPatch({ markdown } as Partial<ExperiencePageBlock>)}
            className="mt-1"
          />
          <textarea
            ref={textareaRef}
            value={block.markdown}
            onChange={(e) => onPatch({ markdown: e.target.value } as Partial<ExperiencePageBlock>)}
            rows={8}
            className="w-full rounded-b border border-atlas-border/80 bg-atlas-bg px-2 py-1.5 font-mono text-sm"
          />
          <BlockLayoutControls
            blockLayout={block.blockLayout}
            layoutSettings={layoutSettings}
            designViewport={designViewport}
            onPatch={layoutPatch}
          />
        </div>
      );
    case "heading":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Heading text</Label>
            <Input
              value={block.text}
              onChange={(e) => onPatch({ text: e.target.value } as Partial<ExperiencePageBlock>)}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm">Level</Label>
            <select
              value={block.level}
              onChange={(e) =>
                onPatch({
                  level: Number(e.target.value) as 1 | 2 | 3,
                } as Partial<ExperiencePageBlock>)
              }
              className="atlas-input mt-1 h-8 w-full text-sm"
            >
              <option value={1}>H1</option>
              <option value={2}>H2</option>
              <option value={3}>H3</option>
            </select>
          </div>
          <BlockLayoutControls
            blockLayout={block.blockLayout}
            layoutSettings={layoutSettings}
            designViewport={designViewport}
            onPatch={layoutPatch}
          />
        </div>
      );
    case "image":
      return (
        <ImageBlockEditor
          block={block}
          onPatch={onPatch}
          proposalId={proposalId}
          layoutPatch={layoutPatch}
          layoutSettings={layoutSettings}
          designViewport={designViewport}
        />
      );
    case "gallery":
      return (
        <div className="space-y-3">
          <GalleryEditor
            items={block.items}
            onChange={(items) => onPatch({ items } as Partial<ExperiencePageBlock>)}
            proposalId={proposalId}
          />
          <BlockLayoutControls
            blockLayout={block.blockLayout}
            layoutSettings={layoutSettings}
            designViewport={designViewport}
            onPatch={layoutPatch}
          />
        </div>
      );
    case "quote":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Quote text</Label>
            <AutoResizeTextarea
              value={block.text}
              onChange={(value) => onPatch({ text: value } as Partial<ExperiencePageBlock>)}
              minRows={3}
              className="mt-1 w-full rounded border border-atlas-border/80 bg-atlas-bg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm">Attribution</Label>
            <Input
              value={block.attribution ?? ""}
              onChange={(e) =>
                onPatch({ attribution: e.target.value } as Partial<ExperiencePageBlock>)
              }
              className="mt-1 h-8 text-sm"
            />
          </div>
          <BlockLayoutControls
            blockLayout={block.blockLayout}
            layoutSettings={layoutSettings}
            designViewport={designViewport}
            onPatch={layoutPatch}
          />
        </div>
      );
    case "cta":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Button label</Label>
            <Input
              value={block.label}
              onChange={(e) => onPatch({ label: e.target.value } as Partial<ExperiencePageBlock>)}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm">Link URL</Label>
            <Input
              value={block.url}
              onChange={(e) => onPatch({ url: e.target.value } as Partial<ExperiencePageBlock>)}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm">Style</Label>
            <select
              value={block.variant ?? "primary"}
              onChange={(e) =>
                onPatch({
                  variant: e.target.value as "primary" | "secondary",
                } as Partial<ExperiencePageBlock>)
              }
              className="atlas-input mt-1 h-8 w-full text-sm"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>
          </div>
          <BlockLayoutControls
            blockLayout={block.blockLayout}
            layoutSettings={layoutSettings}
            designViewport={designViewport}
            onPatch={layoutPatch}
          />
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          <MediaUploadField
            label="Video"
            value={block.url}
            onChange={(url) => onPatch({ url: url ?? "" } as Partial<ExperiencePageBlock>)}
            proposalId={proposalId}
          />
          <MediaUploadField
            label="Poster image"
            value={block.posterUrl ?? ""}
            onChange={(posterUrl) => onPatch({ posterUrl } as Partial<ExperiencePageBlock>)}
            proposalId={proposalId}
          />
          <div>
            <Label className="text-sm">Caption</Label>
            <Input
              value={block.caption ?? ""}
              onChange={(e) =>
                onPatch({ caption: e.target.value } as Partial<ExperiencePageBlock>)
              }
              className="mt-1 h-8 text-sm"
            />
          </div>
          <BlockLayoutControls
            blockLayout={block.blockLayout}
            layoutSettings={layoutSettings}
            designViewport={designViewport}
            onPatch={layoutPatch}
          />
        </div>
      );
    case "html":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Custom HTML</Label>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
              Use for custom layout, CSS, animations, or iframe embeds (YouTube, maps, forms).
              HTML can affect mobile layout and performance — test on both desktop and mobile
              viewports.
            </p>
            <textarea
              value={block.html}
              onChange={(e) => onPatch({ html: e.target.value } as Partial<ExperiencePageBlock>)}
              rows={12}
              className="atlas-input mt-2 w-full font-mono text-sm"
              spellCheck={false}
            />
          </div>
          <BlockLayoutControls
            blockLayout={block.blockLayout}
            layoutSettings={layoutSettings}
            designViewport={designViewport}
            onPatch={layoutPatch}
          />
        </div>
      );
    case "spacer":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Spacer size</Label>
            <select
              value={block.size ?? "md"}
              onChange={(e) =>
                onPatch({ size: e.target.value as "sm" | "md" | "lg" } as Partial<ExperiencePageBlock>)
              }
              className="atlas-input mt-1 h-8 w-full text-sm"
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>
          <BlockLayoutControls
            blockLayout={block.blockLayout}
            layoutSettings={layoutSettings}
            designViewport={designViewport}
            onPatch={layoutPatch}
          />
        </div>
      );
    default:
      return null;
  }
}

function ImageBlockEditor({
  block,
  onPatch,
  proposalId,
  layoutPatch,
  layoutSettings,
  designViewport,
}: {
  block: Extract<ExperiencePageBlock, { type: "image" }>;
  onPatch: (patch: Partial<ExperiencePageBlock>) => void;
  proposalId?: string;
  layoutPatch: (layout: BlockLayout) => void;
  layoutSettings: PortalLayoutSettings;
  designViewport?: PreviewViewport;
}) {
  const [cropOpen, setCropOpen] = useState(false);
  const imageSize = resolveImageDisplaySize(block);

  return (
    <div className="space-y-3">
      <MediaUploadField
        label="Image"
        value={block.url}
        onChange={(url) => onPatch({ url: url ?? "" } as Partial<ExperiencePageBlock>)}
        proposalId={proposalId}
        browseContent
      />
      <div>
        <Label className="text-sm">Size</Label>
        <select
          value={imageSize}
          onChange={(e) =>
            onPatch({ imageSize: e.target.value as ImageDisplaySize } as Partial<ExperiencePageBlock>)
          }
          className="atlas-input mt-1 h-8 w-full text-sm"
        >
          <option value="icon">Icon</option>
          <option value="small">Small</option>
          <option value="fit">Fit</option>
          <option value="large">Large</option>
        </select>
      </div>
      {block.url ? (
        <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => setCropOpen(true)}>
          Edit Image
        </Button>
      ) : null}
      <div>
        <Label className="text-sm">Alt text</Label>
        <Input
          value={block.alt ?? ""}
          onChange={(e) => onPatch({ alt: e.target.value } as Partial<ExperiencePageBlock>)}
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-sm">Caption</Label>
        <Input
          value={block.caption ?? ""}
          onChange={(e) => onPatch({ caption: e.target.value } as Partial<ExperiencePageBlock>)}
          className="mt-1 h-8 text-sm"
        />
      </div>
      <ImageLayoutControls
        blockLayout={block.blockLayout}
        layoutSettings={layoutSettings}
        designViewport={designViewport}
        onPatch={layoutPatch}
      />
      <PortalDesignerImageCropModal
        open={cropOpen}
        imageUrl={block.url}
        crop={block.crop}
        cropAspectRatio={block.cropAspectRatio}
        onClose={() => setCropOpen(false)}
        onSave={(next) =>
          onPatch({
            crop: next.crop,
            cropAspectRatio: next.cropAspectRatio,
          } as Partial<ExperiencePageBlock>)
        }
      />
    </div>
  );
}
