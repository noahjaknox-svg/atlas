import { prisma } from "@/lib/db";
import { getExperienceMasterTemplates } from "@/lib/portal-content";
import { sectionNavSlug } from "@/lib/experience-page-slug";
import { pageAppliesToUsageType, resolveSectionUsageTypeIds } from "@/lib/usage-type-pages";

export { resolveSectionUsageTypeIds };

/**
 * Page ↔ usage type assignments live only on the master pages (edited in Data
 * Warehouse → Usage Types → Portal pages). Proposal sections resolve theirs from the
 * master page with the same nav slug; pages with no master (custom, per-proposal)
 * apply to every usage type.
 */
export async function masterUsageTypeIdsBySlug(): Promise<Map<string, string[]>> {
  const templates = await getExperienceMasterTemplates();
  return new Map(templates.map((t) => [sectionNavSlug(t), t.usageTypeIds ?? []]));
}

/**
 * Recompute ProposalSection.visible for a proposal based on the aircraft's current
 * usage type: shown if the page applies to it (or to all types), hidden otherwise. If the
 * usage type name doesn't match any UsageType row (e.g. a legacy "part_91"/
 * "part_91_135" value predating this feature), leave visibility untouched.
 * `onlySlug` limits the update to one page (used when a warehouse assignment changes).
 */
export async function applyUsageTypeVisibility(
  proposalId: string,
  usageTypeName: string,
  opts: { onlySlug?: string; bySlug?: Map<string, string[]> } = {}
): Promise<void> {
  const usageType = await prisma.usageType.findFirst({
    where: { name: usageTypeName },
    select: { id: true },
  });
  if (!usageType) return;

  const bySlug = opts.bySlug ?? (await masterUsageTypeIdsBySlug());
  const sections = await prisma.proposalSection.findMany({
    where: { proposalId },
    select: { id: true, sectionType: true, pageSlug: true, visible: true },
  });

  const updates = sections
    .filter((s) => !opts.onlySlug || sectionNavSlug(s) === opts.onlySlug)
    .map((s) => {
      const ids = resolveSectionUsageTypeIds(s, bySlug);
      const nextVisible = pageAppliesToUsageType(ids, usageType.id);
      return nextVisible === s.visible
        ? null
        : prisma.proposalSection.update({ where: { id: s.id }, data: { visible: nextVisible } });
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}

/**
 * After a page's usage types change in the warehouse, re-apply that page's visibility
 * on live proposals, based on each proposal's primary aircraft usage type. Published
 * snapshots are immutable and unaffected. Batched: a fixed number of queries
 * regardless of how many proposals exist.
 */
export async function reapplyPageUsageTypeVisibility(slug: string): Promise<number> {
  const bySlug = await masterUsageTypeIdsBySlug();
  const ids = bySlug.get(slug) ?? [];

  const [usageTypes, proposals] = await Promise.all([
    prisma.usageType.findMany({ select: { id: true, name: true } }),
    prisma.proposal.findMany({
      where: { aircraftInstanceId: { not: null } },
      select: { id: true, aircraftInstanceId: true },
    }),
  ]);
  const typeIdByName = new Map(usageTypes.map((u) => [u.name, u.id]));
  const primaryCategory = new Map(proposals.map((p) => [p.id, `ac_${p.aircraftInstanceId}`]));

  const usageRows = await prisma.proposalAssumption.findMany({
    where: { proposalId: { in: proposals.map((p) => p.id) }, assumptionName: "usage_type" },
    select: { proposalId: true, category: true, value: true },
  });
  // Proposal → usage type id (legacy names not in the table are left alone).
  const proposalTypeId = new Map<string, string>();
  for (const row of usageRows) {
    if (primaryCategory.get(row.proposalId) !== row.category) continue;
    const typeId = row.value ? typeIdByName.get(row.value) : undefined;
    if (typeId) proposalTypeId.set(row.proposalId, typeId);
  }
  if (proposalTypeId.size === 0) return 0;

  const sections = await prisma.proposalSection.findMany({
    where: { proposalId: { in: Array.from(proposalTypeId.keys()) } },
    select: { id: true, proposalId: true, sectionType: true, pageSlug: true, visible: true },
  });
  const updates = sections
    .filter((s) => sectionNavSlug(s) === slug)
    .map((s) => {
      const nextVisible = pageAppliesToUsageType(ids, proposalTypeId.get(s.proposalId)!);
      return nextVisible === s.visible
        ? null
        : prisma.proposalSection.update({ where: { id: s.id }, data: { visible: nextVisible } });
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);
  if (updates.length > 0) await prisma.$transaction(updates);
  return updates.length;
}
