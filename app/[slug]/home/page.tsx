import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeClientSnapshot } from "@/lib/client-serializer";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { ClientShell } from "@/components/client/client-shell";
import { MetricCards } from "@/components/client/metric-cards";
import { Button } from "@/components/ui/button";

export default async function ClientHomePage({
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
  if (!snapshot) {
    return <div className="p-12 text-center text-atlas-muted">Proposal not yet published.</div>;
  }

  await prisma.clientPortal.update({
    where: { id: portal.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });

  const payload = snapshot.snapshotJson as unknown as ProposalSnapshotPayload;
  const client = serializeClientSnapshot(payload);

  return (
    <ClientShell slug={slug} contactName={client.prospect.contactName}>
      <div className="space-y-12">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-atlas-accent">Your Atlas Proposal</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight">
            Your Aircraft Management Outlook
          </h1>
          <p className="mt-4 max-w-2xl text-atlas-muted">
            Prepared for {client.prospect.contactName}
            {client.aircraft.model && ` · ${client.aircraft.model}`}
            {client.aircraft.tailNumber && ` · ${client.aircraft.tailNumber}`}
          </p>
        </div>

        <MetricCards metrics={client.baseMetrics} />

        <div className="flex flex-wrap gap-4">
          <Link href={`/${slug}/pro-forma`}>
            <Button size="lg">View Atlas Pro Forma</Button>
          </Link>
          <Button variant="secondary" size="lg" asChild>
            <a href="mailto:info@prismjet.com">Schedule a Call</a>
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="font-serif text-xl">Proposal Sections</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {client.sections.map((s) => (
              <li key={s.sectionType}>
                <Link
                  href={`/${slug}/sections/${s.sectionType}`}
                  className="block rounded-lg border border-atlas-border px-4 py-3 hover:border-atlas-accent"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ClientShell>
  );
}
