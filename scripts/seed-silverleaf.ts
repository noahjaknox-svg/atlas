/**
 * Install the Silverleaf Air Golf Club proposal pages and club model flag.
 *
 *   npx tsx scripts/seed-silverleaf.ts                      # usage type + master pages
 *   npx tsx scripts/seed-silverleaf.ts --proposal "Name"    # also create a draft proposal
 *
 * Idempotent. Refuses production (pass BOTH DATABASE_URL and DIRECT_URL for staging).
 * Only touches the Silverleaf usage type's config and the Silverleaf master pages. Every other
 * master page keeps its usage-type assignment exactly as it was.
 */
import "../prisma/seed-env";
import { guardAgainstProductionDb } from "../lib/db-target-guard";
import { PrismaClient, type SectionType } from "@prisma/client";
import {
  codeDefaultsAsMasterTemplates,
  parseExperienceMasterTemplates,
  type ExperienceMasterTemplate,
} from "../lib/experience-master";
import { sectionNavSlug } from "../lib/experience-page-slug";
import { pageAppliesToUsageType } from "../lib/usage-type-pages";
import { parseUsageTypeConfig } from "../lib/usage-type-config";
import { SILVERLEAF_PAGE_SLUGS, silverleafMasterTemplates } from "../lib/silverleaf-pages";
import { CLUB_DEFAULTS } from "../lib/club-proforma";
import { CLUB_INPUTS_KEY, CLUB_MODEL_CATEGORY, serializeClubInputs } from "../lib/club-model-store";
import { aircraftAssumptionCategory } from "../lib/aircraft-workspace";

const prisma = new PrismaClient();

// Direct Prisma access (lib/portal-content is server-only and can't load in a script).
async function getExperienceMasterTemplates(): Promise<ExperienceMasterTemplate[]> {
  const row = await prisma.portalContent.findUnique({ where: { id: "default" } });
  return parseExperienceMasterTemplates(row?.experienceTemplates) ?? codeDefaultsAsMasterTemplates();
}

async function upsertPortalContent(data: { experienceTemplates: ExperienceMasterTemplate[] }) {
  const json = data.experienceTemplates as unknown as object;
  await prisma.portalContent.upsert({
    where: { id: "default" },
    create: { id: "default", experienceTemplates: json },
    update: { experienceTemplates: json },
  });
}

async function main() {
  guardAgainstProductionDb("seed-silverleaf");

  const allTypes = await prisma.usageType.findMany();
  const usage = allTypes.find((u) => u.name.trim().toLowerCase() === "silverleaf");
  if (!usage) throw new Error('No "Silverleaf" usage type found. Create it in Data Warehouse → Usage Types first.');

  // 1. Mark the usage type as the club model.
  const config = parseUsageTypeConfig(usage.config);
  config.proformaModel = "club";
  await prisma.usageType.update({ where: { id: usage.id }, data: { config: config as object } });
  console.log(`Usage type "${usage.name}" → proformaModel: club`);

  // 2. Master pages: replace the Silverleaf pages, exclude Silverleaf from every other page.
  const existing = await getExperienceMasterTemplates();
  const kept = existing.filter((t) => !SILVERLEAF_PAGE_SLUGS.includes(sectionNavSlug(t)));
  const maxOrder = Math.max(0, ...kept.map((t) => t.sortOrder));
  const club = silverleafMasterTemplates(usage.id, maxOrder);

  await upsertPortalContent({ experienceTemplates: [...kept, ...club] });
  console.log(`Installed ${club.length} Silverleaf pages (other pages left exactly as they were).`);

  // 2b. Refresh an existing (staging) proposal's Silverleaf pages from the masters.
  const syncFlag = process.argv.indexOf("--sync-proposal");
  if (syncFlag !== -1) {
    const proposalId = process.argv[syncFlag + 1];
    if (!proposalId) throw new Error("--sync-proposal needs a proposal id");
    let updated = 0;
    for (const t of club) {
      const res = await prisma.proposalSection.updateMany({
        where: { proposalId, sectionType: "custom_page", pageSlug: t.pageSlug ?? undefined },
        data: { title: t.title, contentBlocks: t.contentBlocks as object, sortOrder: t.sortOrder },
      });
      updated += res.count;
    }
    console.log(`Synced ${updated} sections on proposal ${proposalId}.`);
    return;
  }

  // 3. Optional draft proposal for review.
  const flag = process.argv.indexOf("--proposal");
  if (flag === -1) return;
  const name = process.argv[flag + 1] ?? "Silverleaf Air Golf Club";
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No internal user found to own the proposal");

  const prospect = await prisma.prospect.create({
    data: {
      prospectName: name,
      companyName: "Silverleaf Golf Club",
      contactName: "Silverleaf",
      contactEmail: "",
      prospectType: "other",
      opportunityType: "aircraft_management",
      createdById: user.id,
    },
  });
  const proposal = await prisma.proposal.create({
    data: { prospectId: prospect.id, proposalName: name, preparedById: user.id, preparedDate: new Date() },
  });
  const aircraft = await prisma.aircraftInstance.create({
    data: { prospectId: prospect.id, proposalId: proposal.id },
  });
  await prisma.proposal.update({ where: { id: proposal.id }, data: { aircraftInstanceId: aircraft.id } });

  // Same as POST /api/proposals: a section row for every master page; visibility is then
  // applied from the usage type (below), exactly like setting the aircraft's usage type does.
  const templates = await getExperienceMasterTemplates();
  await prisma.proposalSection.createMany({
    data: templates.map((s) => ({
      proposalId: proposal.id,
      sectionType: s.sectionType as SectionType,
      pageSlug: s.pageSlug ?? null,
      title: s.title,
      sortOrder: s.sortOrder,
      visible: s.visible,
      bodyCopy: s.bodyCopy,
      layoutVariant: s.layoutVariant,
      contentBlocks: (s.contentBlocks ?? undefined) as object | undefined,
      imageUrl: s.imageUrl,
      videoUrl: s.videoUrl,
      posterUrl: s.posterUrl,
      calloutMetricLabel: s.calloutMetricLabel,
      calloutMetricValue: s.calloutMetricValue,
      usageTypeIds: s.usageTypeIds ?? [],
    })),
  });

  const { applyUsageTypeVisibility } = await import("../lib/usage-type-page-visibility");
  await applyUsageTypeVisibility(proposal.id, usage.name);

  const { ensureThreeScenarios } = await import("../lib/scenarios");
  await ensureThreeScenarios(proposal.id, aircraft.id);
  const { ensureDraftPortalForProposal } = await import("../lib/draft-portal");
  await ensureDraftPortalForProposal(proposal.id);

  const category = aircraftAssumptionCategory(aircraft.id);
  const rows = [
    { category, assumptionName: "aircraft_profile_mode", value: "general", visibleToClient: true },
    { category, assumptionName: "aircraft_model", value: "Challenger 350", visibleToClient: true },
    { category, assumptionName: "usage_type", value: usage.name, visibleToClient: true },
    { category, assumptionName: "aircraft_value", value: String(CLUB_DEFAULTS.assetCost), visibleToClient: true },
    {
      category: CLUB_MODEL_CATEGORY,
      assumptionName: CLUB_INPUTS_KEY,
      value: serializeClubInputs(CLUB_DEFAULTS),
      visibleToClient: false,
    },
  ];
  for (const r of rows) {
    await prisma.proposalAssumption.create({
      data: { proposalId: proposal.id, sourceType: "manual", ...r },
    });
  }
  const shown = await prisma.proposalSection.count({ where: { proposalId: proposal.id, visible: true } });
  console.log(`Created draft proposal ${proposal.id}: ${templates.length} section rows, ${shown} visible.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
