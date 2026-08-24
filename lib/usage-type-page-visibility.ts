import { prisma } from "@/lib/db";

/**
 * Recompute ProposalSection.visible for a proposal based on the aircraft's current
 * usage type. A page with no usageTypeIds assigned always stays visible. If the
 * given usage type name doesn't match any UsageType row (e.g. a legacy "part_91"/
 * "part_91_135" value predating this feature), leave existing visibility untouched
 * rather than wiping out staff's manual settings.
 */
export async function applyUsageTypeVisibility(
  proposalId: string,
  usageTypeName: string
): Promise<void> {
  const usageType = await prisma.usageType.findFirst({
    where: { name: usageTypeName },
    select: { id: true },
  });
  if (!usageType) return;

  const sections = await prisma.proposalSection.findMany({
    where: { proposalId },
    select: { id: true, usageTypeIds: true, visible: true },
  });

  const updates = sections
    .map((s) => {
      const nextVisible = s.usageTypeIds.length === 0 || s.usageTypeIds.includes(usageType.id);
      return nextVisible === s.visible
        ? null
        : prisma.proposalSection.update({ where: { id: s.id }, data: { visible: nextVisible } });
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}
