import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { RevealOnScroll } from "./reveal-on-scroll";
import {
  ExperienceBody,
  ExperienceHero,
  ExperienceHeroTitle,
  ExperienceSlide,
  experienceScrollCopy,
  SectionNumber,
} from "./experience-primitives";
import { ExperienceGallery } from "./experience-gallery";
import { BlockVsFlightAnimation } from "./block-vs-flight-animation";
import { PullQuote } from "./pull-quote";

const BLOCK_TO_FLIGHT_FACTOR = 1.13;

function numOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function AircraftCharterPage({
  section,
  branding,
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
    <ExperienceSlide>
      <ExperienceHero>
        <RevealOnScroll immediate>
          <SectionNumber n="03" />
          <ExperienceHeroTitle>{section.title}</ExperienceHeroTitle>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_1fr] lg:gap-6">
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
            {quote ? <PullQuote text={quote.text} attribution={quote.attribution} slide /> : null}
            <RevealOnScroll delayMs={80}>
              <div className={cn(experienceScrollCopy, "max-h-[28vh]")}>
                <p className="text-sm leading-relaxed text-white/80 sm:text-base">
                  {section.bodyCopy}
                </p>
              </div>
            </RevealOnScroll>
            {bullets.length > 0 ? (
              <RevealOnScroll delayMs={120}>
                <ul className="space-y-1.5">
                  {bullets.slice(0, 4).map((b) => (
                    <li key={b} className="flex gap-2 text-xs text-white/75 sm:text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-atlas-accent" />
                      {b}
                    </li>
                  ))}
                </ul>
              </RevealOnScroll>
            ) : null}
            <RevealOnScroll delayMs={160} className="min-h-0 flex-1">
              <BlockVsFlightAnimation flightHours={flightHours} blockHours={blockHours} slide />
            </RevealOnScroll>
          </div>
          <ExperienceGallery
            items={section.contentBlocks?.gallery}
            layout="editorialPair"
            slide
            className="min-h-0"
          />
        </div>
      </ExperienceBody>
    </ExperienceSlide>
  );
}
