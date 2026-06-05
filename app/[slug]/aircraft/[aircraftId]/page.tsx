import { notFound, redirect } from "next/navigation";
import {
  requirePortalSession,
  loadActivePortal,
  trackPortalView,
} from "@/lib/client-portal-load";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { ClientShell } from "@/components/client/client-shell";
import { CloudBackground } from "@/components/client/cloud-background";
import { AircraftPortalDetail } from "@/components/client/aircraft-portal-detail";
import { PrismJetFleetSection } from "@/components/client/prismjet-fleet-section";

export default async function ClientAircraftDetailPage({
  params,
}: {
  params: Promise<{ slug: string; aircraftId: string }>;
}) {
  const { slug, aircraftId } = await params;
  await requirePortalSession(slug);
  const { portal, payload, content, fleet, branding, clientDisplayName } =
    await loadActivePortal(slug);

  if (!payload) redirect(`/${slug}`);

  const aircraftList = normalizeAircraftList(payload);
  const aircraft = aircraftList.find((a) => a.id === aircraftId);
  if (!aircraft) notFound();

  await trackPortalView(portal.id);

  const proFormaHref = `/${slug}/pro-forma?aircraft=${aircraft.id}`;

  return (
    <ClientShell
      slug={slug}
      clientDisplayName={clientDisplayName}
      logoUrl={branding.logoUrl}
      proFormaHref={proFormaHref}
      variant="immersive"
    >
      <CloudBackground
        imageUrl={aircraft.portalImageUrl ?? branding.heroCloudImageUrl}
        videoUrl={aircraft.portalVideoUrl ?? branding.heroCloudVideoUrl}
        overlay="dark"
        className="min-h-[calc(100vh-var(--portal-nav-height))]"
      >
        <div className="px-6 py-12 sm:px-12 lg:px-16">
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
      </CloudBackground>
    </ClientShell>
  );
}
