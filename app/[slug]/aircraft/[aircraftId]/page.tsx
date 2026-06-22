import { notFound } from "next/navigation";
import { loadExperiencePortalLayout } from "@/lib/experience-portal-layout";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { PortalShell } from "@/components/client/experience/portal-shell";
import { experiencePageX } from "@/components/client/experience/experience-primitives";
import { experiencePageXV2 } from "@/components/client/experience/v2/experience-tokens";
import { isExperienceRenderV2 } from "@/lib/experience-content";
import { AircraftPortalDetail } from "@/components/client/aircraft-portal-detail";
import { PrismJetFleetSection } from "@/components/client/prismjet-fleet-section";
import { cn } from "@/lib/utils";

export default async function ClientAircraftDetailPage({
  params,
}: {
  params: Promise<{ slug: string; aircraftId: string }>;
}) {
  const { slug, aircraftId } = await params;
  const { payload, content, fleet, branding, clientDisplayName, sections, disclaimer } =
    await loadExperiencePortalLayout(slug);

  const aircraftList = normalizeAircraftList(payload!);
  const aircraft = aircraftList.find((a) => a.id === aircraftId);
  if (!aircraft) notFound();

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
        <AircraftPortalDetail
          slug={slug}
          aircraft={aircraft}
          showBackToList={aircraftList.length > 1}
        />
        <PrismJetFleetSection
          title={content.fleetTitle}
          body={content.fleetBody}
          items={fleet}
        />
      </div>
    </PortalShell>
  );
}
