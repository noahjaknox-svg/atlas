"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { interpolateExperienceCopy } from "@/lib/experience-defaults";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { RevealOnScroll } from "./reveal-on-scroll";
import {
  ExperienceBody,
  ExperienceHero,
  ExperienceSlide,
  experienceGlass,
  experienceScrollCopy,
  SectionNumber,
} from "./experience-primitives";
import { ExperienceGallery } from "./experience-gallery";

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
  const aircraftList = normalizeAircraftList(payload);
  const aircraftName =
    aircraftList[0]?.label ?? payload.aircraft?.model ?? "your aircraft";
  const letter = interpolateExperienceCopy(section.bodyCopy, { contactName, aircraftName });

  return (
    <ExperienceSlide>
      <ExperienceHero large>
        <RevealOnScroll immediate>
          <p className="text-xs uppercase tracking-[0.35em] text-atlas-accent">PrismJet</p>
          <h1 className="mt-2 max-w-3xl font-serif text-3xl leading-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.65)] sm:text-4xl lg:text-5xl">
            {section.title}
          </h1>
          <p className="mt-2 text-sm text-white/70 sm:text-base">
            Prepared for {contactName}
            {aircraftName ? ` · ${aircraftName}` : null}
          </p>
          <p className="text-sm text-white/50">{payload.proposal.name}</p>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
          <RevealOnScroll delayMs={80} className="flex min-h-0 flex-col overflow-hidden">
            <div className={cn(experienceGlass, experienceScrollCopy, "min-h-0 flex-1 p-4 sm:p-5")}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85 sm:text-base">
                {letter}
              </p>
            </div>
            {(section.signatoryName || section.signatoryTitle) && (
              <div className="mt-3 shrink-0 border-t border-white/10 pt-3">
                <p className="text-xs text-white/50">Sincerely,</p>
                {section.signatoryName ? (
                  <p className="mt-1 font-serif text-lg">{section.signatoryName}</p>
                ) : null}
                {section.signatoryTitle ? (
                  <p className="text-xs text-white/60">{section.signatoryTitle}</p>
                ) : null}
              </div>
            )}
          </RevealOnScroll>
          <div className="flex min-h-0 flex-col gap-3">
            <RevealOnScroll delayMs={120}>
              <div className={cn(experienceGlass, "p-4 sm:p-5")}>
                <SectionNumber n="Your proposal" />
                <p className="mt-2 text-sm text-white/70">
                  {aircraftList.length > 1
                    ? `${aircraftList.length} aircraft included`
                    : (aircraftList[0]?.label ?? "Explore your aircraft details and pro forma.")}
                </p>
                <Link
                  href={`/${slug}/aircraft`}
                  prefetch
                  className="mt-4 inline-flex rounded-lg bg-atlas-accent px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[#0B0F1A] hover:bg-atlas-accent-hover"
                >
                  View your aircraft
                </Link>
              </div>
            </RevealOnScroll>
            <ExperienceGallery
              items={section.contentBlocks?.gallery}
              layout="welcome"
              slide
              className="min-h-0 flex-1"
            />
          </div>
        </div>
      </ExperienceBody>
    </ExperienceSlide>
  );
}
