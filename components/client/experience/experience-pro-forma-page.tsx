import type { ClientSnapshotView } from "@/lib/client-serializer";
import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { interpolateExperienceCopy } from "@/lib/experience-defaults";
import { ProFormaClient } from "@/components/client/pro-forma-client";
import { RevealOnScroll } from "./reveal-on-scroll";
import { ExperienceBody, ExperienceHero, SectionNumber } from "./experience-primitives";

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
      <ExperienceHero
        imageUrl={section.imageUrl ?? branding.heroCloudImageUrl}
        videoUrl={section.videoUrl ?? branding.heroCloudVideoUrl}
        posterUrl={section.posterUrl}
      >
        <RevealOnScroll immediate>
          <SectionNumber n="07" />
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{section.title}</h1>
          {bodyCopy ? (
            <p className="mt-4 max-w-2xl text-base text-white/75">{bodyCopy}</p>
          ) : null}
        </RevealOnScroll>
      </ExperienceHero>
      <ExperienceBody fullWidth>
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
