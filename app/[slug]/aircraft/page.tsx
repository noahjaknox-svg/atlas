import { redirect } from "next/navigation";
import {
  requirePortalSession,
  loadActivePortal,
  trackPortalView,
} from "@/lib/client-portal-load";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";
import { ClientShell } from "@/components/client/client-shell";
import { CloudBackground } from "@/components/client/cloud-background";
import { AircraftPortalList } from "@/components/client/aircraft-portal-list";
import { PrismJetFleetSection } from "@/components/client/prismjet-fleet-section";

export default async function ClientAircraftPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requirePortalSession(slug);
  const { portal, payload, content, fleet, branding, clientDisplayName } =
    await loadActivePortal(slug);

  if (!payload) redirect(`/${slug}`);

  const aircraftList = normalizeAircraftList(payload);

  if (aircraftList.length === 1) {
    redirect(`/${slug}/aircraft/${aircraftList[0]!.id}`);
  }

  await trackPortalView(portal.id);

  const proFormaHref =
    aircraftList.length === 1
      ? `/${slug}/pro-forma?aircraft=${aircraftList[0]!.id}`
      : `/${slug}/pro-forma`;

  return (
    <ClientShell
      slug={slug}
      clientDisplayName={clientDisplayName}
      logoUrl={branding.logoUrl}
      proFormaHref={proFormaHref}
      variant="immersive"
    >
      <CloudBackground
        imageUrl={branding.heroCloudImageUrl}
        videoUrl={branding.heroCloudVideoUrl}
        overlay="dark"
        className="min-h-[calc(100vh-var(--portal-nav-height))]"
      >
        <div className="px-6 py-12 sm:px-12 lg:px-16">
          <AircraftPortalList slug={slug} aircraft={aircraftList} />
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
