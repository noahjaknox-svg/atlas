/**
 * Quick pre-deploy health check. Usage:
 *   npx dotenv -e .env.local -o -- npx tsx scripts/check-demo-ready.ts
 */
import "../lib/load-env";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [users, proposals, aircraft, masters, airports] = await Promise.all([
    prisma.user.count(),
    prisma.proposal.count(),
    prisma.aircraftInstance.count(),
    prisma.warehouseAircraft.count(),
    prisma.airportReference.count(),
  ]);

  console.log("Atlas demo readiness");
  console.log("--------------------");
  console.log(`DB connection:     OK`);
  console.log(`Users (staff):     ${users}${users === 0 ? "  ← create + sync a user" : ""}`);
  console.log(`Proposals:         ${proposals}`);
  console.log(`Aircraft instances:${aircraft}`);
  console.log(`Aircraft catalog:  ${masters}${masters === 0 ? "  ← run npm run db:seed" : ""}`);
  console.log(`Airports:          ${airports}${airports === 0 ? "  ← run npm run db:seed" : ""}`);
  console.log(`Supabase URL:      ${process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING"}`);
  console.log(`App URL:           ${process.env.NEXT_PUBLIC_APP_URL ?? "MISSING"}`);
}

main()
  .catch((e) => {
    console.error("DB connection FAILED:", e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
