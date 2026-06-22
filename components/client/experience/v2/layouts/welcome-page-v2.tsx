"use client";

import { cn } from "@/lib/utils";
import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { interpolateExperienceCopy } from "@/lib/experience-defaults";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { experienceGlassV2 } from "../experience-tokens";
import { ChapterStagger, ChapterStaggerItem } from "../chapter-transition";
import { ExperienceSlideV2 } from "./experience-slide-v2";

export function WelcomePageV2({
  section,
  payload,
  contactName,
}: {
  section: ExperienceSectionSnapshot;
  payload: ProposalSnapshotPayload;
  contactName: string;
}) {
  const aircraftList = normalizeAircraftList(payload);
  const aircraftName =
    aircraftList[0]?.label ?? payload.aircraft?.model ?? "your aircraft";
  const letter = interpolateExperienceCopy(section.bodyCopy, { contactName, aircraftName });

  return (
    <ExperienceSlideV2>
      <ChapterStagger className="flex h-full w-full max-w-4xl flex-col justify-center gap-4">
        <ChapterStaggerItem className="shrink-0">
          <h1 className="font-serif text-2xl leading-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
            {section.title}
          </h1>
          <p className="mt-3 text-sm text-white/75 sm:text-base">
            Prepared for <span className="text-atlas-accent">{contactName}</span>
            {aircraftName ? (
              <>
                <br />
                <span className="text-white/90">{aircraftName}</span>
              </>
            ) : null}
          </p>
        </ChapterStaggerItem>

        <ChapterStaggerItem className="flex min-h-0 max-h-[min(52vh,28rem)] flex-1 flex-col sm:max-h-[min(58vh,32rem)]">
          <div
            className={cn(
              experienceGlassV2,
              "flex min-h-0 flex-1 flex-col p-5 sm:p-6"
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85 sm:text-base">
                {letter}
              </p>
            </div>
            {(section.signatoryName || section.signatoryTitle) && (
              <div className="mt-4 shrink-0 border-t border-white/10 pt-4">
                <p className="text-xs text-white/50">Sincerely,</p>
                {section.signatoryName ? (
                  <p className="mt-1 font-serif text-lg text-white">{section.signatoryName}</p>
                ) : null}
                {section.signatoryTitle ? (
                  <p className="text-xs text-white/60">{section.signatoryTitle}</p>
                ) : null}
              </div>
            )}
          </div>
        </ChapterStaggerItem>

        <ChapterStaggerItem className="shrink-0 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            {payload.proposal.name}
          </p>
        </ChapterStaggerItem>
      </ChapterStagger>
    </ExperienceSlideV2>
  );
}
