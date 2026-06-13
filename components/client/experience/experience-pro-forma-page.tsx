import type { ClientSnapshotView } from "@/lib/client-serializer";
import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { interpolateExperienceCopy } from "@/lib/experience-defaults";
import { ProFormaClient } from "@/components/client/pro-forma-client";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, ExperienceHeroTitle, SectionNumber } from "./experience-primitives";

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
    <>
      <ExperienceHero>
        <RevealOnScroll immediate>
          <SectionNumber n="07" />
          <ExperienceHeroTitle>{section.title}</ExperienceHeroTitle>
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody fullWidth className="!pt-6">
        {bodyCopy ? (
          <RevealOnScroll>
            <p className="mb-8 max-w-3xl text-sm leading-relaxed text-white/65 sm:mb-10">
              {bodyCopy}
            </p>
          </RevealOnScroll>
        ) : null}
        <ProFormaClient
          slug={slug}
          initial={client}
          initialAircraftId={aircraftParam ?? client.aircraft.id}
          embedded
          experiencePath
        />
      </ExperienceBody>
    </>
  );
}
