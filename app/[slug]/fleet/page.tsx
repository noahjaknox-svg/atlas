import { redirect } from "next/navigation";
import { requirePortalSession, loadActivePortal } from "@/lib/client-portal-load";
import { normalizeAircraftList } from "@/lib/portal-aircraft-types";

export default async function ClientFleetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requirePortalSession(slug);
  const { payload } = await loadActivePortal(slug);
  const aircraftList = payload ? normalizeAircraftList(payload) : [];
  if (aircraftList.length === 1) {
    redirect(`/${slug}/aircraft/${aircraftList[0]!.id}#prismjet-fleet`);
  }
  redirect(`/${slug}/aircraft#prismjet-fleet`);
}
