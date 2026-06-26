"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { CloudBackground } from "@/components/client/cloud-background";
import { ProFormaDeckChapter } from "@/components/client/pro-forma-deck-chapter";

type Chapter = {
  id: string;
  label: string;
  sectionType?: string;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function CountUp({
  value,
  format,
  active,
}: {
  value: number;
  format: (n: number) => string;
  active: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!active || reduced) {
      setDisplay(value);
      return;
    }
    const duration = 900;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setDisplay(Math.round(value * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, active, reduced]);

  return <>{format(display)}</>;
}

export function DeckPresentation({
  slug,
  payload,
  contactName,
  branding,
}: {
  slug: string;
  payload: ProposalSnapshotPayload;
  contactName: string;
  branding: {
    heroCloudImageUrl: string;
    heroCloudVideoUrl: string | null;
    logoUrl: string;
  };
}) {
  const allSections = payload.sections?.filter((s) => s.visible) ?? [];
  const proFormaSection = allSections.find((s) => s.sectionType === "pro_forma");
  const sections = allSections.filter((s) => s.sectionType !== "pro_forma");
  const aircraftList = useMemo(() => normalizeAircraftList(payload), [payload]);
  const primaryAircraft = aircraftList[0];

  const chapters: Chapter[] = useMemo(
    () => [
      { id: "cover", label: "Cover" },
      { id: "aircraft", label: "Your aircraft" },
      ...sections.map((s) => ({
        id: s.sectionType,
        label: s.title,
        sectionType: s.sectionType,
      })),
      { id: "proforma", label: "Pro Forma" },
      { id: "next", label: "Next Steps" },
    ],
    [sections]
  );

  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.max(0, Math.min(chapters.length - 1, i + delta)));
    },
    [chapters.length]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const chapter = chapters[index];
  const section = sections.find((s) => s.sectionType === chapter?.sectionType);
  const coverVideo = branding.heroCloudVideoUrl;
  const coverImage = branding.heroCloudImageUrl;
  const proformaActive = chapter?.id === "proforma";

  return (
    <div className="relative h-[calc(100vh-var(--portal-nav-height))] min-h-[28rem] overflow-hidden bg-[#0a0d14] text-white">
      <CloudBackground
        imageUrl={
          chapter?.id === "cover" ? coverImage : (section?.imageUrl ?? coverImage)
        }
        videoUrl={chapter?.id === "cover" ? coverVideo : section?.videoUrl}
        posterUrl={section?.posterUrl ?? coverImage}
        className="absolute inset-0 h-full"
      >
        <div className="flex h-full flex-col">
          <div className="relative flex-1 overflow-hidden">
            {chapters.map((ch, i) => (
              <article
                key={ch.id}
                className={cn(
                  "absolute inset-0 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-20",
                  !reduced && "transition-all duration-500 ease-out",
                  i === index
                    ? "translate-x-0 opacity-100"
                    : i < index
                      ? "-translate-x-8 opacity-0 pointer-events-none"
                      : "translate-x-8 opacity-0 pointer-events-none"
                )}
                aria-hidden={i !== index}
              >
                {ch.id === "cover" && (
                  <CoverChapter
                    contactName={contactName}
                    proposalName={payload.proposal.name}
                    aircraftModel={payload.aircraft?.model}
                  />
                )}
                {ch.id === "aircraft" && (
                  <AircraftTeaserChapter
                    slug={slug}
                    aircraftList={aircraftList}
                    primaryAircraft={primaryAircraft}
                  />
                )}
                {section && ch.sectionType === section.sectionType && (
                  <ContentChapter section={section} />
                )}
                {ch.id === "proforma" && (
                  <ProFormaDeckChapter
                    slug={slug}
                    aircraftList={aircraftList}
                    introCopy={proFormaSection?.bodyCopy}
                    active={proformaActive}
                    CountUp={CountUp}
                  />
                )}
                {ch.id === "next" && (
                  <NextChapter slug={slug} aircraftId={primaryAircraft?.id} />
                )}
              </article>
            ))}
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#0a0d14]/70 px-3 py-2 sm:px-5">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index === 0}
              className="inline-flex items-center gap-1 rounded border border-white/15 px-2.5 py-1.5 text-xs disabled:opacity-30 hover:bg-white/10 sm:text-sm"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>

            <div className="flex flex-1 justify-center gap-1 overflow-x-auto px-2">
              {chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  type="button"
                  title={ch.label}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1.5 shrink-0 rounded-full transition-all",
                    i === index ? "w-5 bg-atlas-accent" : "w-1.5 bg-white/25 hover:bg-white/40"
                  )}
                  aria-label={ch.label}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => go(1)}
              disabled={index >= chapters.length - 1}
              className="inline-flex items-center gap-1 rounded border border-white/15 px-2.5 py-1.5 text-xs disabled:opacity-30 hover:bg-white/10 sm:text-sm"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </footer>
        </div>
      </CloudBackground>
    </div>
  );
}

function CoverChapter({
  contactName,
  proposalName,
  aircraftModel,
}: {
  contactName: string;
  proposalName: string;
  aircraftModel: string | null | undefined;
}) {
  return (
    <div className="max-w-3xl motion-safe:animate-[fadeUp_0.6s_ease-out]">
      <p className="text-sm uppercase tracking-[0.35em] text-atlas-accent">PrismJet</p>
      <h1 className="mt-6 font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
        Your PrismJet Experience
      </h1>
      <p className="mt-6 text-lg text-white/75 sm:text-xl">
        {proposalName}
        {aircraftModel ? (
          <>
            <br />
            <span className="text-white/60">{aircraftModel}</span>
          </>
        ) : null}
      </p>
      <p className="mt-4 text-base text-white/50">Prepared for {contactName}</p>
    </div>
  );
}

function ContentChapter({
  section,
}: {
  section: ProposalSnapshotPayload["sections"][0];
}) {
  return (
    <div className="grid max-w-5xl gap-8 lg:grid-cols-2 lg:items-center motion-safe:animate-[fadeUp_0.5s_ease-out]">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">
          {section.sectionType.replace(/_/g, " ")}
        </p>
        <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{section.title}</h2>
        <p className="mt-6 max-w-xl whitespace-pre-wrap text-base leading-relaxed text-white/85">
          {section.bodyCopy}
        </p>
        {section.calloutMetricLabel && section.calloutMetricValue ? (
          <div className="mt-8 inline-block rounded-lg border border-atlas-accent/40 bg-atlas-accent/10 px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-white/60">
              {section.calloutMetricLabel}
            </p>
            <p className="mt-1 font-mono text-2xl text-atlas-accent">
              {section.calloutMetricValue}
            </p>
          </div>
        ) : null}
      </div>
      {section.imageUrl ? (
        <div className="overflow-hidden rounded-xl border border-white/15 shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={section.imageUrl}
            alt=""
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
    </div>
  );
}

function AircraftTeaserChapter({
  slug,
  aircraftList,
  primaryAircraft,
}: {
  slug: string;
  aircraftList: ReturnType<typeof normalizeAircraftList>;
  primaryAircraft: ReturnType<typeof normalizeAircraftList>[0] | undefined;
}) {
  const count = aircraftList.length;
  const label = primaryAircraft?.label ?? "your aircraft";

  return (
    <div className="max-w-3xl motion-safe:animate-[fadeUp_0.5s_ease-out]">
      <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">Your proposal</p>
      <h2 className="mt-3 font-serif text-3xl sm:text-4xl">
        {count > 1 ? `${count} aircraft in your proposal` : label}
      </h2>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-white/75">
        {primaryAircraft?.clientSummary ??
          "Explore the aircraft included in your personalized management proposal — specifications, economics, and pro forma for each."}
      </p>
      {count > 1 ? (
        <ul className="mt-8 space-y-2 text-white/70">
          {aircraftList.map((ac) => (
            <li key={ac.id} className="font-serif text-lg">
              {ac.label}
              {ac.aircraftProfileMode === "existing" && ac.aircraftTypeLabel ? (
                <span className="ml-2 text-sm text-white/45">{ac.aircraftTypeLabel}</span>
              ) : ac.tailNumber ? (
                <span className="ml-2 text-sm text-white/45">{ac.tailNumber}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href={`/${slug}/aircraft`}
        className="mt-10 inline-flex rounded-lg bg-atlas-accent px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#0a0d14] transition-colors hover:bg-atlas-accent-hover"
      >
        View your aircraft
      </Link>
    </div>
  );
}

function NextChapter({ slug, aircraftId }: { slug: string; aircraftId?: string }) {
  return (
    <div className="max-w-2xl text-center motion-safe:animate-[fadeUp_0.5s_ease-out] sm:text-left">
      <h2 className="font-serif text-4xl">Ready to move forward?</h2>
      <p className="mt-4 text-lg text-white/75">
        Your PrismJet advisor is ready to tailor a management program to your mission.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4 sm:justify-start">
        <Link
          href={`/${slug}/contact`}
          className="rounded-lg bg-atlas-accent px-8 py-3 font-medium text-[#0a0d14] hover:bg-atlas-accent-hover"
        >
          Contact your advisor
        </Link>
        <Link
          href={
            aircraftId && aircraftId !== "legacy-primary"
              ? `/${slug}/pro-forma?aircraft=${aircraftId}`
              : `/${slug}/pro-forma`
          }
          className="rounded-lg border border-white/30 px-8 py-3 text-sm hover:bg-white/10"
        >
          Pro Forma
        </Link>
      </div>
    </div>
  );
}
