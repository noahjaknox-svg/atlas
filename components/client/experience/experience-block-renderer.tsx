"use client";

import { useDraggable } from "@dnd-kit/core";
import type { ExperiencePageBlock } from "@/lib/experience-content";
import { ExperienceMarkdown } from "@/lib/experience-markdown";
import type { PortalVariableContext } from "@/lib/portal-variables";
import { resolvePortalVariables } from "@/lib/portal-variables";
import type { CSSProperties } from "react";
import {
  containerGridProps,
  getBlockPaddingClass,
  getLeafHorizontalJustifyClass,
  getLeafTextAlignClass,
  getLeafVerticalJustifyClass,
  isShrinkWrapLeafBlock,
  isContainerBlock,
  isRowBlock,
  resolveContainerLayout,
  rowGridProps,
  type BlockPath,
  type RowColumnLayout,
} from "@/lib/portal-block-layout";
import {
  BLOCK_WIDTH_RESPONSIVE_CLASS,
  blockWidthStyleVars,
  DEFAULT_LAYOUT_SETTINGS,
  isBlockVisibleInViewport,
  visibilityClasses,
  type PortalLayoutSettings,
} from "@/lib/portal-layout-settings";
import type { BlockLayout } from "@/lib/experience-content";
import { sanitizePortalHtml } from "@/lib/sanitize-portal-html";
import { ExperienceGallery } from "./experience-gallery";
import { resolveImageDisplaySize } from "@/lib/experience-image-system";
import { PortalDesignerEmptyBlockPlaceholder } from "@/components/internal/portal-designer/portal-designer-empty-block-placeholder";
import { ProposalImage } from "./proposal-image";
import { PullQuote } from "./pull-quote";
import { cn } from "@/lib/utils";
import {
  PortalDesignerInsertionZone,
  insertionZoneId,
} from "@/components/internal/portal-designer/portal-designer-insertion-zone";
import type { PreviewViewport } from "@/components/internal/portal-designer/portal-designer-types";

const SPACER_CLASS: Record<NonNullable<Extract<ExperiencePageBlock, { type: "spacer" }>["size"]>, string> = {
  sm: "h-4",
  md: "h-8",
  lg: "h-12",
};

function resolveBlock(
  block: ExperiencePageBlock,
  variableContext?: PortalVariableContext
): ExperiencePageBlock {
  if (!variableContext) return block;
  if (block.type === "text") {
    return { ...block, markdown: resolvePortalVariables(block.markdown, variableContext) };
  }
  if (block.type === "heading") {
    return { ...block, text: resolvePortalVariables(block.text, variableContext) };
  }
  if (block.type === "quote") {
    return {
      ...block,
      text: resolvePortalVariables(block.text, variableContext),
      attribution: block.attribution
        ? resolvePortalVariables(block.attribution, variableContext)
        : undefined,
    };
  }
  if (block.type === "cta") {
    return { ...block, label: resolvePortalVariables(block.label, variableContext) };
  }
  if (isContainerBlock(block)) {
    return {
      ...block,
      cells: block.cells.map((row) =>
        row.map((cell) => cell.map((child) => resolveBlock(child, variableContext)))
      ),
    };
  }
  if (isRowBlock(block)) {
    return {
      ...block,
      columns: block.columns.map((col) =>
        col.map((child) => resolveBlock(child, variableContext))
      ),
    };
  }
  return block;
}

function gridLayoutForDesigner(
  showDesign: boolean,
  designViewport?: PreviewViewport
): RowColumnLayout {
  if (showDesign) {
    return designViewport === "mobile" ? "stacked" : "horizontal";
  }
  return "responsive";
}

function isInsideGridCell(containerPath: BlockPath): boolean {
  return containerPath.length >= 2;
}

function LeafBlockLayoutFrame({
  blockLayout,
  layoutSettings,
  inGridCell,
  shrinkWrap = false,
  children,
}: {
  blockLayout?: BlockLayout;
  layoutSettings: PortalLayoutSettings;
  inGridCell: boolean;
  shrinkWrap?: boolean;
  children: React.ReactNode;
}) {
  const hAlign = blockLayout?.align ?? "left";
  const vAlign = blockLayout?.verticalAlign ?? "top";

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col",
        inGridCell && "min-h-0 flex-1",
        getLeafVerticalJustifyClass(vAlign),
        getBlockPaddingClass(blockLayout?.padding)
      )}
    >
      <div className={cn("flex w-full min-w-0", getLeafHorizontalJustifyClass(hAlign))}>
        <div
          className={cn(
            "min-w-0",
            shrinkWrap ? "w-auto max-w-full" : BLOCK_WIDTH_RESPONSIVE_CLASS,
            !shrinkWrap && getLeafTextAlignClass(hAlign)
          )}
          style={blockWidthStyleVars(blockLayout, layoutSettings)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function renderLeafContent(block: ExperiencePageBlock, designMode = false): React.ReactNode {
  switch (block.type) {
    case "heading": {
      const Tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
      const size =
        block.level === 1
          ? "font-serif text-2xl text-atlas-text sm:text-3xl"
          : block.level === 2
            ? "font-serif text-xl text-atlas-text sm:text-2xl"
            : "font-serif text-lg text-atlas-text sm:text-xl";
      return <Tag className={cn(size, "leading-tight")}>{block.text}</Tag>;
    }
    case "text":
      return <ExperienceMarkdown>{block.markdown}</ExperienceMarkdown>;
    case "image": {
      const imageSize = resolveImageDisplaySize(block);
      if (designMode && !block.url?.trim()) {
        return <PortalDesignerEmptyBlockPlaceholder type="image" imageSize={imageSize} />;
      }
      const focal =
        block.focalPoint != null
          ? `${block.focalPoint.x}% ${block.focalPoint.y}%`
          : undefined;
      return (
        <ProposalImage
          src={block.url}
          alt={block.alt ?? block.caption ?? ""}
          caption={block.caption}
          imageSize={imageSize}
          objectPosition={focal}
          crop={block.crop}
          cropAspectRatio={block.cropAspectRatio}
          sizing="intrinsic"
        />
      );
    }
    case "gallery":
      return (
        <ExperienceGallery
          items={block.items}
          layout={block.layout ?? "editorialPair"}
          designMode={designMode}
        />
      );
    case "html":
      return (
        <div
          className="portal-custom-html"
          dangerouslySetInnerHTML={{ __html: sanitizePortalHtml(block.html) }}
        />
      );
    case "spacer":
      return <div className={SPACER_CLASS[block.size ?? "md"]} aria-hidden />;
    case "quote":
      return <PullQuote text={block.text} attribution={block.attribution} />;
    case "cta": {
      const variant = block.variant ?? "primary";
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium transition-colors",
            variant === "primary"
              ? "bg-atlas-accent text-atlas-bg hover:bg-atlas-accent/90"
              : "border border-atlas-accent/60 text-atlas-accent hover:bg-atlas-accent/10"
          )}
        >
          {block.label}
        </a>
      );
    }
    case "video":
      if (designMode && !block.url?.trim()) {
        return <PortalDesignerEmptyBlockPlaceholder type="video" />;
      }
      return (
        <figure>
          <video
            src={block.url}
            poster={block.posterUrl || undefined}
            controls
            playsInline
            className="w-full rounded-lg"
          />
          {block.caption ? (
            <figcaption className="mt-2 text-center text-sm text-atlas-muted">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    default:
      return null;
  }
}

function DesignBlockShell({
  block,
  path,
  selectedBlockId,
  onSelectBlock,
  onBlockContextMenu,
  children,
  className,
  fillCell,
}: {
  block: ExperiencePageBlock;
  path: BlockPath;
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
  onBlockContextMenu?: (e: React.MouseEvent, block: ExperiencePageBlock, path: BlockPath) => void;
  children: React.ReactNode;
  className?: string;
  fillCell?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id,
    data: { path, blockId: block.id },
  });
  const isSelected = selectedBlockId === block.id;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative pl-7",
        fillCell && "flex min-h-0 flex-1 flex-col",
        isDragging && "opacity-40"
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="absolute bottom-0 left-0 top-0 z-10 flex w-6 min-h-[44px] cursor-grab items-center justify-center rounded-l-lg bg-atlas-bg/80 text-atlas-muted active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        {...listeners}
        {...attributes}
      >
        <span className="text-[10px] leading-none" aria-hidden>
          ⋮⋮
        </span>
      </button>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectBlock?.(block.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onBlockContextMenu?.(e, block, path);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectBlock?.(block.id);
          }
        }}
        className={cn(
          "w-full cursor-pointer rounded-lg text-left transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent",
          fillCell && "flex min-h-0 flex-1 flex-col",
          isSelected
            ? "ring-2 ring-atlas-accent ring-offset-2 ring-offset-[#0B0F1A]"
            : "hover:ring-1 hover:ring-white/20",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

function BlockShell({
  block,
  selectedBlockId,
  onSelectBlock,
  previewMode,
  children,
  className,
  fillCell,
}: {
  block: ExperiencePageBlock;
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
  previewMode?: boolean;
  children: React.ReactNode;
  className?: string;
  fillCell?: boolean;
}) {
  const selectable = previewMode && onSelectBlock;
  const isSelected = selectedBlockId === block.id;

  if (selectable) {
    return (
      <button
        type="button"
        onClick={() => onSelectBlock?.(block.id)}
        className={cn(
          "rounded-lg text-left transition-shadow",
          fillCell && "flex min-h-0 flex-1 flex-col",
          isSelected
            ? "ring-2 ring-atlas-accent ring-offset-2 ring-offset-[#0B0F1A]"
            : "hover:ring-1 hover:ring-white/20",
          className
        )}
      >
        {children}
      </button>
    );
  }

  return <div className={cn(fillCell && "flex min-h-0 flex-1 flex-col", className)}>{children}</div>;
}

function renderContainerCells({
  block,
  blockPath,
  layout,
  showDesign,
  ...rendererProps
}: {
  block: Extract<ExperiencePageBlock, { type: "container" }>;
  blockPath: BlockPath;
  layout: RowColumnLayout;
  showDesign: boolean;
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
  previewMode?: boolean;
  designMode?: boolean;
  designViewport?: PreviewViewport;
  onBlockContextMenu?: (e: React.MouseEvent, block: ExperiencePageBlock, path: BlockPath) => void;
  variableContext?: PortalVariableContext;
  layoutSettings?: PortalLayoutSettings;
}) {
  const { rows, cols } = resolveContainerLayout(block, layout);
  const cells: React.ReactNode[] = [];
  const stretchCells = layout !== "stacked";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellBlocks = block.cells[r]?.[c] ?? [];
      const cellPath = [...blockPath, r, c];
      cells.push(
        <div
          key={`${block.id}-r${r}-c${c}`}
          className={cn(
            "flex min-w-0 flex-col gap-4",
            stretchCells ? "h-full min-h-0" : "min-h-0"
          )}
        >
          {showDesign && cellBlocks.length === 0 ? (
            <PortalDesignerInsertionZone
              zoneId={insertionZoneId(cellPath, 0)}
              emptyColumn
            />
          ) : null}
          <ExperienceBlockRenderer
            blocks={cellBlocks}
            containerPath={cellPath}
            {...rendererProps}
          />
        </div>
      );
    }
  }

  const gridProps = containerGridProps(block, layout, { contentSizedRows: showDesign });
  return (
    <div {...gridProps} style={gridProps.style as CSSProperties}>
      {cells}
    </div>
  );
}

export function ExperienceBlockRenderer({
  blocks,
  selectedBlockId,
  onSelectBlock,
  previewMode = false,
  designMode = false,
  designViewport,
  onBlockContextMenu,
  containerPath = [],
  variableContext,
  layoutSettings = DEFAULT_LAYOUT_SETTINGS,
}: {
  blocks: ExperiencePageBlock[];
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
  previewMode?: boolean;
  designMode?: boolean;
  designViewport?: PreviewViewport;
  onBlockContextMenu?: (e: React.MouseEvent, block: ExperiencePageBlock, path: BlockPath) => void;
  containerPath?: BlockPath;
  variableContext?: PortalVariableContext;
  layoutSettings?: PortalLayoutSettings;
}) {
  const showDesign = designMode && previewMode;
  const gridLayout = gridLayoutForDesigner(showDesign, designViewport);
  const inGridCell = isInsideGridCell(containerPath);
  const allowVerticalAlign = inGridCell && blocks.length === 1;
  const designLayoutViewport = designViewport === "mobile" ? "mobile" : "desktop";

  const childProps = {
    selectedBlockId,
    onSelectBlock,
    previewMode,
    designMode,
    designViewport,
    onBlockContextMenu,
    variableContext,
    layoutSettings,
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:gap-6",
        inGridCell && "min-h-0 flex-1"
      )}
    >
      {showDesign ? (
        <PortalDesignerInsertionZone zoneId={insertionZoneId(containerPath, 0)} />
      ) : null}
      {blocks.map((rawBlock, blockIndex) => {
        const block = resolveBlock(rawBlock, variableContext);
        const blockPath = [...containerPath, blockIndex];

        if (isContainerBlock(block)) {
          const { wrapperClass } = resolveContainerLayout(block, gridLayout);
          const gridContent = renderContainerCells({
            block,
            blockPath,
            layout: gridLayout,
            showDesign,
            ...childProps,
          });

          const shell = showDesign ? (
            <DesignBlockShell
              block={block}
              path={blockPath}
              selectedBlockId={selectedBlockId}
              onSelectBlock={onSelectBlock}
              onBlockContextMenu={onBlockContextMenu}
              className={wrapperClass}
            >
              {gridContent}
            </DesignBlockShell>
          ) : (
            <BlockShell
              block={block}
              selectedBlockId={selectedBlockId}
              onSelectBlock={onSelectBlock}
              previewMode={previewMode}
              className={wrapperClass}
            >
              {gridContent}
            </BlockShell>
          );

          return (
            <div key={block.id}>
              {shell}
              {showDesign ? (
                <PortalDesignerInsertionZone zoneId={insertionZoneId(containerPath, blockIndex + 1)} />
              ) : null}
            </div>
          );
        }

        if (isRowBlock(block)) {
          const rowLayout =
            block.display === "rows" ? "stacked" : gridLayout;
          const gridProps = rowGridProps(block, rowLayout);
          const stretchRowCells = rowLayout !== "stacked";
          const rowColumnClass = cn(
            "flex min-w-0 flex-col gap-4",
            stretchRowCells ? "h-full min-h-0" : "min-h-0"
          );
          const shell = showDesign ? (
            <DesignBlockShell
              block={block}
              path={blockPath}
              selectedBlockId={selectedBlockId}
              onSelectBlock={onSelectBlock}
              onBlockContextMenu={onBlockContextMenu}
            >
              <div {...gridProps} style={gridProps.style as CSSProperties}>
                {block.columns.map((column, colIndex) => (
                  <div key={`${block.id}-col-${colIndex}`} className={rowColumnClass}>
                    {showDesign && column.length === 0 ? (
                      <PortalDesignerInsertionZone
                        zoneId={insertionZoneId([...blockPath, colIndex], 0)}
                        emptyColumn
                      />
                    ) : null}
                    <ExperienceBlockRenderer
                      blocks={column}
                      containerPath={[...blockPath, colIndex]}
                      {...childProps}
                    />
                  </div>
                ))}
              </div>
            </DesignBlockShell>
          ) : (
            <BlockShell
              block={block}
              selectedBlockId={selectedBlockId}
              onSelectBlock={onSelectBlock}
              previewMode={previewMode}
            >
              <div {...gridProps} style={gridProps.style as CSSProperties}>
                {block.columns.map((column, colIndex) => (
                  <div key={`${block.id}-col-${colIndex}`} className={rowColumnClass}>
                    <ExperienceBlockRenderer
                      blocks={column}
                      containerPath={[...blockPath, colIndex]}
                      {...childProps}
                    />
                  </div>
                ))}
              </div>
            </BlockShell>
          );

          return (
            <div key={block.id}>
              {shell}
              {showDesign ? (
                <PortalDesignerInsertionZone zoneId={insertionZoneId(containerPath, blockIndex + 1)} />
              ) : null}
            </div>
          );
        }

        const blockLayout = "blockLayout" in block ? block.blockLayout : undefined;

        if (
          showDesign &&
          !isBlockVisibleInViewport(
            blockLayout?.visibility,
            designLayoutViewport,
            true
          )
        ) {
          return null;
        }

        const framedContent = (
          <LeafBlockLayoutFrame
            blockLayout={blockLayout}
            layoutSettings={layoutSettings}
            inGridCell={allowVerticalAlign}
            shrinkWrap={isShrinkWrapLeafBlock(block)}
          >
            {renderLeafContent(block, showDesign ? designMode : false)}
          </LeafBlockLayoutFrame>
        );

        const leaf = showDesign ? (
          <DesignBlockShell
            block={block}
            path={blockPath}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
            onBlockContextMenu={onBlockContextMenu}
            fillCell={allowVerticalAlign}
          >
            {framedContent}
          </DesignBlockShell>
        ) : (
          <BlockShell
            block={block}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
            previewMode={previewMode}
            fillCell={allowVerticalAlign}
          >
            {framedContent}
          </BlockShell>
        );

        return (
          <div
            key={block.id}
            className={cn(
              inGridCell && "flex min-h-0 w-full flex-col",
              allowVerticalAlign && "min-h-0 flex-1",
              !showDesign && visibilityClasses(blockLayout?.visibility)
            )}
          >
            {leaf}
            {showDesign ? (
              <PortalDesignerInsertionZone zoneId={insertionZoneId(containerPath, blockIndex + 1)} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function sectionHasPageBlocks(
  section: { contentBlocks?: { pageBlocks?: ExperiencePageBlock[] } | null }
): boolean {
  return (section.contentBlocks?.pageBlocks?.length ?? 0) > 0;
}
