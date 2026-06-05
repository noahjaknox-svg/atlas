import { redirect } from "next/navigation";
import { loadExperiencePortalLayout } from "@/lib/experience-portal-layout";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { ExperienceShell } from "@/components/client/experience/experience-shell";
import { experiencePageX } from "@/components/client/experience/experience-primitives";
import { CloudBackground } from "@/components/client/cloud-background";
import { AircraftPortalList } from "@/components/client/aircraft-portal-list";
import { PrismJetFleetSection } from "@/components/client/prismjet-fleet-section";
import { cn } from "@/lib/utils";

export default async function ClientAircraftPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { payload, content, fleet, branding, clientDisplayName, sections, disclaimer } =
    await loadExperiencePortalLayout(slug);

  const aircraftList = normalizeAircraftList(payload!);

  if (aircraftList.length === 1) {
    redirect(`/${slug}/aircraft/${aircraftList[0]!.id}`);
  }

  return (
    <ExperienceShell
      slug={slug}
      sections={sections}
      logoUrl={branding.logoUrl}
      clientDisplayName={clientDisplayName}
      disclaimer={disclaimer}
    >
      <CloudBackground
        imageUrl={branding.heroCloudImageUrl}
        videoUrl={branding.heroCloudVideoUrl}
        overlay="dark"
        className="min-h-[calc(100vh-var(--portal-nav-height))]"
      >
        <div className={cn("py-12", experiencePageX)}>
          <AircraftPortalList slug={slug} aircraft={aircraftList} />
          <PrismJetFleetSection
            title={content.fleetTitle}
            body={content.fleetBody}
            items={fleet}
          />
        </div>
      </CloudBackground>
    </ExperienceShell>
  );
}
