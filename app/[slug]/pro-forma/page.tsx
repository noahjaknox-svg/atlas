import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeClientSnapshot } from "@/lib/client-serializer";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { ClientShell } from "@/components/client/client-shell";
import { ProFormaClient } from "@/components/client/pro-forma-client";

export default async function ClientProFormaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getPortalSession();

  if (!session || session.slug !== slug) {
    redirect(`/${slug}`);
  }

  const portal = await prisma.clientPortal.findUnique({
    where: { slug },
    include: {
      proposal: {
        include: {
          snapshots: { orderBy: { versionNumber: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!portal?.active) redirect(`/${slug}`);

  const snapshot = portal.proposal.snapshots[0];
  if (!snapshot) redirect(`/${slug}`);

  const payload = snapshot.snapshotJson as unknown as ProposalSnapshotPayload;
  const client = serializeClientSnapshot(payload);

  return (
    <ClientShell slug={slug} contactName={client.prospect.contactName}>
      <ProFormaClient slug={slug} initial={client} />
    </ClientShell>
  );
}
