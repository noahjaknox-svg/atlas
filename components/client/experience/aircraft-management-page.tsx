import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, SectionNumber } from "./experience-primitives";
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
      <ExperienceHero
        imageUrl={section.imageUrl ?? branding.heroCloudImageUrl}
        videoUrl={section.videoUrl ?? branding.heroCloudVideoUrl}
        posterUrl={section.posterUrl}
        kenBurns
      >
        <RevealOnScroll immediate>
          <SectionNumber n="02" />
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{section.title}</h1>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <RevealOnScroll>
          <p className="text-base leading-relaxed text-white/80">{section.bodyCopy}</p>
        </RevealOnScroll>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {pillars.map((pillar, i) => (
            <RevealOnScroll key={pillar.title} delayMs={i * 100}>
              <div className="rounded-xl border border-white/10 p-6">
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
            <div className="mt-12 max-w-3xl rounded-xl border border-atlas-accent/40 bg-atlas-accent/10 px-8 py-6 text-center">
              <p className="text-xs uppercase tracking-wider text-white/60">{callout.label}</p>
              <p className="mt-2 font-serif text-xl text-atlas-accent">{callout.value}</p>
            </div>
          </RevealOnScroll>
        ) : null}
        <ExperienceGallery items={section.contentBlocks?.gallery} />
      </ExperienceBody>
    </>
  );
}
