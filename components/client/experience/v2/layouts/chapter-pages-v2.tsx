"use client";

import { cn } from "@/lib/utils";
import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { experienceGlassV2 } from "../experience-tokens";
import { ChapterStagger, ChapterStaggerItem } from "../chapter-transition";
import { ExperienceSlideV2 } from "./experience-slide-v2";
import { ExperienceGallery } from "../../experience-gallery";
import { PullQuote } from "../../pull-quote";
import { BlockVsFlightAnimation } from "../../block-vs-flight-animation";
import { AboutStatRow } from "../../about-stat-row";

const BLOCK_TO_FLIGHT_FACTOR = 1.13;

function numOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Single-column editorial layout for v2 chapters. */
export function EditorialChapterV2({
  section,
  children,
  gallery,
}: {
  section: ExperienceSectionSnapshot;
  children?: React.ReactNode;
  gallery?: React.ReactNode;
}) {
  return (
    <ExperienceSlideV2>
      <ChapterStagger className="flex h-full w-full flex-col justify-center gap-4">
        <ChapterStaggerItem className="shrink-0">
          <h1 className="font-serif text-xl text-white sm:text-2xl lg:text-3xl">
            {section.title}
          </h1>
        </ChapterStaggerItem>

        {section.bodyCopy ? (
          <ChapterStaggerItem className="min-h-0 max-h-[32vh] shrink-0 sm:max-h-[35vh]">
            <div
              className={cn(
                experienceGlassV2,
                "max-h-[32vh] overflow-y-auto p-4 sm:max-h-[35vh] sm:p-5"
              )}
            >
              <p className="text-sm leading-relaxed text-white/85 sm:text-base">
                {section.bodyCopy}
              </p>
            </div>
          </ChapterStaggerItem>
        ) : null}

        {children}

        {gallery ? (
          <ChapterStaggerItem className="min-h-0 flex-1">{gallery}</ChapterStaggerItem>
        ) : null}
      </ChapterStagger>
    </ExperienceSlideV2>
  );
}

export function AboutUsPageV2({
  section,
}: {
  section: ExperienceSectionSnapshot;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
}) {
  const pillars = section.contentBlocks?.pillars ?? [];

  return (
    <ExperienceSlideV2>
      <ChapterStagger className="flex h-full w-full flex-col justify-center gap-4">
        <ChapterStaggerItem className="shrink-0">
          <h1 className="font-serif text-xl text-white sm:text-2xl lg:text-3xl">
            {section.title}
          </h1>
        </ChapterStaggerItem>

        {section.bodyCopy ? (
          <ChapterStaggerItem className="min-h-0 shrink-0">
            <div className={cn(experienceGlassV2, "max-h-[28vh] overflow-y-auto p-4 sm:p-5")}>
              <p className="text-sm leading-relaxed text-white/85 sm:text-base">
                {section.bodyCopy}
              </p>
            </div>
          </ChapterStaggerItem>
        ) : null}

        {pillars.length > 0 ? (
          <ChapterStaggerItem className="shrink-0">
            <div className="grid gap-3 sm:grid-cols-3">
              {pillars.map((pillar, i) => (
                <div key={pillar.title} className={cn(experienceGlassV2, "p-4")}>
                  <span className="font-mono text-xs text-atlas-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-1 font-serif text-base text-white">{pillar.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/75 sm:text-sm">
                    {pillar.body}
                  </p>
                </div>
              ))}
            </div>
            <AboutStatRow slide />
          </ChapterStaggerItem>
        ) : null}

        <ChapterStaggerItem className="min-h-0 flex-1">
          <ExperienceGallery
            items={section.contentBlocks?.gallery}
            layout="leadershipRow"
            slide
            className="h-full min-h-[10rem]"
          />
        </ChapterStaggerItem>
      </ChapterStagger>
    </ExperienceSlideV2>
  );
}

export function AircraftCharterPageV2({
  section,
  payload,
}: {
  section: ExperienceSectionSnapshot;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
  payload?: ProposalSnapshotPayload;
}) {
  const quote = section.contentBlocks?.quote;
  const bullets = section.contentBlocks?.introBullets ?? [];
  const calc = payload ? (normalizeAircraftList(payload)[0]?.calculationAssumptions ?? {}) : {};
  const blockHours = numOrNull(calc.charter_block_hours);
  const flightHours =
    numOrNull(calc.charter_flight_hours) ??
    (blockHours ? Math.round(blockHours / BLOCK_TO_FLIGHT_FACTOR) : null);

  return (
    <ExperienceSlideV2>
      <ChapterStagger className="grid h-full w-full grid-rows-[minmax(0,1fr)_auto] content-center gap-4 lg:grid-cols-2 lg:grid-rows-1 lg:gap-6">
        <ChapterStaggerItem className="flex min-h-0 flex-col justify-center gap-3 overflow-y-auto">
          <h1 className="font-serif text-xl text-white sm:text-2xl">{section.title}</h1>
          {quote ? <PullQuote text={quote.text} attribution={quote.attribution} slide /> : null}
          {section.bodyCopy ? (
            <p className="text-sm leading-relaxed text-white/80 sm:text-base">{section.bodyCopy}</p>
          ) : null}
          {bullets.length > 0 ? (
            <ul className="space-y-1.5">
              {bullets.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-white/75">
                  <span className="text-atlas-accent">•</span>
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
        </ChapterStaggerItem>
        <ChapterStaggerItem className="min-h-0 lg:row-span-1">
          <BlockVsFlightAnimation flightHours={flightHours} blockHours={blockHours} slide />
        </ChapterStaggerItem>
        <ChapterStaggerItem className="min-h-0 lg:col-span-2">
          <ExperienceGallery items={section.contentBlocks?.gallery} layout="single" slide />
        </ChapterStaggerItem>
      </ChapterStagger>
    </ExperienceSlideV2>
  );
}

export function AircraftManagementPageV2({
  section,
}: {
  section: ExperienceSectionSnapshot;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
}) {
  const pillars = section.contentBlocks?.pillars ?? [];
  const callout = section.contentBlocks?.callout;

  return (
    <EditorialChapterV2
      section={section}
      gallery={
        <ExperienceGallery items={section.contentBlocks?.gallery} layout="single" slide />
      }
    >
      {pillars.length > 0 ? (
        <ChapterStaggerItem className="shrink-0">
          <div className="grid gap-3 sm:grid-cols-2">
            {pillars.map((pillar, i) => (
              <div key={pillar.title} className={cn(experienceGlassV2, "p-4")}>
                <span className="font-mono text-lg text-atlas-accent/80">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-1 font-serif text-lg">{pillar.title}</h3>
                <p className="mt-1 text-sm text-white/75">{pillar.body}</p>
              </div>
            ))}
          </div>
        </ChapterStaggerItem>
      ) : null}
      {callout ? (
        <ChapterStaggerItem className="shrink-0">
          <div className="rounded-xl border border-atlas-accent/40 bg-atlas-accent/10 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-wider text-white/60">{callout.label}</p>
            <p className="mt-1 font-serif text-lg text-atlas-accent">{callout.value}</p>
          </div>
        </ChapterStaggerItem>
      ) : null}
    </EditorialChapterV2>
  );
}

export function MaintenancePageV2({
  section,
}: {
  section: ExperienceSectionSnapshot;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
}) {
  const rows = section.contentBlocks?.comparisonRows ?? [];
  const callout = section.contentBlocks?.callout;

  return (
    <EditorialChapterV2 section={section}>
      {callout ? (
        <ChapterStaggerItem className="shrink-0">
          <PullQuote text={callout.value} slide />
        </ChapterStaggerItem>
      ) : null}
      {rows.length > 0 ? (
        <ChapterStaggerItem className="shrink-0">
          <div className={cn(experienceGlassV2, "overflow-hidden")}>
            <div className="grid grid-cols-[1fr_auto_auto] gap-px bg-white/10 text-[10px] uppercase tracking-wider text-white/50 sm:text-xs">
              <div className="bg-[#0f131c] px-3 py-2">Labor cost examples</div>
              <div className="bg-[#0f131c] px-3 py-2 text-right">Other</div>
              <div className="bg-[#0f131c] px-3 py-2 text-right text-atlas-accent">PrismJet</div>
            </div>
            {rows.map((row) => (
              <div
                key={row.item}
                className="grid grid-cols-[1fr_auto_auto] gap-px border-t border-white/10 text-xs sm:text-sm"
              >
                <div className="bg-[#0f131c]/80 px-3 py-2 text-white/80">{row.item}</div>
                <div className="bg-[#0f131c]/80 px-3 py-2 text-right text-white/55">
                  {row.otherCost}
                </div>
                <div className="bg-[#0f131c]/80 px-3 py-2 text-right text-atlas-accent">
                  {row.prismjetNote}
                </div>
              </div>
            ))}
          </div>
        </ChapterStaggerItem>
      ) : null}
    </EditorialChapterV2>
  );
}

export function SalesAcquisitionsPageV2({
  section,
}: {
  section: ExperienceSectionSnapshot;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
}) {
  const tiles = section.contentBlocks?.serviceTiles ?? [];
  const quote = section.contentBlocks?.quote;

  return (
    <EditorialChapterV2
      section={section}
      gallery={
        <ExperienceGallery items={section.contentBlocks?.gallery} layout="single" slide />
      }
    >
      {quote ? (
        <ChapterStaggerItem className="shrink-0">
          <PullQuote text={quote.text} attribution={quote.attribution} slide />
        </ChapterStaggerItem>
      ) : null}
      {tiles.length > 0 ? (
        <ChapterStaggerItem className="shrink-0">
          <div className="grid gap-3 sm:grid-cols-2">
            {tiles.map((tile) => (
              <div key={tile.title} className={cn(experienceGlassV2, "p-4")}>
                <h3 className="font-serif text-base text-atlas-accent">{tile.title}</h3>
                {tile.description ? (
                  <p className="mt-1 text-sm text-white/75">{tile.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </ChapterStaggerItem>
      ) : null}
    </EditorialChapterV2>
  );
}

export function ConformityPageV2({
  section,
}: {
  section: ExperienceSectionSnapshot;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
}) {
  const blocks = section.contentBlocks ?? {};
  const introBullets = blocks.introBullets ?? [];
  const checklist = blocks.checklist ?? [];
  const timeline = blocks.timeline ?? [];

  return (
    <EditorialChapterV2 section={section}>
      {introBullets.length > 0 ? (
        <ChapterStaggerItem className="shrink-0">
          <ul className="space-y-1.5">
            {introBullets.map((b) => (
              <li key={b} className="flex gap-2 text-sm text-white/75">
                <span className="text-atlas-accent">•</span>
                {b}
              </li>
            ))}
          </ul>
        </ChapterStaggerItem>
      ) : null}
      {checklist.length > 0 ? (
        <ChapterStaggerItem className="shrink-0">
          <div className={cn(experienceGlassV2, "p-4")}>
            <p className="text-xs uppercase tracking-wider text-white/50">Checklist</p>
            <ul className="mt-2 space-y-1">
              {checklist.map((item) => (
                <li key={item.label} className="text-sm text-white/80">
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </ChapterStaggerItem>
      ) : null}
      {timeline.length > 0 ? (
        <ChapterStaggerItem className="shrink-0">
          <div className="space-y-3">
            {timeline.map((phase) => (
              <div key={phase.phase} className={cn(experienceGlassV2, "p-4")}>
                <p className="font-serif text-base text-atlas-accent">{phase.phase}</p>
                <p className="text-xs text-white/50">{phase.window}</p>
              </div>
            ))}
          </div>
        </ChapterStaggerItem>
      ) : null}
    </EditorialChapterV2>
  );
}
