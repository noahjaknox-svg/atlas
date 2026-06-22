import { prisma } from "@/lib/db";
import type { Fbo } from "@prisma/client";
import { airportCodeKey, toIcaoDisplay } from "@/lib/airports/code-match";

/** ICAO/FAA LID variants for matching FBO rows (SDL ↔ KSDL). */
export function airportCodeVariants(code: string): string[] {
  const upper = code.trim().toUpperCase();
  if (!upper) return [];

  const variants = new Set<string>([upper, toIcaoDisplay(upper)]);
  const key = airportCodeKey(upper);
  variants.add(key);
  variants.add(toIcaoDisplay(key));
  if (upper.length === 4 && upper.startsWith("K")) {
    variants.add(upper.slice(1));
  }
  return [...variants];
}

export async function findFbosAtAirport(icao: string): Promise<Fbo[]> {
  const variants = airportCodeVariants(icao);
  if (variants.length === 0) return [];

  return prisma.fbo.findMany({
    where: {
      OR: variants.map((code) => ({
        airportIcao: { equals: code, mode: "insensitive" },
      })),
    },
    orderBy: { fboName: "asc" },
  });
}
