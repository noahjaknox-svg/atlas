import { redirect } from "next/navigation";
import { loadExperiencePortalLayout } from "@/lib/experience-portal-layout";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { PortalShell } from "@/components/client/experience/portal-shell";
import { experiencePageX } from "@/components/client/experience/experience-primitives";
import { experiencePageXV2 } from "@/components/client/experience/v2/experience-tokens";
import { isExperienceRenderV2 } from "@/lib/experience-content";
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

  const renderV2 = isExperienceRenderV2(payload!.renderSchemaVersion);

  return (
    <PortalShell
      renderSchemaVersion={payload!.renderSchemaVersion}
      slug={slug}
      sections={sections}
      logoUrl={branding.logoUrl}
      clientDisplayName={clientDisplayName}
      disclaimer={disclaimer}
      branding={branding}
    >
      <div className={cn(renderV2 ? "overflow-y-auto py-4" : "py-12", renderV2 ? experiencePageXV2 : experiencePageX)}>
        <AircraftPortalList slug={slug} aircraft={aircraftList} />
        <PrismJetFleetSection
          title={content.fleetTitle}
          body={content.fleetBody}
          items={fleet}
        />
      </div>
    </PortalShell>
  );
}
