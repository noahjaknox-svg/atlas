import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, SectionNumber } from "./experience-primitives";
import { ExperienceGallery } from "./experience-gallery";
import { PullQuote } from "./pull-quote";

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
        <RevealOnScroll immediate>
          <SectionNumber n="04" />
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{section.title}</h1>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <RevealOnScroll>
          <p className="text-base leading-relaxed text-white/80">{section.bodyCopy}</p>
        </RevealOnScroll>
        {callout ? <PullQuote text={callout.value} /> : null}
        {rows.length > 0 ? (
          <>
            {/* Mobile: stacked cards */}
            <div className="mt-12 space-y-3 md:hidden">
              {rows.map((row) => (
                <RevealOnScroll key={row.item} delayMs={60}>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="font-medium text-white/90">{row.item}</p>
                    <div className="mt-3 flex justify-between gap-4 text-sm">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/45">Other</p>
                        <p className="mt-0.5 font-mono text-white/55">{row.otherCost}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-atlas-accent">
                          PrismJet
                        </p>
                        <p className="mt-0.5 text-atlas-accent">{row.prismjetNote}</p>
                      </div>
                    </div>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
            {/* Desktop: table */}
            <RevealOnScroll delayMs={120}>
              <div className="mt-12 hidden overflow-x-auto rounded-xl border border-white/10 md:block">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-px bg-white/10 text-xs uppercase tracking-wider text-white/50">
                    <div className="bg-[#0f131c] px-4 py-3">Labor cost examples</div>
                    <div className="bg-[#0f131c] px-4 py-3 text-right">Other</div>
                    <div className="bg-[#0f131c] px-4 py-3 text-right text-atlas-accent">
                      PrismJet
                    </div>
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
              </div>
            </RevealOnScroll>
          </>
        ) : null}
        <ExperienceGallery items={section.contentBlocks?.gallery} />
      </ExperienceBody>
    </>
  );
}
