import "../prisma/seed-env";
import { writeFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { serializeCrewAirport } from "../lib/ourairports/crew-wire";
import { findAirportReferenceByCode } from "../lib/ourairports/lookup";

const prisma = new PrismaClient();

/** 22 hand-verified AZ slopes + KSMO/KSDL null checks (Nick validation set). */
const AZ_CHECK_CODES = [
  "KSEZ",
  "KOLS",
  "KCFT",
  "KTYL",
  "P13",
  "KPGA",
  "1G4",
  "KCMR",
  "KFHU",
  "P52",
  "KPRC",
  "KGCN",
  "KINW",
  "KDUG",
  "KJTC",
  "KHII",
  "P14",
  "KPAN",
  "KSAD",
  "KAVQ",
  "KFLG",
  "KIGM",
  "KSMO",
  "KSDL",
] as const;

async function findAirportByAnyCode(code: string) {
  const fromLookup = await findAirportReferenceByCode(prisma, code);
  if (fromLookup) return fromLookup;

  const upper = code.trim().toUpperCase();
  return prisma.airportReference.findFirst({
    where: {
      OR: [
        { gpsCode: upper },
        { localCode: upper },
        { ident: upper },
        { icao: upper },
      ],
    },
    include: {
      runways: { where: { closed: false }, orderBy: { lengthFt: "desc" } },
      frequencies: { orderBy: [{ type: "asc" }, { frequencyMhz: "asc" }] },
    },
  });
}

async function main() {
  const airports = [];
  const missing: string[] = [];

  for (const code of AZ_CHECK_CODES) {
    const row = await findAirportByAnyCode(code);
    if (!row) {
      missing.push(code);
      continue;
    }
    airports.push(serializeCrewAirport(row));
  }

  const payload = {
    syncedAt: new Date().toISOString(),
    count: airports.length,
    airports,
  };

  const out = join(process.cwd(), "data", "seeds", "crew-airports-az-check.json");
  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log("Wrote", out, `(${payload.count}/${AZ_CHECK_CODES.length} airports)`);
  for (const a of airports) {
    console.log(
      `  ${a.id} — ${a.name}: gradient ${a.gradientPct ?? "null"}%, terrain ${a.terrain}`
    );
  }
  if (missing.length > 0) {
    console.warn("Missing:", missing.join(", "));
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
