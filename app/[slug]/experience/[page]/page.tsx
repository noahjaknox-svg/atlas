import { redirect, notFound } from "next/navigation";
import { serializeClientSnapshot } from "@/lib/client-serializer";
import {
  requirePortalSession,
  loadActivePortal,
  trackPortalView,
} from "@/lib/client-portal-load";
import {
  resolvePortalExperienceSection,
  resolvePortalExperienceSections,
} from "@/lib/experience-portal-layout";
import { resolveFrozenSections } from "@/lib/experience-resolve";
import {
  getFirstExperienceSlug,
  getSectionBySlug,
  SLUG_TO_SECTION_TYPE,
  isExperienceRenderV2,
  type ExperienceSectionSnapshot,
} from "@/lib/experience-content";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildSnapshotPayload, type ProposalSnapshotPayload } from "@/lib/snapshot";
import { getPortalContent } from "@/lib/portal-content";
import { resolvePortalBranding } from "@/lib/portal-constants";
import { PortalShell } from "@/components/client/experience/portal-shell";
import { ExperiencePageContent } from "@/components/client/experience/experience-page-content";

type PortalBranding = {
  heroCloudImageUrl: string;
  heroCloudVideoUrl: string | null;
  logoUrl: string | null;
};

/**
 * Build the live (unpublished) payload for a staff-only draft preview. Reuses the
 * same resolution as publishing so the preview matches exactly what would be sent.
 */
async function loadDraftPreview(slug: string): Promise<{
  payload: ProposalSnapshotPayload;
  branding: PortalBranding;
  contactName: string;
  clientDisplayName: string;
  proposalId: string;
} | null> {
  const internal = await getInternalUser();
  if (!internal) return null;

  const portal = await prisma.clientPortal.findUnique({
    where: { slug },
    select: { proposalId: true },
  });
  if (!portal) return null;

  const [payload, content] = await Promise.all([
    buildSnapshotPayload(portal.proposalId),
    getPortalContent(),
  ]);

  return {
    payload,
    branding: resolvePortalBranding(content, payload.branding),
    contactName: payload.prospect.contactName,
    clientDisplayName: payload.prospect.contactName,
    proposalId: portal.proposalId,
  };
}

export default async function ExperiencePageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; page: string }>;
  searchParams: Promise<{ aircraft?: string; draft?: string }>;
}) {
  const { slug, page } = await params;
  const { aircraft: aircraftParam, draft } = await searchParams;

  if (!SLUG_TO_SECTION_TYPE[page]) notFound();

  const isDraft = draft === "1";

  let payload: ProposalSnapshotPayload | null;
  let branding: PortalBranding;
  let contactName: string;
  let clientDisplayName: string;
  let proposalId: string;
  let sections: ExperienceSectionSnapshot[];
  let disclaimer: string | null;

  if (isDraft) {
    const preview = await loadDraftPreview(slug);
    if (!preview) redirect(`/${slug}`);
    payload = preview.payload;
    branding = preview.branding;
    contactName = preview.contactName;
    clientDisplayName = preview.clientDisplayName;
    proposalId = preview.proposalId;
    sections = resolveFrozenSections(payload);
    disclaimer = sections.find((s) => s.sectionType === "disclaimer")?.bodyCopy ?? null;
  } else {
    await requirePortalSession(slug);
    const data = await loadActivePortal(slug);
    if (!data.payload) redirect(`/${slug}`);
    await trackPortalView(data.portal.id);
    payload = data.payload;
    branding = data.branding;
    contactName = data.contactName;
    clientDisplayName = data.clientDisplayName;
    proposalId = data.portal.proposalId;
    sections = await resolvePortalExperienceSections(payload);
    disclaimer = (await resolvePortalExperienceSection(payload, "disclaimer"))?.bodyCopy ?? null;
  }

  const section = getSectionBySlug(sections, page);

  if (!section || !section.visible) {
    const fallbackSlug = getFirstExperienceSlug(sections);
    const draftQs = isDraft ? "draft=1" : "";
    const aircraftQs = aircraftParam ? `aircraft=${encodeURIComponent(aircraftParam)}` : "";
    const qs = [draftQs, aircraftQs].filter(Boolean).join("&");
    if (page !== fallbackSlug) {
      redirect(`/${slug}/experience/${fallbackSlug}${qs ? `?${qs}` : ""}`);
    }
    notFound();
  }

  let client;
  if (page === "pro-forma") {
    client = await serializeClientSnapshot(payload, {
      aircraftInstanceId: aircraftParam ?? null,
      proposalId,
    });
  }

  const renderV2 = isExperienceRenderV2(payload.renderSchemaVersion);

  let initialClientSnapshot = null;
  if (renderV2) {
    if (page === "pro-forma" && client) {
      initialClientSnapshot = client;
    } else if (isDraft) {
      initialClientSnapshot = await serializeClientSnapshot(payload, {
        aircraftInstanceId: aircraftParam ?? null,
        proposalId,
      });
    }
  }

  return (
    <PortalShell
      renderSchemaVersion={payload.renderSchemaVersion}
      slug={slug}
      sections={sections}
      logoUrl={branding.logoUrl ?? undefined}
      clientDisplayName={clientDisplayName}
      disclaimer={disclaimer}
      branding={branding}
      draftMode={isDraft}
      experienceBootstrap={
        renderV2
          ? {
              payload,
              contactName,
              initialPageSlug: page,
              aircraftParam: aircraftParam ?? null,
              initialClientSnapshot,
              proposalId,
            }
          : undefined
      }
    >
      {!renderV2 ? (
        <ExperiencePageContent
          pageSlug={page}
          section={section}
          payload={payload}
          contactName={contactName}
          branding={branding}
          slug={slug}
          client={client}
          aircraftParam={aircraftParam}
          renderV2={false}
        />
      ) : null}
    </PortalShell>
  );
}
