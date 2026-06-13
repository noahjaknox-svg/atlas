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
    <ExperienceSlide>
      <ExperienceHero>
        <RevealOnScroll immediate>
          <SectionNumber n="05" />
          <ExperienceHeroTitle>{section.title}</ExperienceHeroTitle>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody>
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_1fr] lg:gap-6">
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <RevealOnScroll>
              <p className="line-clamp-4 text-sm leading-relaxed text-white/80 sm:text-base">
                {section.bodyCopy}
              </p>
            </RevealOnScroll>
            <div className="grid min-h-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map((tile, i) => (
                <RevealOnScroll key={tile.title} delayMs={i * 50} className="min-h-0">
                  <div
                    className={cn(
                      experienceGlass,
                      "flex h-full flex-col p-3 transition-colors hover:border-atlas-accent/30 sm:p-4"
                    )}
                  >
                    <h3 className="font-serif text-base text-atlas-accent sm:text-lg">{tile.title}</h3>
                    {tile.description ? (
                      <p className="mt-1 line-clamp-3 text-xs text-white/65 sm:text-sm">
                        {tile.description}
                      </p>
                    ) : null}
                  </div>
                </RevealOnScroll>
              ))}
            </div>
            {(blocks?.contactEmail || blocks?.contactPhone || blocks?.contactWebsite) ? (
              <RevealOnScroll delayMs={160}>
                <div className="shrink-0 rounded-xl border border-atlas-accent/30 bg-gradient-to-r from-atlas-accent/15 via-atlas-accent/5 to-transparent px-4 py-3 text-center sm:px-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-atlas-accent sm:text-xs">
                    Get in touch
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs sm:text-sm">
                    {blocks?.contactEmail ? (
                      <a href={`mailto:${blocks.contactEmail}`} className="hover:text-atlas-accent">
                        {blocks.contactEmail}
                      </a>
                    ) : null}
                    {blocks?.contactPhone ? (
                      <a
                        href={`tel:${blocks.contactPhone.replace(/\D/g, "")}`}
                        className="hover:text-atlas-accent"
                      >
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
