import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, ExperienceHeroTitle, experienceGlass, experienceSectionGap, SectionNumber } from "./experience-primitives";
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
    <>
      <ExperienceHero>
        <RevealOnScroll immediate>
          <SectionNumber n="01" />
          <ExperienceHeroTitle>{section.title}</ExperienceHeroTitle>
          <p className="mt-2 text-sm text-white/70 drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)]">
            About PrismJet
          </p>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <RevealOnScroll>
          <p className="text-center text-base leading-relaxed text-white/80">
            {section.bodyCopy}
          </p>
        </RevealOnScroll>
        <div className={cn(experienceSectionGap, "grid gap-5 sm:grid-cols-3 sm:gap-6")}>
          {pillars.map((pillar, i) => (
            <RevealOnScroll key={pillar.title} delayMs={i * 80}>
              <div className={cn(experienceGlass, "h-full p-6 transition-colors hover:border-atlas-accent/30")}>
                <SectionNumber n={String(i + 1).padStart(2, "0")} />
                <h3 className="mt-3 font-serif text-xl text-atlas-accent">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/75">{pillar.body}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
        <AboutStatRow />
        <ExperienceGallery items={section.contentBlocks?.gallery} layout="leadership" />
      </ExperienceBody>
    </>
  );
}
