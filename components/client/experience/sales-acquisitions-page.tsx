import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, SectionNumber } from "./experience-primitives";
import { ExperienceGallery } from "./experience-gallery";

export function SalesAcquisitionsPage({
  section,
  branding,
}: {
  section: ExperienceSectionSnapshot;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
}) {
  const tiles = section.contentBlocks?.serviceTiles ?? [];
  const blocks = section.contentBlocks;

  return (
    <>
      <ExperienceHero
        imageUrl={section.imageUrl ?? branding.heroCloudImageUrl}
        videoUrl={section.videoUrl ?? branding.heroCloudVideoUrl}
        posterUrl={section.posterUrl}
        kenBurns
      >
        <RevealOnScroll immediate>
          <SectionNumber n="05" />
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{section.title}</h1>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <RevealOnScroll>
          <p className="text-base leading-relaxed text-white/80">{section.bodyCopy}</p>
        </RevealOnScroll>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile, i) => (
            <RevealOnScroll key={tile.title} delayMs={i * 60}>
              <div className="h-full rounded-xl border border-white/10 p-5 transition-colors hover:border-atlas-accent/30">
                <h3 className="font-serif text-lg text-atlas-accent">{tile.title}</h3>
                {tile.description ? (
                  <p className="mt-2 text-sm text-white/65">{tile.description}</p>
                ) : null}
              </div>
            </RevealOnScroll>
          ))}
        </div>
        <RevealOnScroll delayMs={200}>
          <div className="mt-14 flex flex-wrap justify-center gap-8 border-t border-white/10 pt-10 text-center text-sm">
            {blocks?.contactWebsite ? (
              <div>
                <p className="text-xs uppercase tracking-wider text-white/45">Website</p>
                <p className="mt-1 text-atlas-accent">{blocks.contactWebsite}</p>
              </div>
            ) : null}
            {blocks?.contactEmail ? (
              <div>
                <p className="text-xs uppercase tracking-wider text-white/45">Email</p>
                <p className="mt-1">{blocks.contactEmail}</p>
              </div>
            ) : null}
            {blocks?.contactPhone ? (
              <div>
                <p className="text-xs uppercase tracking-wider text-white/45">Phone</p>
                <p className="mt-1">{blocks.contactPhone}</p>
              </div>
            ) : null}
            {blocks?.contactAddress ? (
              <div className="w-full">
                <p className="text-xs uppercase tracking-wider text-white/45">Location</p>
                <p className="mt-1 text-white/70">{blocks.contactAddress}</p>
              </div>
            ) : null}
          </div>
        </RevealOnScroll>
        <ExperienceGallery items={section.contentBlocks?.gallery} />
      </ExperienceBody>
    </>
  );
}
