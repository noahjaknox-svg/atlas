import "../lib/load-env";
import { PrismaClient } from "@prisma/client";
import { importOurAirportsData } from "../lib/ourairports/import-data";

const prisma = new PrismaClient();

async function main() {
  const dataPath = process.argv[2];
  console.log("Importing OurAirports reference data…");
  const started = Date.now();
  const result = await importOurAirportsData(prisma, { dataPath });
  const sec = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Finished in ${sec}s:`, result);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
