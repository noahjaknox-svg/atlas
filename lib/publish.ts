import { prisma } from "./db";
import { createProposalSnapshot } from "./snapshot";
import { hashPin } from "./auth";
import { encryptPinForStorage } from "./pin-vault";
import { generatePin, generatePortalSlug } from "./utils";

export interface PublishResult {
  slug: string;
  pin: string;
  portalId: string;
  snapshotId: string;
  publishedAt: string;
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
  const pinCiphertext = encryptPinForStorage(pin);
  const slug =
    proposal.clientPortal?.slug ?? generatePortalSlug(proposal.prospect.prospectName);

  const portal = await prisma.$transaction(async (tx) => {
    await tx.proposal.update({
      where: { id: proposalId },
      data: {
        status: "published",
        pipelineStage: "client_review",
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
        pinCiphertext,
        active: true,
      },
      update: {
        slug,
        pinHash,
        pinCiphertext,
        active: true,
      },
    });
  });

  return {
    slug: portal.slug,
    pin,
    portalId: portal.id,
    snapshotId: snapshot.id,
    publishedAt: snapshot.publishedAt.toISOString(),
  };
}

/** Refresh client snapshot after proposal data changes; keeps portal slug and PIN. */
export async function republishProposal(
  proposalId: string,
  publishedById: string
): Promise<{ slug: string; snapshotId: string; publishedAt: string }> {
  const proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: { clientPortal: true },
  });

  if (!proposal.clientPortal?.active) {
    throw new Error("Proposal must be published before republishing");
  }

  const snapshot = await createProposalSnapshot(proposalId, publishedById);

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { publishedDate: new Date() },
  });

  return {
    slug: proposal.clientPortal.slug,
    snapshotId: snapshot.id,
    publishedAt: snapshot.publishedAt.toISOString(),
  };
}