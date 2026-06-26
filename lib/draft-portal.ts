import { prisma } from "./db";
import { hashPin } from "./auth";
import { generatePortalSlug } from "./utils";

/** Placeholder PIN hash for draft-only portals (no client access until publish). */
const DRAFT_PORTAL_PIN = "draft-preview-no-access";

export async function ensureDraftPortalForProposal(
  proposalId: string
): Promise<{ slug: string; created: boolean }> {
  const existing = await prisma.clientPortal.findUnique({
    where: { proposalId },
    select: { slug: true },
  });
  if (existing) {
    return { slug: existing.slug, created: false };
  }

  const proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: { prospect: true },
  });

  const pinHash = await hashPin(DRAFT_PORTAL_PIN);
  let slug = generatePortalSlug(proposal.prospect.prospectName);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const portal = await prisma.clientPortal.create({
        data: {
          proposalId,
          slug,
          pinHash,
          pinCiphertext: null,
          active: false,
        },
      });
      return { slug: portal.slug, created: true };
    } catch (e) {
      const isUniqueViolation =
        e instanceof Error &&
        "code" in e &&
        (e as { code?: string }).code === "P2002";
      if (!isUniqueViolation || attempt === 4) throw e;
      slug = generatePortalSlug(proposal.prospect.prospectName);
    }
  }

  throw new Error("Could not reserve a portal slug");
}
