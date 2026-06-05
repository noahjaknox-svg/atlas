import { prisma } from "@/lib/db";
import {
  verifyPin,
  createPortalSession,
  checkPinRateLimit,
  recordPinFailure,
  clearPinAttempts,
} from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { resolveExperienceSections } from "@/lib/experience-resolve";
import { getFirstExperienceSlug } from "@/lib/experience-content";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { pin } = await request.json();

    if (!pin) return jsonError("PIN required");

    const rateLimit = await checkPinRateLimit(slug);
    if (!rateLimit.allowed) {
      return jsonError("Too many attempts. Try again in 15 minutes.", 429);
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

    if (!portal || !portal.active) {
      return jsonError("Portal not found or inactive", 404);
    }

    if (portal.expiresAt && portal.expiresAt < new Date()) {
      return jsonError("This proposal link has expired", 410);
    }

    const valid = await verifyPin(String(pin), portal.pinHash);
    if (!valid) {
      await recordPinFailure(slug);
      return jsonError("Invalid PIN", 401);
    }

    await clearPinAttempts(slug);
    await createPortalSession({
      portalId: portal.id,
      proposalId: portal.proposalId,
      slug,
    });

    const snapshot = portal.proposal.snapshots[0];
    const payload = snapshot
      ? (snapshot.snapshotJson as unknown as ProposalSnapshotPayload)
      : null;
    const sections = resolveExperienceSections(payload);
    const firstPage = getFirstExperienceSlug(sections);

    return jsonOk({ success: true, redirect: `/${slug}/experience/${firstPage}` });
  } catch (e) {
    return handleApiError(e);
  }
}
