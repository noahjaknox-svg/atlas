import "../prisma/seed-env";
import { writeFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { buildCrewAirportsPayloadFromDb } from "../lib/ourairports/airports-payload";

const prisma = new PrismaClient();

async function main() {
  const payload = await buildCrewAirportsPayloadFromDb(prisma);
  const out = join(process.cwd(), "data", "seeds", "crew-airports-full.json");
  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log("Wrote", out, `(${payload.count} airports)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
