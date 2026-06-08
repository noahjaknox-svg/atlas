import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, SectionNumber } from "./experience-primitives";
import { ExperienceGallery } from "./experience-gallery";

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
      <ExperienceHero
        imageUrl={section.imageUrl ?? branding.heroCloudImageUrl}
        videoUrl={section.videoUrl ?? branding.heroCloudVideoUrl}
        posterUrl={section.posterUrl}
        kenBurns
      >
        <RevealOnScroll immediate>
          <SectionNumber n="01" />
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{section.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75">About PrismJet</p>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <RevealOnScroll>
          <p className="text-center text-base leading-relaxed text-white/80">
            {section.bodyCopy}
          </p>
        </RevealOnScroll>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {pillars.map((pillar, i) => (
            <RevealOnScroll key={pillar.title} delayMs={i * 80}>
              <div className="h-full rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-atlas-accent/30">
                <SectionNumber n={String(i + 1).padStart(2, "0")} />
                <h3 className="mt-3 font-serif text-xl text-atlas-accent">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/75">{pillar.body}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
        <ExperienceGallery items={section.contentBlocks?.gallery} />
      </ExperienceBody>
    </>
  );
}
