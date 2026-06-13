import "../prisma/seed-env";
import { PrismaClient } from "@prisma/client";
import {
  ensureScheduleSource,
  fetchAndSyncScheduleSource,
} from "../lib/schedule/sync-source";

const prisma = new PrismaClient();

async function main() {
  const icsUrl = process.env.JETINSIGHT_ICS_URL;
  if (!icsUrl) {
    throw new Error("JETINSIGHT_ICS_URL is not set");
  }

  const source = await ensureScheduleSource(prisma, {
    name: "PrismJet JetInsight",
    icsUrl,
  });

  const result = await fetchAndSyncScheduleSource(prisma, source.id, icsUrl);
  console.log("Sync complete:", result);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
