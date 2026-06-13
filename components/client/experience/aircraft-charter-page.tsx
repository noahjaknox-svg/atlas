import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { cn } from "@/lib/utils";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, ExperienceHeroTitle, experienceSectionGap, experienceSectionGapTight, SectionNumber } from "./experience-primitives";
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

  // Charter hours come from the full calculation assumptions on the primary aircraft.
  const calc = payload ? (normalizeAircraftList(payload)[0]?.calculationAssumptions ?? {}) : {};
  const blockHours = numOrNull(calc.charter_block_hours);
  const flightHours =
    numOrNull(calc.charter_flight_hours) ??
    (blockHours ? Math.round(blockHours / BLOCK_TO_FLIGHT_FACTOR) : null);

  return (
    <>
      <ExperienceHero>
        <RevealOnScroll immediate>
          <SectionNumber n="03" />
          <ExperienceHeroTitle>{section.title}</ExperienceHeroTitle>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        {quote ? <PullQuote text={quote.text} attribution={quote.attribution} /> : null}
        <RevealOnScroll delayMs={100}>
          <p className={cn(experienceSectionGapTight, "text-base leading-relaxed text-white/80")}>{section.bodyCopy}</p>
        </RevealOnScroll>
        {bullets.length > 0 ? (
          <RevealOnScroll delayMs={150}>
            <ul className={cn(experienceSectionGapTight, "space-y-3")}>
              {bullets.map((b) => (
                <li key={b} className="flex gap-3 text-sm text-white/75">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-atlas-accent" />
                  {b}
                </li>
              ))}
            </ul>
          </RevealOnScroll>
        ) : null}
        <RevealOnScroll delayMs={200}>
          <div className={experienceSectionGap}>
            <BlockVsFlightAnimation flightHours={flightHours} blockHours={blockHours} />
          </div>
        </RevealOnScroll>
        <ExperienceGallery
          items={section.contentBlocks?.gallery}
          layout="editorialPair"
          className="mt-6 sm:mt-8"
        />
      </ExperienceBody>
    </>
  );
}
