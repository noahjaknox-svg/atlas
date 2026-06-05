import { redirect } from "next/navigation";
import { serializeClientSnapshot } from "@/lib/client-serializer";
import {
  requirePortalSession,
  loadActivePortal,
  trackPortalView,
} from "@/lib/client-portal-load";
import { ClientShell } from "@/components/client/client-shell";
import { CloudBackground } from "@/components/client/cloud-background";
import { ProFormaClient } from "@/components/client/pro-forma-client";

export default async function ClientProFormaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ aircraft?: string }>;
}) {
  const { slug } = await params;
  const { aircraft: aircraftParam } = await searchParams;
  await requirePortalSession(slug);
  const { portal, payload, branding, clientDisplayName } = await loadActivePortal(slug);

  if (!payload) redirect(`/${slug}`);

  await trackPortalView(portal.id);
  const client = await serializeClientSnapshot(payload, {
    aircraftInstanceId: aircraftParam ?? null,
    proposalId: portal.proposalId,
  });

  const proFormaHref =
    client.aircraftList.length === 1 && client.aircraftList[0]
      ? `/${slug}/pro-forma?aircraft=${client.aircraftList[0].id}`
      : aircraftParam
        ? `/${slug}/pro-forma?aircraft=${aircraftParam}`
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
          <ProFormaClient
            slug={slug}
            initial={client}
            initialAircraftId={aircraftParam ?? client.aircraft.id}
          />
        </div>
      </CloudBackground>
    </ClientShell>
  );
}
