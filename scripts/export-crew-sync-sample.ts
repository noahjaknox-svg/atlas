import "../prisma/seed-env";
import { writeFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { buildCrewSyncPayloadFromDb } from "../lib/crew/sync-data";

const prisma = new PrismaClient();

async function main() {
  const payload = await buildCrewSyncPayloadFromDb(prisma);
  const out = join(process.cwd(), "data", "seeds", "crew-sync-sample.json");
  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log("Wrote", out);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
