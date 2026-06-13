import "../prisma/seed-env";
import { writeFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { buildCrewAirportsSampleFromDb } from "../lib/ourairports/airports-payload";

const prisma = new PrismaClient();

/** KSEZ = terrain/slope, KPHX = multi-runway, KSDL = single-runway (Scottsdale). */
const SAMPLE_ICAOS = ["KSEZ", "KPHX", "KSDL"];

async function main() {
  const payload = await buildCrewAirportsSampleFromDb(prisma, SAMPLE_ICAOS);
  const out = join(process.cwd(), "data", "seeds", "crew-airports-sample.json");
  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log("Wrote", out, `(${payload.count} airports)`);
  for (const a of payload.airports) {
    console.log(
      `  ${a.id} — ${a.name}: runway ${a.runwayId}, gradient ${a.gradientPct}%, terrain ${a.terrain}, multi ${a.multiRunway}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
