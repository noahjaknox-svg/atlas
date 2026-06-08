import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, SectionNumber } from "./experience-primitives";
import { ExperienceGallery } from "./experience-gallery";
import { BlockVsFlightAnimation } from "./block-vs-flight-animation";

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
      <ExperienceHero
        imageUrl={section.imageUrl ?? branding.heroCloudImageUrl}
        videoUrl={section.videoUrl ?? branding.heroCloudVideoUrl}
        posterUrl={section.posterUrl}
        kenBurns
      >
        <RevealOnScroll immediate>
          <SectionNumber n="03" />
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{section.title}</h1>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        {quote ? (
          <RevealOnScroll>
            <blockquote className="border-l-4 border-atlas-accent pl-6 font-serif text-2xl leading-snug text-white/90 sm:text-3xl">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
          </RevealOnScroll>
        ) : null}
        <RevealOnScroll delayMs={100}>
          <p className="mt-8 text-base leading-relaxed text-white/80">{section.bodyCopy}</p>
        </RevealOnScroll>
        {bullets.length > 0 ? (
          <RevealOnScroll delayMs={150}>
            <ul className="mt-8 space-y-3">
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
          <BlockVsFlightAnimation flightHours={flightHours} blockHours={blockHours} />
        </RevealOnScroll>
        <ExperienceGallery items={section.contentBlocks?.gallery} />
      </ExperienceBody>
    </>
  );
}
