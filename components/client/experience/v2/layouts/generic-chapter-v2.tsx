"use client";

import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import type { PortalVariableContext } from "@/lib/portal-variables";
import { resolvePortalVariables } from "@/lib/portal-variables";
import { ExperienceBlockRenderer } from "../../experience-block-renderer";
import { ExperienceSlideV2 } from "./experience-slide-v2";
import { ChapterStagger, ChapterStaggerItem } from "../chapter-transition";
import { ChapterHeader } from "../chapter-layout-primitives";

import type { BlockPath } from "@/lib/portal-block-layout";
import type { ExperiencePageBlock } from "@/lib/experience-content";
import type { PreviewViewport } from "@/components/internal/portal-designer/portal-designer-types";
import type { PortalLayoutSettings } from "@/lib/portal-layout-settings";

export function GenericChapterV2({
  section,
  variableContext,
  selectedBlockId,
  onSelectBlock,
  previewMode = false,
  designMode = false,
  designViewport,
  onBlockContextMenu,
  layoutSettings,
}: {
  section: ExperienceSectionSnapshot;
  variableContext?: PortalVariableContext;
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
  previewMode?: boolean;
  designMode?: boolean;
  designViewport?: PreviewViewport;
  onBlockContextMenu?: (
    e: React.MouseEvent,
    block: ExperiencePageBlock,
    path: BlockPath
  ) => void;
  layoutSettings?: PortalLayoutSettings;
}) {
  const blocks = section.contentBlocks?.pageBlocks ?? [];

  return (
    <ExperienceSlideV2
      className={designMode ? "px-0" : undefined}
      contentClassName={
        designMode ? "mx-0 max-w-none px-4 sm:px-6" : undefined
      }
    >
      <ChapterStagger className="flex w-full flex-col gap-4 lg:gap-6">
        <ChapterStaggerItem>
          <ChapterHeader
            title={
              variableContext
                ? resolvePortalVariables(section.title, variableContext)
                : section.title
            }
          />
        </ChapterStaggerItem>
        <ChapterStaggerItem>
          <ExperienceBlockRenderer
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
            previewMode={previewMode}
            designMode={designMode}
            designViewport={designViewport}
            onBlockContextMenu={onBlockContextMenu}
            variableContext={variableContext}
            layoutSettings={layoutSettings}
          />
        </ChapterStaggerItem>
      </ChapterStagger>
    </ExperienceSlideV2>
  );
}
