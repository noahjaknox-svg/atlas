import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import { RevealOnScroll } from "./reveal-on-scroll";
import {
  ExperienceBody,
  ExperienceHero,
  ExperienceHeroTitle,
  ExperienceSlide,
  experienceGlass,
  experienceScrollCopy,
  SectionNumber,
} from "./experience-primitives";
import { ExperienceGallery } from "./experience-gallery";
import { AboutStatRow } from "./about-stat-row";

export function AboutUsPage({
  section,
  branding,
}: {
  section: ExperienceSectionSnapshot;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
}) {
  const pillars = section.contentBlocks?.pillars ?? [];

  return (
    <ExperienceSlide>
      <ExperienceHero>
        <RevealOnScroll immediate>
          <SectionNumber n="01" />
          <ExperienceHeroTitle>{section.title}</ExperienceHeroTitle>
          <p className="mt-1 text-xs text-white/70 sm:text-sm">About PrismJet</p>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_1.1fr] lg:gap-6">
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <RevealOnScroll>
              <div className={cn(experienceScrollCopy, "max-h-[38vh]")}>
                <p className="text-sm leading-relaxed text-white/80 sm:text-base">
                  {section.bodyCopy}
                </p>
              </div>
            </RevealOnScroll>
            <div className="grid min-h-0 flex-1 gap-2 sm:grid-cols-3 sm:gap-3">
              {pillars.map((pillar, i) => (
                <RevealOnScroll key={pillar.title} delayMs={i * 60} className="min-h-0">
                  <div
                    className={cn(
                      experienceGlass,
                      "flex h-full flex-col p-3 transition-colors hover:border-atlas-accent/30 sm:p-4"
                    )}
                  >
                    <SectionNumber n={String(i + 1).padStart(2, "0")} />
                    <h3 className="mt-1 font-serif text-base text-atlas-accent sm:text-lg">
                      {pillar.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-white/75 sm:text-sm">
                      {pillar.body}
                    </p>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
            <AboutStatRow slide />
          </div>
          <ExperienceGallery
            items={section.contentBlocks?.gallery}
            layout="leadership"
            slide
            className="min-h-0"
          />
        </div>
      </ExperienceBody>
    </ExperienceSlide>
  );
}
