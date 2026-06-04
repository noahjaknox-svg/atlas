import { prisma } from "./db";
import { createProposalSnapshot } from "./snapshot";
import { hashPin } from "./auth";
import { generatePin, generatePortalSlug } from "./utils";

export interface PublishResult {
  slug: string;
  pin: string;
  portalId: string;
  snapshotId: string;
}

export async function publishProposal(
  proposalId: string,
  publishedById: string
): Promise<PublishResult> {
  const proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: { prospect: true, clientPortal: true },
  });

  if (proposal.clientPortal?.active) {
    throw new Error("Proposal already has an active portal");
  }

  const snapshot = await createProposalSnapshot(proposalId, publishedById);
  const pin = generatePin();
  const pinHash = await hashPin(pin);
  const slug = generatePortalSlug(proposal.prospect.prospectName);

  const portal = await prisma.$transaction(async (tx) => {
    await tx.proposal.update({
      where: { id: proposalId },
      data: {
        status: "published",
        publishedDate: new Date(),
        approvedById: publishedById,
      },
    });

    return tx.clientPortal.upsert({
      where: { proposalId },
      create: {
        proposalId,
        slug,
        pinHash,
        active: true,
      },
      update: {
        slug,
        pinHash,
        active: true,
      },
    });
  });

  return {
    slug: portal.slug,
    pin,
    portalId: portal.id,
    snapshotId: snapshot.id,
  };
}