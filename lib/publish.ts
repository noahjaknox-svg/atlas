import { prisma } from "./db";
import { perfTimed } from "./perf-log";
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

  if (proposal.clientPortal) {
    const republished = await republishProposal(proposalId, publishedById, {
      reactivate: true,
    });
    return {
      slug: republished.slug,
      pin: "",
      portalId: proposal.clientPortal.id,
      snapshotId: republished.snapshotId,
      publishedAt: republished.publishedAt,
    };
  }

  const snapshot = await perfTimed("publish.createSnapshot", () =>
    createProposalSnapshot(proposalId, publishedById)
  );
  const pin = generatePin();
  const pinHash = await hashPin(pin);
  const pinCiphertext = encryptPinForStorage(pin);
  const slug = generatePortalSlug(proposal.prospect.prospectName);

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
  publishedById: string,
  options?: { reactivate?: boolean }
): Promise<{ slug: string; snapshotId: string; publishedAt: string }> {
  const proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: { clientPortal: true },
  });

  if (!proposal.clientPortal) {
    throw new Error("Proposal has no portal to republish");
  }

  const snapshot = await perfTimed("republish.createSnapshot", () =>
    createProposalSnapshot(proposalId, publishedById)
  );

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      publishedDate: new Date(),
      status: "published",
    },
  });

  if (options?.reactivate && !proposal.clientPortal.active) {
    await prisma.clientPortal.update({
      where: { proposalId },
      data: { active: true },
    });
  }

  return {
    slug: proposal.clientPortal.slug,
    snapshotId: snapshot.id,
    publishedAt: snapshot.publishedAt.toISOString(),
  };
}