import type { Prisma, PrismaClient } from "@prisma/client";

export async function mergeEmptyLegFromHistory(
  db: PrismaClient,
  input: { targetId: string; sourceId: string }
) {
  const [target, source] = await Promise.all([
    db.emptyLeg.findUnique({
      where: { id: input.targetId },
      include: { placements: true },
    }),
    db.emptyLeg.findUnique({
      where: { id: input.sourceId },
      include: { placements: true, leads: true, viewEvents: true },
    }),
  ]);

  if (!target || !source) {
    throw new Error("Empty leg not found");
  }
  if (target.lifecycleStatus !== "active") {
    throw new Error("Merge target must be an active empty leg");
  }
  if (source.lifecycleStatus !== "history") {
    throw new Error("Merge source must be a historical empty leg");
  }
  if (target.tripNumber !== source.tripNumber) {
    throw new Error("Merge source must share the same trip number");
  }

  await db.$transaction(async (tx) => {
    await tx.emptyLeg.update({
      where: { id: target.id },
      data: {
        slidingWindowStartAt: target.slidingWindowStartAt ?? source.slidingWindowStartAt,
        slidingWindowEndAt: target.slidingWindowEndAt ?? source.slidingWindowEndAt,
        internalNotes: [target.internalNotes, source.internalNotes].filter(Boolean).join("\n\n") || null,
        isFeatured: target.isFeatured || source.isFeatured,
        viewCount: target.viewCount + source.viewCount,
        detailOpenCount: target.detailOpenCount + source.detailOpenCount,
        submissionCount: target.submissionCount + source.submissionCount,
      },
    });

    for (const placement of source.placements) {
      const existing = target.placements.find((p) => p.publicListId === placement.publicListId);
      if (existing) {
        await tx.emptyLegPlacement.update({
          where: { id: existing.id },
          data: {
            status: existing.status === "needs_approval" ? placement.status : existing.status,
            pricingMode: existing.pricingMode === "calculated" ? placement.pricingMode : existing.pricingMode,
            customPrice: existing.customPrice ?? placement.customPrice,
            displayDiscountMode:
              existing.displayDiscountMode === "none"
                ? placement.displayDiscountMode
                : existing.displayDiscountMode,
            pricingResultJson: placement.pricingResultJson as Prisma.InputJsonValue,
          },
        });
        await tx.charterLead.updateMany({
          where: { sourcePlacementId: placement.id },
          data: { sourcePlacementId: existing.id, emptyLegId: target.id },
        });
        await tx.emptyLegViewEvent.updateMany({
          where: { placementId: placement.id },
          data: { placementId: existing.id, emptyLegId: target.id },
        });
      } else {
        await tx.emptyLegPlacement.update({
          where: { id: placement.id },
          data: { emptyLegId: target.id },
        });
      }
    }

    await tx.charterLead.updateMany({
      where: { emptyLegId: source.id },
      data: { emptyLegId: target.id },
    });
    await tx.emptyLegViewEvent.updateMany({
      where: { emptyLegId: source.id },
      data: { emptyLegId: target.id },
    });
  });

  return db.emptyLeg.findUnique({
    where: { id: target.id },
    include: {
      placements: { include: { publicList: true } },
      forceAppliedBy: { select: { id: true, name: true, email: true } },
    },
  });
}
