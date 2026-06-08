import "../prisma/seed-env";
import { PrismaClient } from "@prisma/client";
import { importAircraftCsvFromFile } from "../lib/run-aircraft-csv-import";

const prisma = new PrismaClient();

importAircraftCsvFromFile(prisma)
  .then((result) => {
    console.log(result.message);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
