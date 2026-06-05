import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, SectionNumber } from "./experience-primitives";

export function MaintenancePage({
  section,
  branding,
}: {
  section: ExperienceSectionSnapshot;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
}) {
  const rows = section.contentBlocks?.comparisonRows ?? [];
  const callout = section.contentBlocks?.callout;

  return (
    <>
      <ExperienceHero
        imageUrl={section.imageUrl ?? branding.heroCloudImageUrl}
        videoUrl={section.videoUrl ?? branding.heroCloudVideoUrl}
        posterUrl={section.posterUrl}
        kenBurns
      >
        <RevealOnScroll>
          <SectionNumber n="04" />
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{section.title}</h1>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <RevealOnScroll>
          <p className="mx-auto max-w-3xl text-base leading-relaxed text-white/80">{section.bodyCopy}</p>
        </RevealOnScroll>
        {callout ? (
          <RevealOnScroll delayMs={80}>
            <p className="mx-auto mt-8 max-w-3xl text-center font-serif text-lg text-atlas-accent">
              {callout.value}
            </p>
          </RevealOnScroll>
        ) : null}
        {rows.length > 0 ? (
          <RevealOnScroll delayMs={120}>
            <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-xl border border-white/10">
              <div className="grid grid-cols-[1fr_auto_auto] gap-px bg-white/10 text-xs uppercase tracking-wider text-white/50">
                <div className="bg-[#0f131c] px-4 py-3">Labor cost examples</div>
                <div className="bg-[#0f131c] px-4 py-3 text-right">Other</div>
                <div className="bg-[#0f131c] px-4 py-3 text-right text-atlas-accent">PrismJet</div>
              </div>
              {rows.map((row) => (
                <div
                  key={row.item}
                  className="grid grid-cols-[1fr_auto_auto] gap-px border-t border-white/10 bg-white/5 text-sm"
                >
                  <div className="bg-[#0a0d14] px-4 py-3 text-white/85">{row.item}</div>
                  <div className="bg-[#0a0d14] px-4 py-3 text-right font-mono text-white/50">
                    {row.otherCost}
                  </div>
                  <div className="bg-[#0a0d14] px-4 py-3 text-right text-atlas-accent">
                    {row.prismjetNote}
                  </div>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        ) : null}
      </ExperienceBody>
    </>
  );
}
