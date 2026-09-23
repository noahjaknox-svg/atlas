import "../prisma/seed-env";
import { guardAgainstProductionDb } from "../lib/db-target-guard";
import { PrismaClient } from "@prisma/client";
import { importCrewInitialData } from "../lib/crew/import-data";
import { getAtlasInitialCrewData } from "../lib/crew/initial-data";

const prisma = new PrismaClient();

async function main() {
  guardAgainstProductionDb("crew-seed");
  const data = getAtlasInitialCrewData();
  const result = await importCrewInitialData(prisma, data);
  console.log("Crew seed complete:", result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
