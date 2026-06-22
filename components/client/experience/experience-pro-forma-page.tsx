import type { ClientSnapshotView } from "@/lib/client-serializer";
import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { cn } from "@/lib/utils";
import { interpolateExperienceCopy } from "@/lib/experience-defaults";
import { ProFormaClient } from "@/components/client/pro-forma-client";
import { RevealOnScroll } from "./reveal-on-scroll";
import {
  ExperienceBody,
  ExperienceHero,
  ExperienceHeroTitle,
  ExperienceSlide,
  experienceScrollCopy,
  SectionNumber,
} from "./experience-primitives";

export function ExperienceProFormaPage({
  slug,
  section,
  client,
  branding,
  aircraftParam,
  contactName,
}: {
  slug: string;
  section: ExperienceSectionSnapshot;
  client: ClientSnapshotView;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null };
  aircraftParam?: string | null;
  contactName: string;
}) {
  const bodyCopy = interpolateExperienceCopy(section.bodyCopy, {
    contactName,
    aircraftName: client.aircraft.label,
  });

  return (
    <ExperienceSlide>
      <ExperienceHero>
        <RevealOnScroll immediate>
          <SectionNumber n="07" />
          <ExperienceHeroTitle>{section.title}</ExperienceHeroTitle>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody fullWidth className="!py-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {bodyCopy ? (
            <RevealOnScroll>
              <div className={cn(experienceScrollCopy, "mb-2 max-h-[12vh]")}>
                <p className="max-w-3xl text-xs leading-relaxed text-white/65 sm:text-sm">
                  {bodyCopy}
                </p>
              </div>
            </RevealOnScroll>
          ) : null}
          <div className="min-h-0 flex-1 overflow-hidden">
            <ProFormaClient
              slug={slug}
              initial={client}
              initialAircraftId={aircraftParam ?? client.aircraft.id}
              embedded
              experiencePath
              slide
            />
          </div>
        </div>
      </ExperienceBody>
    </ExperienceSlide>
  );
}
