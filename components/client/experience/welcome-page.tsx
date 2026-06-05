"use client";

import Link from "next/link";
import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { interpolateWelcomeCopy } from "@/lib/experience-defaults";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, SectionNumber } from "./experience-primitives";

export function WelcomePage({
  section,
  payload,
  contactName,
  branding,
  slug,
}: {
  section: ExperienceSectionSnapshot;
  payload: ProposalSnapshotPayload;
  contactName: string;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
  slug: string;
}) {
  const letter = interpolateWelcomeCopy(section.bodyCopy, contactName);
  const aircraftList = normalizeAircraftList(payload);
  const model = payload.aircraft?.model;

  return (
    <>
      <ExperienceHero
        imageUrl={section.imageUrl ?? branding.heroCloudImageUrl}
        videoUrl={section.videoUrl ?? branding.heroCloudVideoUrl}
        posterUrl={section.posterUrl}
        kenBurns
      >
        <RevealOnScroll>
          <p className="text-xs uppercase tracking-[0.35em] text-atlas-accent">PrismJet</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Aircraft Management &amp; Charter
          </h1>
          <p className="mt-4 text-lg text-white/70">{payload.proposal.name}</p>
          {model ? <p className="mt-1 text-white/50">{model}</p> : null}
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_280px]">
          <RevealOnScroll delayMs={100}>
            <div className="whitespace-pre-wrap text-base leading-relaxed text-white/85">{letter}</div>
            {(section.signatoryName || section.signatoryTitle) && (
              <div className="mt-10 border-t border-white/10 pt-6">
                <p className="text-sm text-white/50">Sincerely,</p>
                {section.signatoryName ? (
                  <p className="mt-2 font-serif text-xl">{section.signatoryName}</p>
                ) : null}
                {section.signatoryTitle ? (
                  <p className="text-sm text-white/60">{section.signatoryTitle}</p>
                ) : null}
              </div>
            )}
          </RevealOnScroll>
          <RevealOnScroll delayMs={200}>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <SectionNumber n="Your proposal" />
              <p className="mt-3 text-sm text-white/70">
                {aircraftList.length > 1
                  ? `${aircraftList.length} aircraft included`
                  : (aircraftList[0]?.label ?? "Explore your aircraft details and pro forma.")}
              </p>
              <Link
                href={`/${slug}/aircraft`}
                className="mt-6 inline-flex rounded-lg bg-atlas-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#0a0d14] hover:bg-atlas-accent-hover"
              >
                View your aircraft
              </Link>
            </div>
          </RevealOnScroll>
        </div>
      </ExperienceBody>
    </>
  );
}
