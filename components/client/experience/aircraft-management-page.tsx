import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import { RevealOnScroll } from "./reveal-on-scroll";
import {
  ExperienceBody,
  ExperienceHero,
  ExperienceHeroTitle,
  ExperienceSlide,
  experienceGlass,
  SectionNumber,
} from "./experience-primitives";
import { ExperienceGallery } from "./experience-gallery";

export function AircraftManagementPage({
  section,
  branding,
}: {
  section: ExperienceSectionSnapshot;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
}) {
  const pillars = section.contentBlocks?.pillars ?? [];
  const callout = section.contentBlocks?.callout;

  return (
    <ExperienceSlide>
      <ExperienceHero>
        <RevealOnScroll immediate>
          <SectionNumber n="02" />
          <ExperienceHeroTitle>{section.title}</ExperienceHeroTitle>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_1fr] lg:gap-6">
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <RevealOnScroll>
              <p className="line-clamp-5 text-sm leading-relaxed text-white/80 sm:text-base">
                {section.bodyCopy}
              </p>
            </RevealOnScroll>
            <div className="grid min-h-0 flex-1 gap-2 sm:grid-cols-2 sm:gap-3">
              {pillars.map((pillar, i) => (
                <RevealOnScroll key={pillar.title} delayMs={i * 80} className="min-h-0">
                  <div className={cn(experienceGlass, "flex h-full flex-col p-3 sm:p-4")}>
                    <span className="font-mono text-lg text-atlas-accent/80 sm:text-xl">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-1 font-serif text-lg sm:text-xl">{pillar.title}</h3>
                    <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-white/75 sm:text-sm">
                      {pillar.body}
                    </p>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
            {callout ? (
              <RevealOnScroll delayMs={160}>
                <div className="shrink-0 rounded-xl border border-atlas-accent/40 bg-atlas-accent/10 px-4 py-3 text-center sm:px-6">
                  <p className="text-[10px] uppercase tracking-wider text-white/60 sm:text-xs">
                    {callout.label}
                  </p>
                  <p className="mt-1 font-serif text-base text-atlas-accent sm:text-lg">
                    {callout.value}
                  </p>
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
