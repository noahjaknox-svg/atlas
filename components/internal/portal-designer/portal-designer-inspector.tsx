"use client";
import { createContext, useContext } from "react";
import {
  describeInheritedAlign,
  describeInheritedWidth,
  resolveInheritedFor,
  type InheritedLayout,
} from "@/lib/page-layout-inheritance";
import { DEFAULT_PANEL_OPACITY, resolvePanelOpacity } from "@/lib/portal-layout-settings";
import type { PageLayout } from "@/lib/experience-content";

import { useRef, useState } from "react";
import { ROUTES } from "@/lib/routes";
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
import { htmlHasAnimation, updateContainerGrid, updateRowColumns } from "@/lib/page-blocks-utils";
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

/** Flags that motion isn't guaranteed for every viewer, and what they'll see instead. */
function AnimationNotice({ kind }: { kind: "block" | "html" }) {
  return (
    <p
      role="note"
      className="mt-2 rounded border border-amber-300/30 bg-amber-300/10 px-2 py-1.5 text-xs leading-relaxed text-amber-100/90"
    >
      {kind === "block" ? (
        <>
          <strong>Animated.</strong> Viewers with reduced motion turned on, older browsers, and
          PDF/print see the finished state (final numbers and bars) with no animation — check it
          reads well that way.
        </>
      ) : (
        <>
          <strong>Contains CSS animation.</strong> It won&apos;t play for viewers with reduced
          motion, in some browsers, or in PDF/print. Make sure the un-animated state still makes
          sense, or use an Image block with a static picture instead.
        </>
      )}
    </p>
  );
}

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
  usageTypes,
  onBackToPage,
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
  usageTypes?: { id: string; name: string }[];
  /** Deselect the block to return to the page's settings. */
  onBackToPage?: () => void;
}) {
  // What the selected element inherits (page → container → element), for the "Inherit (…)" options.
  const inheritedLayout = selectedBlock
    ? resolveInheritedFor(
        section.contentBlocks?.pageBlocks ?? [],
        selectedBlockPath ?? [],
        section.contentBlocks?.pageLayout
      )
    : null;
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
        {!selectedBlock ? (
          <>
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

            {usageTypes && usageTypes.length > 0 ? (
              <div>
                <Label className="text-sm">Usage types</Label>
                <p className="mt-0.5 text-sm text-atlas-text">
                  {(section.usageTypeIds ?? []).length === 0
                    ? "All usage types"
                    : usageTypes
                        .filter((ut) => section.usageTypeIds?.includes(ut.id))
                        .map((ut) => ut.name)
                        .join(", ") || "All usage types"}
                </p>
                <p className="mt-0.5 text-xs text-atlas-muted">
                  Set in{" "}
                  <a
                    href={`${ROUTES.dataWarehouse.data}?tab=usage-types`}
                    className="text-atlas-accent hover:underline"
                  >
                    Data Warehouse → Usage Types → Portal pages
                  </a>
                  .
                </p>
              </div>
            ) : null}

            <PageLayoutControls
              pageLayout={section.contentBlocks?.pageLayout}
              layoutSettings={layoutSettings}
              onChange={(pageLayout) => {
                const next = { ...(section.contentBlocks ?? {}) };
                if (pageLayout && Object.keys(pageLayout).length > 0) next.pageLayout = pageLayout;
                else delete next.pageLayout;
                onPatchSection({ contentBlocks: next });
              }}
            />

            <p className="text-sm text-atlas-muted">
              Select a block in the preview or block list to edit its content.
            </p>
          </>
        ) : null}

        {selectedBlock ? (
          <>
            {onBackToPage ? (
              <button
                type="button"
                onClick={onBackToPage}
                className="text-xs text-atlas-accent hover:underline"
              >
                ← Page settings
              </button>
            ) : null}
            {blockWarnings.length > 0 ? (
              <ul className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-200">
                {blockWarnings.map((w, i) => (
                  <li key={`${w.kind}-${i}`}>{w.message}</li>
                ))}
              </ul>
            ) : null}
            <InheritedLayoutContext.Provider value={inheritedLayout}>
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
            </InheritedLayoutContext.Provider>
          </>
        ) : null}
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

/** What the selected element inherits (page → container → element), for the "Inherit (…)" options. */
const InheritedLayoutContext = createContext<{ nested: boolean; inherited: InheritedLayout } | null>(null);

function hasExplicitWidth(layout: BlockLayout | undefined): boolean {
  return !!(layout?.widthDesktop || layout?.widthMobile || layout?.width);
}

function withoutKeys<T extends object>(obj: T | undefined, ...keys: (keyof T)[]): T {
  const next = { ...(obj ?? {}) } as T;
  for (const k of keys) delete next[k];
  return next;
}

function HorizontalAlignSelect({
  blockLayout,
  onPatch,
}: {
  blockLayout?: BlockLayout;
  onPatch: (layout: BlockLayout) => void;
}) {
  const ctx = useContext(InheritedLayoutContext);
  return (
    <LayoutSelect
      label="Horizontal align"
      value={blockLayout?.align ?? ""}
      inheritLabel={ctx ? `Inherit (${describeInheritedAlign(ctx.inherited)})` : undefined}
      options={[
        ["left", "Left"],
        ["center", "Center"],
        ["right", "Right"],
      ]}
      onChange={(align) =>
        onPatch(align === "" ? withoutKeys(blockLayout, "align") : { ...blockLayout, align: align as BlockAlign })
      }
    />
  );
}

/** Optional translucent panel behind an element. Opacity: its own, else the branding default. */
function PanelControls({
  blockLayout,
  layoutSettings,
  onPatch,
}: {
  blockLayout?: BlockLayout;
  layoutSettings: PortalLayoutSettings;
  onPatch: (layout: BlockLayout) => void;
}) {
  const defaultOpacity = layoutSettings.panelOpacity ?? DEFAULT_PANEL_OPACITY;
  const overridden = blockLayout?.panelOpacity != null;
  const opacity = resolvePanelOpacity(blockLayout, layoutSettings);
  return (
    <div className="space-y-1.5 border-t border-atlas-border/40 pt-2">
      <label className="flex items-center gap-2 text-sm text-atlas-text">
        <input
          type="checkbox"
          aria-label="Panel behind this element"
          checked={!!blockLayout?.panel}
          onChange={(e) =>
            onPatch(e.target.checked ? { ...blockLayout, panel: true } : withoutKeys(blockLayout, "panel", "panelOpacity"))
          }
          className="accent-atlas-accent"
        />
        Panel behind this element
      </label>
      {blockLayout?.panel ? (
        <div>
          <div className="flex items-center justify-between text-xs text-atlas-muted">
            <span>Panel opacity</span>
            <span>
              {opacity}%{overridden ? "" : " (default)"}
            </span>
          </div>
          <input
            type="range"
            aria-label="Panel opacity"
            min={0}
            max={100}
            step={5}
            value={opacity}
            onChange={(e) => onPatch({ ...blockLayout, panelOpacity: Number(e.target.value) })}
            className="w-full accent-atlas-accent"
          />
          {overridden ? (
            <button
              type="button"
              onClick={() => onPatch(withoutKeys(blockLayout, "panelOpacity"))}
              className="text-xs text-atlas-accent hover:underline"
            >
              Use default ({defaultOpacity}%)
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The page's own layout: the first default every element on the page inherits. */
function PageLayoutControls({
  pageLayout,
  layoutSettings,
  onChange,
}: {
  pageLayout?: PageLayout;
  layoutSettings: PortalLayoutSettings;
  onChange: (next: PageLayout | undefined) => void;
}) {
  const presetOptions = layoutSettings.widthPresets.map((p) => [p.id, p.label] as [string, string]);
  const defaultLabel = layoutSettings.widthPresets.find((p) => p.id === layoutSettings.defaultPresetId)?.label ?? "Normal";
  const set = (key: keyof PageLayout, value: string) => {
    const next: PageLayout = { ...(pageLayout ?? {}) };
    if (value === "") delete next[key];
    else (next as Record<string, string>)[key] = value;
    onChange(Object.keys(next).length > 0 ? next : undefined);
  };
  return (
    <div className="space-y-2 rounded border border-atlas-border/60 bg-atlas-bg/30 p-2" aria-label="Page layout" role="group">
      <p className="text-sm font-medium text-atlas-muted">Page layout</p>
      <p className="text-xs text-atlas-muted">
        Width and alignment for everything on this page. Elements inside a container fill it; any
        element can override these.
      </p>
      <LayoutSelect
        label="Page desktop width"
        value={pageLayout?.widthDesktop ?? ""}
        inheritLabel={`Default (${defaultLabel})`}
        options={presetOptions}
        onChange={(v) => set("widthDesktop", v)}
      />
      <LayoutSelect
        label="Page mobile width"
        value={pageLayout?.widthMobile ?? ""}
        inheritLabel={`Default (${defaultLabel})`}
        options={presetOptions}
        onChange={(v) => set("widthMobile", v)}
      />
      <LayoutSelect
        label="Page horizontal align"
        value={pageLayout?.align ?? ""}
        inheritLabel="Default (Center)"
        options={[
          ["left", "Left"],
          ["center", "Center"],
          ["right", "Right"],
        ]}
        onChange={(v) => set("align", v)}
      />
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
  const ctx = useContext(InheritedLayoutContext);
  // Nothing set on the element itself (or a legacy width) = inherit.
  const explicit = hasExplicitWidth(blockLayout);
  const inheritLabel = (viewport: "desktop" | "mobile") =>
    ctx ? `Inherit (${describeInheritedWidth(ctx.inherited, ctx.nested, viewport, layoutSettings)})` : undefined;

  return (
    <>
      <LayoutSelect
        label="Desktop width"
        value={explicit ? resolveBlockWidthPresetId(blockLayout, "desktop", layoutSettings) : ""}
        inheritLabel={inheritLabel("desktop")}
        options={presetOptions}
        highlighted={designViewport === "desktop"}
        onChange={(widthDesktop) =>
          onPatch(
            widthDesktop === ""
              ? withoutKeys(blockLayout, "widthDesktop", "width")
              : { ...withoutKeys(blockLayout, "width"), widthDesktop }
          )
        }
      />
      <LayoutSelect
        label="Mobile width"
        value={explicit ? resolveBlockWidthPresetId(blockLayout, "mobile", layoutSettings) : ""}
        inheritLabel={inheritLabel("mobile")}
        options={presetOptions}
        highlighted={designViewport === "mobile"}
        onChange={(widthMobile) =>
          onPatch(
            widthMobile === ""
              ? withoutKeys(blockLayout, "widthMobile", "width")
              : { ...withoutKeys(blockLayout, "width"), widthMobile }
          )
        }
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
        <HorizontalAlignSelect blockLayout={blockLayout} onPatch={onPatch} />
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
        <PanelControls blockLayout={blockLayout} layoutSettings={layoutSettings} onPatch={onPatch} />
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
        <HorizontalAlignSelect blockLayout={blockLayout} onPatch={onPatch} />
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
        <PanelControls blockLayout={blockLayout} layoutSettings={layoutSettings} onPatch={onPatch} />
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
  inheritLabel,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
  highlighted?: boolean;
  /** When set, adds a first "Inherit (…)" option whose value is "" (clears the element's own setting). */
  inheritLabel?: string;
}) {
  return (
    <div className={cn(highlighted && "rounded-md ring-1 ring-atlas-accent/40")}>
      <Label className="text-sm">{label}</Label>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="atlas-input mt-0.5 h-7 w-full text-sm"
      >
        {inheritLabel ? <option value="">{inheritLabel}</option> : null}
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
    shell.blockLayout ?? resolveShellBlockLayout(shell, { nestedInGridCell: false });

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
        <label className="flex items-center gap-2 text-sm text-atlas-text">
          <input
            type="checkbox"
            aria-label="Card behind each cell"
            checked={!!block.cellCardStyle}
            onChange={(e) =>
              onPatch({ cellCardStyle: e.target.checked } as Partial<ExperiencePageBlock>)
            }
            className="accent-atlas-accent"
          />
          Card behind each cell
        </label>
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
        <label className="flex items-center gap-2 text-sm text-atlas-text">
          <input
            type="checkbox"
            aria-label="Card behind each cell"
            checked={!!block.cellCardStyle}
            onChange={(e) =>
              onPatch({ cellCardStyle: e.target.checked } as Partial<ExperiencePageBlock>)
            }
            className="accent-atlas-accent"
          />
          Card behind each cell
        </label>
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
    case "stat":
      return (
        <div className="space-y-3">
          <AnimationNotice kind="block" />
          <div>
            <Label className="text-sm">Value</Label>
            <Input
              value={block.value}
              onChange={(e) => onPatch({ value: e.target.value } as Partial<ExperiencePageBlock>)}
              placeholder="100+"
              className="mt-1 h-8 text-sm"
            />
            <p className="mt-1 text-xs text-atlas-muted">
              The first number counts up (e.g. 100+, $2.4M, 15%).
            </p>
          </div>
          <div>
            <Label className="text-sm">Label</Label>
            <Input
              value={block.label}
              onChange={(e) => onPatch({ label: e.target.value } as Partial<ExperiencePageBlock>)}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.countUp !== false}
              onChange={(e) => onPatch({ countUp: e.target.checked } as Partial<ExperiencePageBlock>)}
            />
            Count up when scrolled into view
          </label>
          <BlockLayoutControls
            blockLayout={block.blockLayout}
            layoutSettings={layoutSettings}
            designViewport={designViewport}
            onPatch={layoutPatch}
          />
        </div>
      );
    case "blockVsFlight":
      return (
        <div className="space-y-3">
          <AnimationNotice kind="block" />
          <p className="text-xs leading-relaxed text-atlas-muted">
            Charter payback bars: taxi-to-taxi (block) vs wheels-up (flight) time. Leave hours
            blank to use each proposal&apos;s own aircraft numbers.
          </p>
          {(["blockHours", "flightHours"] as const).map((key) => (
            <div key={key}>
              <Label className="text-sm">
                {key === "blockHours" ? "Block hours (optional)" : "Flight hours (optional)"}
              </Label>
              <Input
                type="number"
                min={0}
                value={block[key] ?? ""}
                placeholder="From the proposal"
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  onPatch({ [key]: Number.isFinite(n) && n > 0 ? n : null } as Partial<ExperiencePageBlock>);
                }}
                className="mt-1 h-8 text-sm"
              />
            </div>
          ))}
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
              Use for custom layout, CSS, or iframe embeds (YouTube, maps, forms). Scripts are
              removed. HTML can affect mobile layout and performance — test on both desktop and
              mobile viewports.
            </p>
            {htmlHasAnimation(block.html) ? <AnimationNotice kind="html" /> : null}
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
