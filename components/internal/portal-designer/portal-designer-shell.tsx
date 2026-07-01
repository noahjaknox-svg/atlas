"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getSectionPageBlocks,
  patchSectionPageBlocks,
  updateBlockById,
  removeBlockById,
} from "@/lib/page-blocks-utils";
import { findBlockById } from "@/lib/portal-block-layout";
import { collectBlockDiagnostics } from "@/lib/portal-block-diagnostics";
import { buildPortalVariableContext } from "@/lib/portal-variables";
import type { ExperiencePageBlock } from "@/lib/experience-content";
import {
  PORTAL_PUBLISH_STATUS_LABELS,
  type PortalPublishStatus,
} from "@/lib/portal-publish-status";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import {
  PROSPECT_PORTAL_DESIGNER,
  PUBLISH_PROSPECT_PORTAL,
  REPUBLISH_PROSPECT_PORTAL,
} from "@/lib/product-terminology";
import { ProposalDesignEditor } from "@/components/internal/proposal-design-editor";
import { PortalPresentationForm } from "@/components/internal/workspace/portal-presentation-panel";
import type { FleetShowcaseItem, PortalContentData } from "@/lib/portal-content";
import { resolveLayoutSettings } from "@/lib/portal-layout-settings";
import { PortalDesignerPageList } from "./portal-designer-page-list";
import {
  PortalDesignerBlockTree,
  type BlockSelection,
} from "./portal-designer-block-tree";
import { PortalDesignerCanvas } from "./portal-designer-canvas";
import { PortalDesignerPreview } from "./portal-designer-preview";
import { sectionNavSlug } from "@/lib/experience-page-slug";
import { PortalDesignerInspector } from "./portal-designer-inspector";
import { PortalPublishChecklist } from "./portal-publish-checklist";
import { PortalDesignerWarningsMenu } from "./portal-designer-warnings-menu";
import { useDesignerHistory } from "./use-designer-history";
import {
  cloneDesignerSections,
  DESIGNER_PAGE_TYPES,
  sectionsWithPageBlocks,
  type DesignerBrandingTab,
  type DesignerSection,
  type PortalDesignerHeroState,
  type PortalDesignerMode,
  type PreviewSource,
  type PreviewViewport,
} from "./portal-designer-types";

type DesignerState = {
  sections: DesignerSection[];
  hero: PortalDesignerHeroState;
};

export function PortalDesignerShell({
  mode,
  initialSections,
  initialBrandingContent,
  initialFleet,
  proposalId,
  aircraftId,
  initialHero,
  portalSlug,
  publishedSnapshot,
  publishStatus,
  lastPublishedAt,
  isAdmin,
  onPublished,
}: {
  mode: PortalDesignerMode;
  initialSections: DesignerSection[];
  initialBrandingContent?: PortalContentData;
  initialFleet?: FleetShowcaseItem[];
  proposalId?: string;
  aircraftId?: string;
  initialHero?: PortalDesignerHeroState;
  portalSlug?: string | null;
  publishedSnapshot?: ProposalSnapshotPayload | null;
  publishStatus?: PortalPublishStatus;
  lastPublishedAt?: string | null;
  isAdmin?: boolean;
  onPublished?: () => void;
}) {
  const initialState: DesignerState = useMemo(
    () => ({
      sections: sectionsWithPageBlocks(cloneDesignerSections(initialSections)),
      hero: initialHero ?? {
        clientSummary: "",
        portalImageUrl: "",
        portalVideoUrl: "",
        portalSpecHighlights: [],
      },
    }),
    [initialSections, initialHero]
  );

  const [sections, setSections] = useState(initialState.sections);
  const [hero, setHero] = useState(initialState.hero);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialState));
  const history = useDesignerHistory<DesignerState>(initialState);
  const skipHistoryPush = useRef(false);

  const initialActiveId =
    initialSections[0]?.id ?? initialSections[0]?.sectionType ?? "welcome";

  const [activeSectionId, setActiveSectionId] = useState(initialActiveId);
  const [selection, setSelection] = useState<BlockSelection | null>(null);
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");

  const layoutSettings = useMemo(
    () =>
      resolveLayoutSettings(
        publishedSnapshot?.branding?.layoutSettings,
        initialBrandingContent?.layoutSettings
      ),
    [publishedSnapshot?.branding?.layoutSettings, initialBrandingContent?.layoutSettings]
  );
  const [previewSource, setPreviewSource] = useState<PreviewSource>("draft");
  const [brandingTab, setBrandingTab] = useState<DesignerBrandingTab>("pages");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify({ sections, hero }) !== baseline;

  useEffect(() => {
    if (skipHistoryPush.current) {
      skipHistoryPush.current = false;
      return;
    }
    history.push({ sections, hero });
  }, [sections, hero, history]);

  const activeSection = useMemo(
    () =>
      sections.find((s) => (s.id ?? s.sectionType) === activeSectionId) ?? sections[0]!,
    [sections, activeSectionId]
  );

  function sectionKey(section: DesignerSection): string {
    return section.id ?? section.sectionType;
  }

  const activeBlocks = useMemo(
    () => getSectionPageBlocks(activeSection),
    [activeSection]
  );

  const selectedBlock = useMemo(() => {
    if (!selection) return null;
    return findBlockById(activeBlocks, selection.blockId)?.block ?? null;
  }, [activeBlocks, selection]);

  const variableContext = useMemo(
    () =>
      publishedSnapshot
        ? buildPortalVariableContext(publishedSnapshot)
        : undefined,
    [publishedSnapshot]
  );

  const diagnostics = useMemo(
    () => collectBlockDiagnostics(activeBlocks, variableContext),
    [activeBlocks, variableContext]
  );

  const showWarningsMenu = !(mode === "master" && brandingTab === "global");

  const handleWarningSelect = useCallback(
    (sel: BlockSelection) => {
      setPreviewSource("draft");
      setSelection(sel);
      setMessage(null);
      setError(null);
    },
    []
  );

  const hiddenPageCount = useMemo(
    () =>
      sections.filter(
        (s) =>
          DESIGNER_PAGE_TYPES.includes(s.sectionType as (typeof DESIGNER_PAGE_TYPES)[number]) &&
          !s.visible
      ).length,
    [sections]
  );

  const proFormaVisible = sections.some((s) => s.sectionType === "pro_forma" && s.visible);

  const previewSection = useMemo(() => {
    if (mode === "proposal" && previewSource === "published" && publishedSnapshot) {
      const published = publishedSnapshot.sections.find(
        (s) =>
          s.sectionType === activeSection.sectionType &&
          (activeSection.sectionType !== "custom_page" ||
            s.pageSlug === activeSection.pageSlug)
      );
      if (published) return published as DesignerSection;
    }
    return activeSection;
  }, [mode, previewSource, publishedSnapshot, activeSection]);

  const previewToolbarRight = (
    <>
      {(["desktop", "mobile"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setViewport(v)}
          className={cn(
            "rounded px-2 py-1 text-xs capitalize",
            viewport === v
              ? "bg-atlas-accent/15 text-atlas-text"
              : "text-atlas-muted hover:text-atlas-text"
          )}
        >
          {v}
        </button>
      ))}
      {mode === "proposal" ? (
        <>
          <span className="text-atlas-border">|</span>
          {(["draft", "published"] as const).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => setPreviewSource(source)}
              className={cn(
                "rounded px-2 py-1 text-xs capitalize",
                previewSource === source
                  ? "bg-atlas-accent/15 text-atlas-text"
                  : "text-atlas-muted hover:text-atlas-text"
              )}
            >
              {source}
            </button>
          ))}
        </>
      ) : null}
      {mode === "proposal" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[10px]"
          onClick={() => void resetPageFromMaster()}
        >
          Reset page to master
        </Button>
      ) : null}
    </>
  );

  const patchActiveSection = useCallback(
    (patch: Partial<DesignerSection>) => {
      setSections((prev) =>
        prev.map((s) => (sectionKey(s) === activeSectionId ? { ...s, ...patch } : s))
      );
      setMessage(null);
      setError(null);
    },
    [activeSectionId]
  );

  const setActiveBlocks = useCallback(
    (blocks: ExperiencePageBlock[]) => {
      const textBlock = blocks.find(
        (b): b is Extract<ExperiencePageBlock, { type: "text" }> => b.type === "text"
      );
      if (blocks.length === 0) {
        patchActiveSection({
          contentBlocks: {
            ...(activeSection.contentBlocks ?? {}),
            pageBlocks: [],
            gallery: [],
          },
          bodyCopy: "",
          imageUrl: null,
        });
        return;
      }
      patchActiveSection({
        contentBlocks: patchSectionPageBlocks(activeSection.contentBlocks, blocks),
        bodyCopy: textBlock ? textBlock.markdown : activeSection.bodyCopy,
      });
    },
    [activeSection.bodyCopy, activeSection.contentBlocks, patchActiveSection]
  );

  const patchBlock = useCallback(
    (blockId: string, patch: Partial<ExperiencePageBlock>) => {
      setActiveBlocks(updateBlockById(activeBlocks, blockId, patch));
    },
    [activeBlocks, setActiveBlocks]
  );

  const handleUndo = useCallback(() => {
    const prev = history.undo();
    if (prev) {
      skipHistoryPush.current = true;
      setSections(prev.sections);
      setHero(prev.hero);
    }
  }, [history]);

  const handleRedo = useCallback(() => {
    const next = history.redo();
    if (next) {
      skipHistoryPush.current = true;
      setSections(next.sections);
      setHero(next.hero);
    }
  }, [history]);

  useEffect(() => {
    if (!dirty || mode !== "proposal" || !proposalId) return;
    const timer = window.setTimeout(() => {
      void saveDraft();
    }, 30_000);
    return () => window.clearTimeout(timer);
  }, [dirty, mode, proposalId, sections, hero]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelection(null);
      if (e.key === "Delete" && selection && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        setActiveBlocks(removeBlockById(activeBlocks, selection.blockId));
        setSelection(null);
        return;
      }
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeBlocks, selection, setActiveBlocks, handleUndo, handleRedo]);

  async function saveDraft() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      if (mode === "master") {
        const res = await fetch("/api/portal-content", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ experienceTemplates: sections }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Save failed");
        if (json.content?.experienceTemplates) {
          const next = sectionsWithPageBlocks(json.content.experienceTemplates);
          setSections(next);
          const state = { sections: next, hero };
          setBaseline(JSON.stringify(state));
          history.reset(state);
        } else {
          const state = { sections, hero };
          setBaseline(JSON.stringify(state));
          history.reset(state);
        }
        setMessage("Master template saved. New proposals will use these defaults.");
      } else if (proposalId) {
        const res = await fetch(`/api/proposals/${proposalId}/sections`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sections: sections.filter((s) => s.id).map((s) => ({ ...s, id: s.id! })),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Save failed");

        if (aircraftId && JSON.stringify(hero) !== JSON.parse(baseline).hero) {
          const heroRes = await fetch(`/api/proposals/${proposalId}/aircraft/${aircraftId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientSummary: hero.clientSummary || null,
              portalImageUrl: hero.portalImageUrl || null,
              portalVideoUrl: hero.portalVideoUrl || null,
              portalSpecHighlights: hero.portalSpecHighlights.filter((s) => s.trim()),
            }),
          });
          if (!heroRes.ok) throw new Error("Could not save aircraft hero.");
        }

        const state = { sections, hero };
        setBaseline(JSON.stringify(state));
        history.reset(state);
        setMessage("Draft saved.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function publishPortal() {
    if (!proposalId || !isAdmin) return;
    setPublishing(true);
    setError(null);
    try {
      if (dirty) await saveDraft();
      const republish = publishStatus === "published" || publishStatus === "unpublishedChanges";
      const res = await fetch(`/api/proposals/${proposalId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ republish }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Publish failed");
      setMessage("Prospect portal published.");
      setChecklistOpen(false);
      onPublished?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  async function resetPageFromMaster() {
    if (mode !== "proposal" || !proposalId) return;
    if (!confirm("Reset this page from the global master template? Your proposal edits will be replaced.")) {
      return;
    }
    const res = await fetch(`/api/proposals/${proposalId}/sections/reset-from-master`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionType: activeSection.sectionType }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Reset failed");
      return;
    }
    const resetSection = json.sections?.[0];
    if (resetSection) {
      setSections((prev) =>
        prev.map((s) =>
          sectionKey(s) === activeSectionId
            ? sectionsWithPageBlocks([resetSection as DesignerSection])[0]!
            : s
        )
      );
      setSelection(null);
      setMessage("Page reset from master.");
    }
  }

  async function openPreviewTab() {
    const page = sectionNavSlug(activeSection);

    if (mode === "master") {
      try {
        const res = await fetch("/api/portal-content/designer-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sections,
            hero,
            activePageSlug: page,
          }),
        });
        const json = await res.json();
        if (res.ok && json.token) {
          window.open(
            `/aircraft-management/proposal-design/preview?previewToken=${encodeURIComponent(json.token)}&page=${encodeURIComponent(page)}`,
            "_blank",
            "noopener,noreferrer"
          );
          return;
        }
        setError(json.error ?? "Could not open preview.");
      } catch {
        setError("Could not open preview.");
      }
      return;
    }

    if (!portalSlug || !proposalId) {
      setError("A portal slug is required before previewing. Publish or configure the portal first.");
      return;
    }

    try {
      const res = await fetch(`/api/proposals/${proposalId}/portal/designer-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections,
          hero,
          activePageSlug: page,
        }),
      });
      const json = await res.json();
      if (res.ok && json.token) {
        window.open(
          `/${portalSlug}/experience/${page}?previewToken=${encodeURIComponent(json.token)}`,
          "_blank",
          "noopener,noreferrer"
        );
        return;
      }
    } catch {
      /* fall through to draft=1 */
    }
    const draft = previewSource === "draft" ? "?draft=1" : "";
    window.open(`/${portalSlug}/experience/${page}${draft}`, "_blank", "noopener,noreferrer");
  }

  async function handleAddPage(input: { title: string; pageSlug: string }) {
    if (!proposalId) {
      const id = `custom_${Date.now()}`;
      const next: DesignerSection = {
        id,
        sectionType: "custom_page",
        pageSlug: input.pageSlug,
        title: input.title,
        bodyCopy: null,
        visible: true,
        sortOrder: sections.length + 1,
        imageUrl: null,
        videoUrl: null,
        posterUrl: null,
        calloutMetricLabel: null,
        calloutMetricValue: null,
        layoutVariant: null,
        signatoryName: null,
        signatoryTitle: null,
        contentBlocks: { pageBlocks: [] },
      };
      setSections((prev) => [...prev, next]);
      setActiveSectionId(id);
      return;
    }

    const res = await fetch(`/api/proposals/${proposalId}/sections/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Could not create page");
    const created = json as DesignerSection;
    setSections((prev) => [...prev, sectionsWithPageBlocks([created])[0]!]);
    setActiveSectionId(created.id!);
    setMessage("Custom page added.");
  }

  async function handleDeletePage(sectionId: string) {
    if (proposalId) {
      const res = await fetch(`/api/proposals/${proposalId}/sections/${sectionId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
    }
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== sectionId);
      if (activeSectionId === sectionId && next[0]) {
        setActiveSectionId(sectionKey(next[0]));
      }
      return next;
    });
    setSelection(null);
    setMessage("Page deleted.");
  }

  function handlePageReorder(orderedIds: string[]) {
    setSections((prev) => {
      const byId = new Map(prev.map((s) => [sectionKey(s), s]));
      return orderedIds
        .map((id, index) => {
          const section = byId.get(id);
          return section ? { ...section, sortOrder: index + 1 } : null;
        })
        .filter((s): s is DesignerSection => !!s);
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-atlas-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-xl text-atlas-text">{PROSPECT_PORTAL_DESIGNER}</h1>
            {showWarningsMenu ? (
              <PortalDesignerWarningsMenu
                diagnostics={diagnostics}
                blocks={activeBlocks}
                onSelectBlock={handleWarningSelect}
              />
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-atlas-muted">
            {mode === "master"
              ? "Global defaults for new proposals"
              : "Edit this proposal's portal pages, blocks, and hero media"}
          </p>
        </div>

        {mode === "master" ? (
          <nav className="flex gap-1 rounded-lg border border-atlas-border p-1">
            {(["pages", "global"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setBrandingTab(tab)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium capitalize",
                  brandingTab === tab
                    ? "bg-atlas-accent/15 text-atlas-text"
                    : "text-atlas-muted hover:text-atlas-text"
                )}
              >
                {tab === "pages" ? "Pages & blocks" : "Global branding"}
              </button>
            ))}
          </nav>
        ) : null}

        {mode === "proposal" ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {publishStatus ? (
              <span className="rounded-full border border-atlas-border px-2 py-0.5 text-atlas-muted">
                {PORTAL_PUBLISH_STATUS_LABELS[publishStatus]}
              </span>
            ) : null}
            {lastPublishedAt ? (
              <span className="text-[10px] text-atlas-muted">
                Last published {new Date(lastPublishedAt).toLocaleString()}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!history.canUndo()}
            onClick={handleUndo}
            title="Undo (Ctrl+Z)"
          >
            Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!history.canRedo()}
            onClick={handleRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            Redo
          </Button>
          {mode === "proposal" || mode === "master" ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => void openPreviewTab()}>
              Preview
            </Button>
          ) : null}
          <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void saveDraft()}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
          {mode === "proposal" && isAdmin ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={publishing}
              onClick={() => setChecklistOpen(true)}
            >
              {publishing
                ? "Publishing…"
                : publishStatus === "published" || publishStatus === "unpublishedChanges"
                  ? REPUBLISH_PROSPECT_PORTAL
                  : PUBLISH_PROSPECT_PORTAL}
            </Button>
          ) : null}
        </div>
      </header>

      {(message || error || dirty) && (
        <div className="shrink-0 border-b border-atlas-border px-4 py-2 text-xs">
          {error ? <span className="text-red-400">{error}</span> : null}
          {!error && message ? <span className="text-atlas-muted">{message}</span> : null}
          {!error && !message && dirty ? (
            <span className="text-amber-200/80">Unsaved changes</span>
          ) : null}
        </div>
      )}

      {mode === "master" && brandingTab === "global" && initialBrandingContent && initialFleet ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <ProposalDesignEditor
            initialContent={initialBrandingContent}
            initialFleet={initialFleet}
          />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr_340px]">
          <aside className="flex min-h-0 flex-col border-r border-atlas-border bg-atlas-surface/20">
            <PortalDesignerPageList
              sections={sections}
              activeSectionId={activeSectionId}
              onSelect={(id) => {
                setActiveSectionId(id);
                setSelection(null);
              }}
              onToggleVisible={(id, visible) => {
                setSections((prev) =>
                  prev.map((s) => (sectionKey(s) === id ? { ...s, visible } : s))
                );
              }}
              onReorder={handlePageReorder}
              onAddPage={(input) => handleAddPage(input)}
              onDeletePage={proposalId ? handleDeletePage : undefined}
              canAddCustomPages
            />
          </aside>

          <main className="flex min-h-0 flex-col border-r border-atlas-border">
            <div className="min-h-0 flex-1">
              {previewSource === "draft" ? (
                <PortalDesignerCanvas
                  section={previewSection}
                  blocks={activeBlocks}
                  viewport={viewport}
                  payload={publishedSnapshot ?? undefined}
                  selectedBlockId={selection?.blockId}
                  selection={selection}
                  onSelect={setSelection}
                  onBlocksChange={setActiveBlocks}
                  diagnostics={diagnostics}
                  toolbarRight={previewToolbarRight}
                  layoutSettings={layoutSettings}
                />
              ) : (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex h-11 shrink-0 items-center justify-end gap-2 border-b border-atlas-border px-3">
                    {previewToolbarRight}
                  </div>
                  <div className="min-h-0 flex-1">
                    <PortalDesignerPreview
                      section={previewSection}
                      viewport={viewport}
                      payload={publishedSnapshot ?? undefined}
                      previewMode={false}
                      layoutSettings={layoutSettings}
                    />
                  </div>
                </div>
              )}
            </div>
          </main>

          <aside className="flex min-h-0 flex-col overflow-y-auto bg-atlas-surface/10">
            {mode === "proposal" && aircraftId ? (
              <div className="border-b border-atlas-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-atlas-muted">
                  Aircraft portal hero
                </p>
                <div className="mt-2">
                  <PortalPresentationForm value={hero} onChange={setHero} />
                </div>
              </div>
            ) : null}
            <PortalDesignerInspector
              section={activeSection}
              selectedBlock={selectedBlock}
              onPatchSection={patchActiveSection}
              onPatchBlock={patchBlock}
              onPatchBlocks={setActiveBlocks}
              proposalId={proposalId}
              diagnostics={diagnostics}
              layoutSettings={layoutSettings}
              designViewport={viewport}
              selectedBlockPath={selection?.path}
            />
            <div className="border-t border-atlas-border">
              <button
                type="button"
                onClick={() => setOutlineOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-atlas-muted"
              >
                Outline
                <span>{outlineOpen ? "−" : "+"}</span>
              </button>
              {outlineOpen ? (
                <PortalDesignerBlockTree
                  blocks={activeBlocks}
                  selection={selection}
                  onSelect={setSelection}
                  onBlocksChange={(blocks) => {
                    setActiveBlocks(blocks);
                    if (selection && !findBlockById(blocks, selection.blockId)) {
                      setSelection(null);
                    }
                  }}
                />
              ) : null}
            </div>
          </aside>
        </div>
      )}

      <PortalPublishChecklist
        open={checklistOpen}
        onOpenChange={setChecklistOpen}
        onConfirm={() => void publishPortal()}
        publishing={publishing}
        dirty={dirty}
        publishStatus={publishStatus}
        hiddenPageCount={hiddenPageCount}
        diagnostics={diagnostics}
        proFormaVisible={proFormaVisible}
      />
    </div>
  );
}
