import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, ExperienceHeroTitle, experienceGlass, experienceSectionGap, SectionNumber } from "./experience-primitives";
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
    <>
      <ExperienceHero>
        <RevealOnScroll immediate>
          <SectionNumber n="02" />
          <ExperienceHeroTitle>{section.title}</ExperienceHeroTitle>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <RevealOnScroll>
          <p className="text-base leading-relaxed text-white/80">{section.bodyCopy}</p>
        </RevealOnScroll>
        <div className={cn(experienceSectionGap, "grid gap-6 md:grid-cols-2 md:gap-8")}>
          {pillars.map((pillar, i) => (
            <RevealOnScroll key={pillar.title} delayMs={i * 100}>
              <div className={cn(experienceGlass, "p-6")}>
                <span className="font-mono text-2xl text-atlas-accent/80">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-serif text-2xl">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/75">{pillar.body}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
        {callout ? (
          <RevealOnScroll delayMs={200}>
            <div className={cn(experienceSectionGap, "max-w-3xl rounded-xl border border-atlas-accent/40 bg-atlas-accent/10 px-8 py-6 text-center")}>
              <p className="text-xs uppercase tracking-wider text-white/60">{callout.label}</p>
              <p className="mt-2 font-serif text-xl text-atlas-accent">{callout.value}</p>
            </div>
          </RevealOnScroll>
        ) : null}
        <ExperienceGallery
          items={section.contentBlocks?.gallery}
          layout="single"
          variant="landscape-wide"
        />
      </ExperienceBody>
    </>
  );
}
