import "../lib/load-env";
import { PrismaClient } from "@prisma/client";
import {
  LEGACY_CATEGORIES,
  aircraftAssumptionCategory,
} from "../lib/aircraft-workspace";

const prisma = new PrismaClient();

type Conflict = {
  proposalId: string;
  aircraftInstanceId: string;
  assumptionName: string;
  legacyValue: string;
  existingValue: string;
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const backfillEstimatedValue = process.argv.includes("--backfill-estimated-value");

  const proposals = await prisma.proposal.findMany({
    where: { deletedAt: null },
    include: {
      aircraft: {
        where: { includedOnProposal: true },
        select: { id: true, estimatedValue: true },
      },
      aircraftInstance: { select: { id: true, estimatedValue: true } },
      assumptions: {
        select: { category: true, assumptionName: true, value: true },
      },
    },
  });

  let copied = 0;
  let skipped = 0;
  const conflicts: Conflict[] = [];

  for (const proposal of proposals) {
    const instances =
      proposal.aircraft.length > 0
        ? proposal.aircraft
        : proposal.aircraftInstance
          ? [proposal.aircraftInstance]
          : [];

    if (instances.length === 0) continue;

    const legacyRows = proposal.assumptions.filter((a) =>
      (LEGACY_CATEGORIES as readonly string[]).includes(a.category)
    );
    if (legacyRows.length === 0 && !backfillEstimatedValue) continue;

    const existingKeys = new Set(
      proposal.assumptions.map((a) => `${a.category}:${a.assumptionName}`)
    );

    for (const instance of instances) {
      const category = aircraftAssumptionCategory(instance.id);

      for (const row of legacyRows) {
        const key = `${category}:${row.assumptionName}`;
        if (existingKeys.has(key)) {
          const existing = proposal.assumptions.find(
            (a) => a.category === category && a.assumptionName === row.assumptionName
          );
          if (existing && existing.value !== row.value) {
            conflicts.push({
              proposalId: proposal.id,
              aircraftInstanceId: instance.id,
              assumptionName: row.assumptionName,
              legacyValue: row.value,
              existingValue: existing.value,
            });
          }
          skipped++;
          continue;
        }

        if (!dryRun) {
          await prisma.proposalAssumption.create({
            data: {
              proposalId: proposal.id,
              category,
              assumptionName: row.assumptionName,
              value: row.value,
              visibleToClient: false,
              editableByClient: false,
            },
          });
        }
        existingKeys.add(key);
        copied++;
      }

      if (backfillEstimatedValue && instance.estimatedValue != null) {
        const value = instance.estimatedValue.toString();
        const key = `${category}:aircraft_value`;
        if (existingKeys.has(key)) {
          skipped++;
        } else if (!dryRun) {
          await prisma.proposalAssumption.create({
            data: {
              proposalId: proposal.id,
              category,
              assumptionName: "aircraft_value",
              value,
              visibleToClient: false,
              editableByClient: false,
            },
          });
          copied++;
          existingKeys.add(key);
        } else {
          copied++;
        }
      }
    }
  }

  console.log(
    dryRun ? "[dry-run] " : "",
    `Legacy migration: ${copied} rows copied, ${skipped} skipped (existing ac_* values kept).`
  );
  if (conflicts.length > 0) {
    console.log(`Conflicts (${conflicts.length}) — review manually:`);
    for (const c of conflicts.slice(0, 20)) {
      console.log(
        `  proposal=${c.proposalId} aircraft=${c.aircraftInstanceId} ${c.assumptionName}: legacy=${c.legacyValue} ac=${c.existingValue}`
      );
    }
    if (conflicts.length > 20) {
      console.log(`  … and ${conflicts.length - 20} more`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
