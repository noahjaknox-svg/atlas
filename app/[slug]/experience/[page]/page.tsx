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
  isExperienceRenderV2,
  type ExperienceSectionSnapshot,
} from "@/lib/experience-content";
import { verifyDesignerPreviewToken } from "@/lib/portal-designer-preview-token";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildSnapshotPayload, type ProposalSnapshotPayload } from "@/lib/snapshot";
import { getPortalContent } from "@/lib/portal-content";
import { resolvePortalBranding } from "@/lib/portal-constants";
import { resolveLayoutSettings } from "@/lib/portal-layout-settings";
import { PortalShell } from "@/components/client/experience/portal-shell";
import { ExperiencePageContent } from "@/components/client/experience/experience-page-content";

export const dynamic = "force-dynamic";

type PortalBranding = {
  heroCloudImageUrl: string;
  heroCloudVideoUrl: string | null;
  logoUrl: string | null;
};

/**
 * Build the live (unpublished) payload for a staff-only draft preview. Reuses the
 * same resolution as publishing so the preview matches exactly what would be sent.
 */
async function loadDraftPreview(
  slug: string,
  resolveScope:
    | { mode: "none" }
    | { mode: "primary" }
    | { mode: "aircraft"; aircraftId: string }
): Promise<{
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
    select: {
      proposalId: true,
      proposal: {
        select: {
          aircraftInstanceId: true,
          aircraft: {
            where: { includedOnProposal: true },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });
  if (!portal) return null;

  let fullyResolveAircraftIds: string[] | undefined;
  if (resolveScope.mode === "none") {
    fullyResolveAircraftIds = [];
  } else if (resolveScope.mode === "aircraft") {
    fullyResolveAircraftIds = [resolveScope.aircraftId];
  } else {
    const primaryId =
      portal.proposal.aircraftInstanceId ?? portal.proposal.aircraft[0]?.id ?? null;
    fullyResolveAircraftIds = primaryId ? [primaryId] : [];
  }

  const [payload, content] = await Promise.all([
    buildSnapshotPayload(portal.proposalId, { fullyResolveAircraftIds }),
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
  searchParams: Promise<{ aircraft?: string; draft?: string; previewToken?: string }>;
}) {
  const { slug, page } = await params;
  const { aircraft: aircraftParam, draft, previewToken } = await searchParams;

  const isDraft = draft === "1";
  const previewFromToken = previewToken
    ? await verifyDesignerPreviewToken(previewToken)
    : null;
  const isStaffPreview = isDraft || !!previewFromToken;

  let payload: ProposalSnapshotPayload | null;
  let branding: PortalBranding;
  let contactName: string;
  let clientDisplayName: string;
  let proposalId: string;
  let sections: ExperienceSectionSnapshot[];
  let disclaimer: string | null;

  if (previewFromToken) {
    const internal = await getInternalUser();
    if (!internal) redirect(`/${slug}`);
    const preview = await loadDraftPreview(slug, { mode: "none" });
    if (!preview) notFound();
    payload = {
      ...preview.payload,
      sections: previewFromToken.payload.sections as ProposalSnapshotPayload["sections"],
      renderSchemaVersion: previewFromToken.payload.renderSchemaVersion ?? 3,
    };
    if (previewFromToken.payload.hero?.clientSummary) {
      payload = {
        ...payload,
        proposal: { ...payload.proposal, clientSummary: previewFromToken.payload.hero.clientSummary },
        aircraft: { ...payload.aircraft, clientSummary: previewFromToken.payload.hero.clientSummary },
      };
    }
    branding = preview.branding;
    contactName = preview.contactName;
    clientDisplayName = preview.clientDisplayName;
    proposalId = previewFromToken.proposalId;
    sections = previewFromToken.payload.sections as ExperienceSectionSnapshot[];
    disclaimer = sections.find((s) => s.sectionType === "disclaimer")?.bodyCopy ?? null;
  } else if (isDraft) {
    const resolveScope =
      page === "pro-forma"
        ? aircraftParam
          ? { mode: "aircraft" as const, aircraftId: aircraftParam }
          : { mode: "primary" as const }
        : { mode: "none" as const };
    const preview = await loadDraftPreview(slug, resolveScope);
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
    branding = resolvePortalBranding(data.content, payload.branding, {
      preferSnapshot: true,
    });
    contactName = data.contactName;
    clientDisplayName = data.clientDisplayName;
    proposalId = data.portal.proposalId;
    sections = await resolvePortalExperienceSections(payload);
    disclaimer = (await resolvePortalExperienceSection(payload, "disclaimer"))?.bodyCopy ?? null;
  }

  const section = getSectionBySlug(sections, page);

  if (!section) notFound();

  // Staff draft preview shows the requested page even when it is toggled off for clients.
  if (!isStaffPreview && !section.visible) {
    const fallbackSlug = getFirstExperienceSlug(sections);
    const draftQs = "";
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
      proposalId,
      aircraftInstanceId: aircraftParam ?? null,
      useLiveWorkspace: isStaffPreview,
    });
  }

  const renderV2 = isExperienceRenderV2(payload.renderSchemaVersion);

  let initialClientSnapshot = null;
  if (renderV2 && page === "pro-forma" && client) {
    initialClientSnapshot = client;
  }

  const layoutSettings = resolveLayoutSettings(payload.branding?.layoutSettings);

  return (
    <PortalShell
      renderSchemaVersion={payload.renderSchemaVersion}
      slug={slug}
      sections={sections}
      logoUrl={branding.logoUrl ?? undefined}
      clientDisplayName={clientDisplayName}
      disclaimer={disclaimer}
      branding={branding}
      draftMode={isStaffPreview}
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
          layoutSettings={layoutSettings}
        />
      ) : null}
    </PortalShell>
  );
}
