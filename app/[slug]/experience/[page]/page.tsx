import { redirect, notFound } from "next/navigation";
import { serializeClientSnapshot } from "@/lib/client-serializer";
import {
  requirePortalSession,
  loadActivePortal,
  trackPortalView,
} from "@/lib/client-portal-load";
import { resolveExperienceSections, resolveExperienceSection } from "@/lib/experience-resolve";
import { getSectionBySlug, SLUG_TO_SECTION_TYPE } from "@/lib/experience-content";
import { ExperienceShell } from "@/components/client/experience/experience-shell";
import { ExperiencePageContent } from "@/components/client/experience/experience-page-content";

export default async function ExperiencePageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; page: string }>;
  searchParams: Promise<{ aircraft?: string }>;
}) {
  const { slug, page } = await params;
  const { aircraft: aircraftParam } = await searchParams;

  if (!SLUG_TO_SECTION_TYPE[page]) notFound();

  await requirePortalSession(slug);
  const { portal, payload, branding, contactName, clientDisplayName } =
    await loadActivePortal(slug);

  if (!payload) redirect(`/${slug}`);

  await trackPortalView(portal.id);

  const sections = resolveExperienceSections(payload);
  const section = getSectionBySlug(sections, page);

  if (!section || !section.visible) notFound();

  const disclaimer = resolveExperienceSection(payload, "disclaimer")?.bodyCopy ?? null;

  let client;
  if (page === "pro-forma") {
    client = await serializeClientSnapshot(payload, {
      aircraftInstanceId: aircraftParam ?? null,
      proposalId: portal.proposalId,
    });
  }

  return (
    <ExperienceShell
      slug={slug}
      sections={sections}
      logoUrl={branding.logoUrl}
      clientDisplayName={clientDisplayName}
      disclaimer={disclaimer}
    >
      <ExperiencePageContent
        pageSlug={page}
        section={section}
        payload={payload}
        contactName={contactName}
        branding={branding}
        slug={slug}
        client={client}
        aircraftParam={aircraftParam}
      />
    </ExperienceShell>
  );
}
