import "../prisma/seed-env";
import { PrismaClient } from "@prisma/client";
import { seedVerifiedRunwaySlopes } from "../lib/ourairports/seed-runway-slopes";

const prisma = new PrismaClient();

async function main() {
  const result = await seedVerifiedRunwaySlopes(prisma);
  console.log(
    `Runway slopes: ${result.verified} verified, ${result.cleared} cleared, ${result.estimated} estimates backfilled`
  );
  if (result.missing.length > 0) {
    console.warn("Missing:", result.missing.join(", "));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
