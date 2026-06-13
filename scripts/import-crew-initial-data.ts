import "../prisma/seed-env";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { importCrewInitialData } from "../lib/crew/import-data";
import { normalizeCrewInitialData } from "../lib/crew/normalize-initial-data";

const prisma = new PrismaClient();

async function main() {
  const file =
    process.argv[2] ?? join(process.cwd(), "data", "seeds", "atlas_initial_data.json");
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const data = normalizeCrewInitialData(raw);
  const result = await importCrewInitialData(prisma, data);
  console.log(`Imported from ${file}:`, result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
