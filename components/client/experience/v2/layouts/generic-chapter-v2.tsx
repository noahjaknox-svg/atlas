"use client";

import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import type { PortalVariableContext } from "@/lib/portal-variables";
import { ExperienceBlockRenderer } from "../../experience-block-renderer";
import { ExperienceSlideV2 } from "./experience-slide-v2";
import { ChapterStagger, ChapterStaggerItem } from "../chapter-transition";

import type { BlockPath } from "@/lib/portal-block-layout";
import type { ExperiencePageBlock } from "@/lib/experience-content";
import type { PreviewViewport } from "@/components/internal/portal-designer/portal-designer-types";
import type { PortalLayoutSettings } from "@/lib/portal-layout-settings";
import {
  experienceBlockPageContentV2,
} from "../experience-tokens";
import { cn } from "@/lib/utils";

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
  const resolvedDesignViewport = designViewport ?? "desktop";
  const mobilePreview = resolvedDesignViewport === "mobile";

  return (
    <ExperienceSlideV2
      className={cn(
        "portal-block-page-layout !px-0",
        mobilePreview && "portal-design-mobile-layout",
        !mobilePreview && designMode && "portal-design-desktop-layout"
      )}
      contentClassName={experienceBlockPageContentV2}
    >
      <ChapterStagger className="flex w-full flex-col gap-4 lg:gap-6">
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
