import { prisma } from "@/lib/db";
import { CLUB_DEFAULTS, type ClubInputs } from "@/lib/club-proforma";
import {
  CLUB_INPUTS_KEY,
  CLUB_MODEL_CATEGORY,
  parseClubInputs,
  serializeClubInputs,
} from "@/lib/club-model-store";
import { isClubUsageTypeConfig, parseUsageTypeConfig } from "@/lib/usage-type-config";

const rowKey = (proposalId: string) => ({
  proposalId_category_assumptionName: {
    proposalId,
    category: CLUB_MODEL_CATEGORY,
    assumptionName: CLUB_INPUTS_KEY,
  },
});

export async function loadClubInputs(proposalId: string): Promise<ClubInputs | null> {
  const row = await prisma.proposalAssumption.findUnique({
    where: rowKey(proposalId),
    select: { value: true },
  });
  return row ? parseClubInputs(row.value) : null;
}

export async function saveClubInputs(proposalId: string, inputs: ClubInputs): Promise<void> {
  await prisma.proposalAssumption.upsert({
    where: rowKey(proposalId),
    create: {
      proposalId,
      category: CLUB_MODEL_CATEGORY,
      assumptionName: CLUB_INPUTS_KEY,
      value: serializeClubInputs(inputs),
      sourceType: "manual",
      visibleToClient: false,
      editableByClient: false,
    },
    update: { value: serializeClubInputs(inputs), visibleToClient: false },
  });
}

/**
 * When a proposal's aircraft is given a membership-club usage type, make sure the proposal
 * has club inputs (defaults). Never overwrites existing inputs; does nothing for any other
 * usage type.
 */
export async function ensureClubModelInputs(
  proposalId: string,
  usageTypeName: string
): Promise<boolean> {
  const usageType = await prisma.usageType.findFirst({
    where: { name: usageTypeName },
    select: { config: true },
  });
  if (!usageType || !isClubUsageTypeConfig(parseUsageTypeConfig(usageType.config))) return false;
  const existing = await prisma.proposalAssumption.findUnique({
    where: rowKey(proposalId),
    select: { id: true },
  });
  if (existing) return false;
  await saveClubInputs(proposalId, { ...CLUB_DEFAULTS });
  return true;
}
