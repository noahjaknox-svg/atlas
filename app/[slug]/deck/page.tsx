import { requirePortalSession, loadActivePortal, trackPortalView } from "@/lib/client-portal-load";
import { enrichSnapshotAircraftList } from "@/lib/portal-calculation-assumptions";
import { ClientShell } from "@/components/client/client-shell";
import { DeckPresentation } from "@/components/client/deck-presentation";

export default async function ClientDeckPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requirePortalSession(slug);
  const { portal, payload, branding, clientDisplayName, contactName } =
    await loadActivePortal(slug);

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0D14] text-white/60">
        Proposal not yet published.
      </div>
    );
  }

  await trackPortalView(portal.id);

  const deckPayload = await enrichSnapshotAircraftList(portal.proposalId, payload);

  return (
    <ClientShell
      slug={slug}
      clientDisplayName={clientDisplayName}
      logoUrl={branding.logoUrl}
      variant="immersive"
    >
      <DeckPresentation
        slug={slug}
        payload={deckPayload}
        contactName={contactName}
        branding={branding}
      />
    </ClientShell>
  );
}
