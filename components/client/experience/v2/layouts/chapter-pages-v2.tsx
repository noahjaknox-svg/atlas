"use client";

import { cn } from "@/lib/utils";
import type { ExperienceGalleryItem, ExperienceSectionSnapshot } from "@/lib/experience-content";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { experienceGlassV2 } from "../experience-tokens";
import {
  ChapterBody,
  ChapterGrid2Col,
  ChapterHeader,
  ChapterSection,
} from "../chapter-layout-primitives";
import { ChapterStagger, ChapterStaggerItem } from "../chapter-transition";
import { ExperienceSlideV2 } from "./experience-slide-v2";
import { ExperienceGallery } from "../../experience-gallery";
import { LeadershipRowGrid } from "../../leadership-row-grid";
import { ProposalImage } from "../../proposal-image";
import { PullQuote } from "../../pull-quote";
import { BlockVsFlightAnimation } from "../../block-vs-flight-animation";
import { AboutStatRow } from "../../about-stat-row";

const BLOCK_TO_FLIGHT_FACTOR = 1.13;

function numOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function LeadershipMobileStrip({ items }: { items: ExperienceGalleryItem[] }) {
  const row = items.slice(0, 4);
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory scrollbar-none lg:hidden">
      {row.map((item, index) => (
        <div
          key={`${item.url}-${index}`}
          className="aspect-square w-[9.5rem] min-w-[9.5rem] shrink-0 snap-start sm:w-[11rem] sm:min-w-[11rem]"
        >
          <ProposalImage
            src={item.url}
            alt={item.caption ?? ""}
            caption={item.caption}
            variant="portrait-standard"
            sizing="fill"
            frameClassName="h-full w-full"
          />
        </div>
      ))}
    </div>
  );
}

function ConformityTimeline({
  timeline,
}: {
  timeline: NonNullable<
    NonNullable<ExperienceSectionSnapshot["contentBlocks"]>["timeline"]
  >;
}) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute left-4 right-4 top-4 hidden h-px bg-white/20 lg:block"
        aria-hidden
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
        {timeline.map((phase, index) => (
          <div key={phase.phase} className="relative flex gap-3 lg:block lg:pt-0">
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-atlas-accent/40 bg-[#0B0F1A] font-mono text-xs text-atlas-accent lg:mb-3">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="font-serif text-sm text-atlas-accent sm:text-base">{phase.phase}</p>
              <p className="mt-0.5 text-xs text-white/50">{phase.window}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
      <ChapterStagger className="flex w-full flex-col gap-4 lg:gap-6">
        <ChapterStaggerItem>
          <ChapterHeader title={section.title} />
        </ChapterStaggerItem>

        {section.bodyCopy ? (
          <ChapterStaggerItem>
            <ChapterBody clampLines={8}>{section.bodyCopy}</ChapterBody>
          </ChapterStaggerItem>
        ) : null}

        {children}

        {gallery ? <ChapterStaggerItem>{gallery}</ChapterStaggerItem> : null}
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
  const galleryItems = section.contentBlocks?.gallery ?? [];

  return (
    <ExperienceSlideV2>
      <ChapterStagger className="flex w-full flex-col gap-4 lg:gap-6">
        <ChapterStaggerItem>
          <ChapterHeader title={section.title} />
        </ChapterStaggerItem>

        <ChapterStaggerItem>
          <ChapterGrid2Col>
            <ChapterSection>
              {section.bodyCopy ? (
                <ChapterBody clampLines={8}>{section.bodyCopy}</ChapterBody>
              ) : null}

              {pillars.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
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
              ) : null}

              <AboutStatRow slide />
            </ChapterSection>

            {galleryItems.length > 0 ? (
              <div className="min-w-0">
                <LeadershipMobileStrip items={galleryItems} />
                <div className="hidden lg:block">
                  <LeadershipRowGrid
                    items={galleryItems}
                    slide
                    maxItems={4}
                    className="[&>div:last-of-type]:grid-cols-2 [&>div:last-of-type]:sm:grid-cols-2"
                  />
                </div>
              </div>
            ) : null}
          </ChapterGrid2Col>
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
      <ChapterStagger className="flex w-full flex-col gap-4 lg:gap-6">
        <ChapterStaggerItem>
          <ChapterHeader title={section.title} />
        </ChapterStaggerItem>

        <ChapterStaggerItem>
          <ChapterGrid2Col>
            <ChapterSection>
              {quote ? (
                <PullQuote text={quote.text} attribution={quote.attribution} slide />
              ) : null}
              {section.bodyCopy ? (
                <p className="text-sm leading-relaxed text-white/80 sm:text-base">
                  {section.bodyCopy}
                </p>
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
            </ChapterSection>

            <ChapterSection className="lg:sticky lg:top-4 lg:self-start">
              <BlockVsFlightAnimation flightHours={flightHours} blockHours={blockHours} slide />
              <ExperienceGallery items={section.contentBlocks?.gallery} layout="single" slide />
            </ChapterSection>
          </ChapterGrid2Col>
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
    <ExperienceSlideV2>
      <ChapterStagger className="flex w-full flex-col gap-4 lg:gap-6">
        <ChapterStaggerItem>
          <ChapterHeader title={section.title} />
        </ChapterStaggerItem>

        <ChapterStaggerItem>
          <ChapterGrid2Col>
            <ChapterSection>
              {section.bodyCopy ? (
                <ChapterBody clampLines={8}>{section.bodyCopy}</ChapterBody>
              ) : null}

              {pillars.length > 0 ? (
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
              ) : null}

              {callout ? (
                <div className="rounded-xl border border-atlas-accent/40 bg-atlas-accent/10 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-wider text-white/60">{callout.label}</p>
                  <p className="mt-1 font-serif text-lg text-atlas-accent">{callout.value}</p>
                </div>
              ) : null}
            </ChapterSection>

            <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
              <ExperienceGallery items={section.contentBlocks?.gallery} layout="single" slide />
            </div>
          </ChapterGrid2Col>
        </ChapterStaggerItem>
      </ChapterStagger>
    </ExperienceSlideV2>
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
    <ExperienceSlideV2>
      <ChapterStagger className="flex w-full flex-col gap-4 lg:gap-6">
        <ChapterStaggerItem>
          <ChapterHeader title={section.title} />
        </ChapterStaggerItem>

        {(section.bodyCopy || callout) && (
          <ChapterStaggerItem>
            <ChapterSection className="max-w-3xl">
              {section.bodyCopy ? (
                <ChapterBody>{section.bodyCopy}</ChapterBody>
              ) : null}
              {callout ? <PullQuote text={callout.value} slide /> : null}
            </ChapterSection>
          </ChapterStaggerItem>
        )}

        {rows.length > 0 ? (
          <ChapterStaggerItem>
            <div className={cn(experienceGlassV2, "w-full overflow-x-auto")}>
              <div className="grid min-w-[20rem] grid-cols-[minmax(0,1.5fr)_minmax(5rem,1fr)_minmax(5rem,1fr)] gap-px bg-white/10 text-[10px] uppercase tracking-wider text-white/50 sm:min-w-0 sm:text-xs md:grid-cols-[minmax(0,2fr)_minmax(6rem,1fr)_minmax(6rem,1fr)]">
                <div className="bg-[#0f131c] px-3 py-2 sm:px-4 sm:py-3">Labor cost examples</div>
                <div className="bg-[#0f131c] px-3 py-2 text-right sm:px-4 sm:py-3">Other</div>
                <div className="bg-[#0f131c] px-3 py-2 text-right text-atlas-accent sm:px-4 sm:py-3">
                  PrismJet
                </div>
              </div>
              {rows.map((row) => (
                <div
                  key={row.item}
                  className="grid min-w-[20rem] grid-cols-[minmax(0,1.5fr)_minmax(5rem,1fr)_minmax(5rem,1fr)] gap-px border-t border-white/10 text-xs sm:min-w-0 sm:text-sm md:grid-cols-[minmax(0,2fr)_minmax(6rem,1fr)_minmax(6rem,1fr)]"
                >
                  <div className="bg-[#0f131c]/80 px-3 py-2 text-white/80 sm:px-4 sm:py-3">
                    {row.item}
                  </div>
                  <div className="bg-[#0f131c]/80 px-3 py-2 text-right text-white/55 sm:px-4 sm:py-3">
                    {row.otherCost}
                  </div>
                  <div className="bg-[#0f131c]/80 px-3 py-2 text-right text-atlas-accent sm:px-4 sm:py-3">
                    {row.prismjetNote}
                  </div>
                </div>
              ))}
            </div>
          </ChapterStaggerItem>
        ) : null}
      </ChapterStagger>
    </ExperienceSlideV2>
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
  const showQuote = quote && !section.bodyCopy;

  return (
    <ExperienceSlideV2>
      <ChapterStagger className="flex w-full flex-col gap-4 lg:gap-6">
        <ChapterStaggerItem>
          <ChapterHeader title={section.title} />
        </ChapterStaggerItem>

        <ChapterStaggerItem>
          <ChapterGrid2Col className="lg:grid-cols-[1fr_minmax(280px,38%)]">
            <ChapterSection>
              {section.bodyCopy ? (
                <ChapterBody clampLines={8}>{section.bodyCopy}</ChapterBody>
              ) : null}

              {showQuote ? (
                <PullQuote text={quote.text} attribution={quote.attribution} slide />
              ) : null}

              {tiles.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tiles.map((tile) => (
                    <div key={tile.title} className={cn(experienceGlassV2, "p-4")}>
                      <h3 className="font-serif text-base text-atlas-accent">{tile.title}</h3>
                      {tile.description ? (
                        <p className="mt-1 text-sm text-white/75">{tile.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </ChapterSection>

            <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
              <ExperienceGallery items={section.contentBlocks?.gallery} layout="single" slide />
            </div>
          </ChapterGrid2Col>
        </ChapterStaggerItem>
      </ChapterStagger>
    </ExperienceSlideV2>
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
    <ExperienceSlideV2>
      <ChapterStagger className="flex w-full flex-col gap-4 lg:gap-6">
        <ChapterStaggerItem>
          <ChapterHeader title={section.title} />
        </ChapterStaggerItem>

        {section.bodyCopy ? (
          <ChapterStaggerItem>
            <ChapterBody clampLines={8}>{section.bodyCopy}</ChapterBody>
          </ChapterStaggerItem>
        ) : null}

        <ChapterStaggerItem>
          <ChapterGrid2Col>
            <ChapterSection>
              {introBullets.length > 0 ? (
                <ul className="space-y-1.5">
                  {introBullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-white/75">
                      <span className="text-atlas-accent">•</span>
                      {b}
                    </li>
                  ))}
                </ul>
              ) : null}

              {checklist.length > 0 ? (
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
              ) : null}
            </ChapterSection>

            {timeline.length > 0 ? (
              <div className={cn(experienceGlassV2, "p-4 sm:p-5")}>
                <p className="mb-4 text-xs uppercase tracking-wider text-white/50">Timeline</p>
                <ConformityTimeline timeline={timeline} />
              </div>
            ) : null}
          </ChapterGrid2Col>
        </ChapterStaggerItem>
      </ChapterStagger>
    </ExperienceSlideV2>
  );
}
