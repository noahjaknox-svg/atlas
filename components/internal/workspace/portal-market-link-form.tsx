"use client";

import {
  type ExperienceContentBlocks,
  type ExperiencePageLink,
} from "@/lib/experience-content";
import type { ExperienceSectionRow } from "@/components/internal/workspace/experience-manager-panel";
import { SectionLinksEditor } from "@/components/internal/workspace/section-links-editor";
import { PROPOSAL_WORKSPACE } from "@/lib/product-terminology";

function readNavLinks(blocks: ExperienceContentBlocks | null | undefined): ExperiencePageLink[] {
  if (!Array.isArray(blocks?.navLinks)) return [];
  return blocks.navLinks.map((link) => ({
    label: typeof link?.label === "string" ? link.label : "",
    url: typeof link?.url === "string" ? link.url : "",
  }));
}

export function PortalMarketLinkForm({
  sections,
  onSectionsChange,
}: {
  sections: ExperienceSectionRow[];
  onSectionsChange: (next: ExperienceSectionRow[]) => void;
}) {
  const welcomeIndex = sections.findIndex((s) => s.sectionType === "welcome");
  const welcome = welcomeIndex >= 0 ? sections[welcomeIndex]! : null;
  const blocks = (welcome?.contentBlocks ?? null) as ExperienceContentBlocks | null;
  const draftLinks = readNavLinks(blocks);

  function applyLinks(links: ExperiencePageLink[]) {
    if (welcomeIndex < 0 || !welcome) return;

    const nextBlocks: ExperienceContentBlocks = {
      ...(welcome.contentBlocks as ExperienceContentBlocks | null),
      navLinks: links,
      aircraftMarketUrl: null,
      aircraftMarketButtonLabel: null,
    };

    const next = [...sections];
    next[welcomeIndex] = {
      ...welcome,
      contentBlocks: nextBlocks as ExperienceSectionRow["contentBlocks"],
    };
    onSectionsChange(next);
  }

  if (!welcome) {
    return (
      <p className="text-xs text-atlas-muted">
        Welcome section missing — open the {PROPOSAL_WORKSPACE} after experience sections are created.
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs leading-relaxed text-atlas-muted">
        Optional buttons in the portal nav, to the right of Pro Forma. Add zero, one, or many.
        External URLs open in a new tab.
      </p>

      <div className="mt-3">
        <SectionLinksEditor
          links={draftLinks}
          onChange={applyLinks}
          addLabel="Add nav button"
          emptyHint="No nav buttons — only Pro Forma will show in the header."
          listTitle="Nav buttons"
        />
      </div>
    </div>
  );
}
