"use client";

import { ExperiencePageContent } from "@/components/client/experience/experience-page-content";
import { ChapterStaggerProvider } from "./chapter-stagger-context";
import {
  getBootstrapSection,
  useExperienceBootstrap,
} from "./experience-bootstrap-context";
import { resolveLayoutSettings } from "@/lib/portal-layout-settings";
import { useMemo } from "react";

function ProFormaLoadingSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl animate-pulse flex-col gap-6 px-4 py-8">
      <div className="h-10 w-2/3 rounded-lg bg-white/10" />
      <div className="h-4 w-full rounded bg-white/5" />
      <div className="h-4 w-5/6 rounded bg-white/5" />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-white/5" />
        <div className="h-64 rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

export function ExperienceChapterSlide({
  pageSlug,
  isActive,
}: {
  pageSlug: string;
  isActive: boolean;
}) {
  const {
    sections,
    payload,
    contactName,
    branding,
    slug,
    aircraftParam,
    clientSnapshot,
    clientLoading,
    draftMode,
  } = useExperienceBootstrap();

  const section = getBootstrapSection(sections, pageSlug);
  if (!section) return null;
  if (!draftMode && !section.visible) return null;

  if (pageSlug === "pro-forma" && !clientSnapshot) {
    if (clientLoading) return <ProFormaLoadingSkeleton />;
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-white/60">
        Unable to load pro forma data. Try refreshing the page.
      </div>
    );
  }

  const layoutSettings = useMemo(
    () => resolveLayoutSettings(payload.branding?.layoutSettings),
    [payload.branding?.layoutSettings]
  );

  const pageContent = (
    <ExperiencePageContent
      pageSlug={pageSlug}
      section={section}
      payload={payload}
      contactName={contactName}
      branding={{
        heroCloudImageUrl: branding.heroCloudImageUrl,
        heroCloudVideoUrl: branding.heroCloudVideoUrl,
        logoUrl: branding.logoUrl ?? null,
      }}
      slug={slug}
      client={clientSnapshot ?? undefined}
      aircraftParam={aircraftParam}
      renderV2
      layoutSettings={layoutSettings}
    />
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col" aria-hidden={!isActive}>
      <ChapterStaggerProvider mode="static">
        {pageSlug === "pro-forma" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{pageContent}</div>
        ) : (
          pageContent
        )}
      </ChapterStaggerProvider>
    </div>
  );
}
