import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getPortalSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { ClientShell } from "@/components/client/client-shell";

export default async function ClientSectionPage({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}) {
  const { slug, section } = await params;
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
  if (!snapshot) notFound();

  const payload = snapshot.snapshotJson as unknown as ProposalSnapshotPayload;
  const sectionData = payload.sections.find((s) => s.sectionType === section);

  if (!sectionData) notFound();

  return (
    <ClientShell slug={slug} contactName={payload.prospect.contactName}>
      <article className="max-w-3xl space-y-8">
        <Link href={`/${slug}/home`} className="text-sm text-atlas-muted hover:text-atlas-accent">
          ← Back to overview
        </Link>

        <div className="relative aspect-video overflow-hidden rounded-lg bg-atlas-surface">
          <div className="absolute inset-0 bg-gradient-to-t from-atlas-bg via-atlas-bg/40 to-transparent" />
          <div className="absolute bottom-0 p-8">
            <h1 className="font-serif text-4xl">{sectionData.title}</h1>
          </div>
        </div>

        {sectionData.calloutMetricLabel && (
          <div className="rounded-lg border border-atlas-accent/30 bg-atlas-surface p-6">
            <p className="text-xs uppercase tracking-wider text-atlas-muted">
              {sectionData.calloutMetricLabel}
            </p>
            <p className="mt-1 font-mono text-3xl text-atlas-accent">
              {sectionData.calloutMetricValue}
            </p>
          </div>
        )}

        <div className="prose prose-invert max-w-none text-atlas-muted leading-relaxed">
          {sectionData.bodyCopy?.split("\n").map((p, i) => (
            <p key={i} className="mb-4">
              {p}
            </p>
          ))}
        </div>

        <nav className="flex gap-4 border-t border-atlas-border pt-8 text-sm">
          {payload.sections.map((s) => (
            <Link
              key={s.sectionType}
              href={`/${slug}/sections/${s.sectionType}`}
              className={
                s.sectionType === section
                  ? "text-atlas-accent"
                  : "text-atlas-muted hover:text-atlas-text"
              }
            >
              {s.title}
            </Link>
          ))}
        </nav>
      </article>
    </ClientShell>
  );
}
