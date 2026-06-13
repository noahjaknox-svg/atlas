import "../lib/load-env";
import { PrismaClient } from "@prisma/client";
import { findAirportReferenceByCode, enrichAirportReference, searchAirportReference } from "../lib/ourairports/lookup";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.airportReference.count();
  console.log("airport_reference rows:", total);

  const a = await findAirportReferenceByCode(prisma, "KSDL");
  if (!a) {
    console.log("KSDL not found");
    return;
  }
  const w = await enrichAirportReference(prisma, a);
  console.log(
    `${w.icao} — ${w.name} (${w.municipality}, ${w.isoCountry}) elev ${w.elevationFt}ft, ${w.runways.length} runways, ${w.frequencies.length} freqs`
  );

  const hits = await searchAirportReference(prisma, "Scottsdale", 3);
  console.log("search Scottsdale:", hits.map((h) => h.icao).join(", "));
}

main()
  .finally(() => prisma.$disconnect());
