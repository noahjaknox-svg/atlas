import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { RevealOnScroll } from "./reveal-on-scroll";
import {
  ExperienceBody,
  ExperienceHero,
  ExperienceHeroTitle,
  ExperienceSlide,
  SectionNumber,
} from "./experience-primitives";
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
    <ExperienceSlide>
      <ExperienceHero>
        <RevealOnScroll immediate>
          <SectionNumber n="04" />
          <ExperienceHeroTitle>{section.title}</ExperienceHeroTitle>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <RevealOnScroll>
              <p className="line-clamp-3 text-sm leading-relaxed text-white/80 sm:text-base">
                {section.bodyCopy}
              </p>
            </RevealOnScroll>
            {callout ? <PullQuote text={callout.value} slide /> : null}
            {rows.length > 0 ? (
              <RevealOnScroll delayMs={100} className="min-h-0 flex-1 overflow-hidden">
                <div className="h-full overflow-hidden rounded-xl border border-white/10">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-px bg-white/10 text-[10px] uppercase tracking-wider text-white/50 sm:text-xs">
                    <div className="bg-[#0f131c] px-3 py-2">Labor cost examples</div>
                    <div className="bg-[#0f131c] px-3 py-2 text-right">Other</div>
                    <div className="bg-[#0f131c] px-3 py-2 text-right text-atlas-accent">
                      PrismJet
                    </div>
                  </div>
                  {rows.slice(0, 5).map((row) => (
                    <div
                      key={row.item}
                      className="grid grid-cols-[1fr_auto_auto] gap-px border-t border-white/10 bg-white/5 text-xs sm:text-sm"
                    >
                      <div className="bg-[#0a0d14] px-3 py-2 text-white/85">{row.item}</div>
                      <div className="bg-[#0a0d14] px-3 py-2 text-right font-mono text-white/50">
                        {row.otherCost}
                      </div>
                      <div className="bg-[#0a0d14] px-3 py-2 text-right text-atlas-accent">
                        {row.prismjetNote}
                      </div>
                    </div>
                  ))}
                </div>
              </RevealOnScroll>
            ) : null}
          </div>
          <ExperienceGallery
            items={section.contentBlocks?.gallery}
            layout="single"
            variant="landscape-wide"
            slide
            className="min-h-0"
          />
        </div>
      </ExperienceBody>
    </ExperienceSlide>
  );
}
