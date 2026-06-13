import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, ExperienceHeroTitle, experienceGlass, experienceSectionGap, experienceSectionGapTight, SectionNumber } from "./experience-primitives";
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
      <ExperienceHero>
        <RevealOnScroll immediate>
          <SectionNumber n="05" />
          <ExperienceHeroTitle>{section.title}</ExperienceHeroTitle>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <RevealOnScroll>
          <p className="text-base leading-relaxed text-white/80">{section.bodyCopy}</p>
        </RevealOnScroll>
        <div className={cn(experienceSectionGap, "grid gap-4 sm:grid-cols-2 lg:grid-cols-3")}>
          {tiles.map((tile, i) => (
            <RevealOnScroll key={tile.title} delayMs={i * 60}>
              <div className={cn(experienceGlass, "h-full p-5 transition-colors hover:border-atlas-accent/30")}>
                <h3 className="font-serif text-lg text-atlas-accent">{tile.title}</h3>
                {tile.description ? (
                  <p className="mt-2 text-sm text-white/65">{tile.description}</p>
                ) : null}
              </div>
            </RevealOnScroll>
          ))}
        </div>
        {(blocks?.contactEmail || blocks?.contactPhone || blocks?.contactWebsite) ? (
          <RevealOnScroll delayMs={200}>
            <div className={cn(experienceSectionGapTight, "rounded-xl border border-atlas-accent/30 bg-gradient-to-r from-atlas-accent/15 via-atlas-accent/5 to-transparent px-6 py-8 text-center sm:px-10")}>
              <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">Get in touch</p>
              <div className="mt-6 flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm">
                {blocks?.contactEmail ? (
                  <a href={`mailto:${blocks.contactEmail}`} className="hover:text-atlas-accent">
                    {blocks.contactEmail}
                  </a>
                ) : null}
                {blocks?.contactPhone ? (
                  <a href={`tel:${blocks.contactPhone.replace(/\D/g, "")}`} className="hover:text-atlas-accent">
                    {blocks.contactPhone}
                  </a>
                ) : null}
                {blocks?.contactWebsite ? (
                  <a
                    href={
                      blocks.contactWebsite.startsWith("http")
                        ? blocks.contactWebsite
                        : `https://${blocks.contactWebsite}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-atlas-accent hover:underline"
                  >
                    {blocks.contactWebsite}
                  </a>
                ) : null}
              </div>
              {blocks?.contactAddress ? (
                <p className="mt-4 text-xs text-white/55">{blocks.contactAddress}</p>
              ) : null}
            </div>
          </RevealOnScroll>
        ) : null}
        <ExperienceGallery
          items={section.contentBlocks?.gallery}
          layout="single"
          variant="landscape-wide"
          className="mt-6 sm:mt-8"
        />
      </ExperienceBody>
    </>
  );
}
