import type { PrismaClient } from "@prisma/client";
import {
  fetchEiaJetFuelIndex,
  FBO_CONTRACT_MARKUP,
  FBO_RETAIL_MARKUP,
} from "@/lib/eia-fuel-index";

export type FuelSyncResult = {
  message: string;
  indexPrice: number | null;
  effectiveDate: string | null;
  fboUpdated: number;
};

/** Pull EIA jet fuel index and backfill missing FBO Jet-A prices. */
export async function syncFuelFromEia(prisma: PrismaClient): Promise<FuelSyncResult> {
  const apiKey = process.env.EIA_API_KEY?.trim();
  if (!apiKey) {
    return {
      message: "EIA_API_KEY is not configured. Add it to your environment variables and try again.",
      indexPrice: null,
      effectiveDate: null,
      fboUpdated: 0,
    };
  }

  const index = await fetchEiaJetFuelIndex(apiKey);
  if (!index) {
    return {
      message: "EIA API returned no jet fuel data. Check your API key and try again later.",
      indexPrice: null,
      effectiveDate: null,
      fboUpdated: 0,
    };
  }

  await prisma.fuelIndexSnapshot.create({
    data: {
      indexName: "EIA US Kerosene-Type Jet Fuel (EPJK)",
      pricePerGallon: index.pricePerGallon,
      effectiveDate: new Date(index.effectiveDate),
      sourceUrl: index.sourceUrl,
    },
  });

  const retail = index.pricePerGallon * FBO_RETAIL_MARKUP;
  const contract = index.pricePerGallon * FBO_CONTRACT_MARKUP;
  const now = new Date();

  const fbos = await prisma.fboLocation.findMany({
    where: {
      manualOverride: false,
      OR: [{ jetARetailPrice: null }, { jetAContractPrice: null }],
    },
  });

  let fboUpdated = 0;
  for (const fbo of fbos) {
    await prisma.fboLocation.update({
      where: { id: fbo.id },
      data: {
        jetARetailPrice: fbo.jetARetailPrice ?? retail,
        jetAContractPrice: fbo.jetAContractPrice ?? contract,
        lastPriceUpdate: now,
        source: "eia_index",
      },
    });
    fboUpdated++;
  }

  return {
    message: `Synced EIA index at $${index.pricePerGallon.toFixed(2)}/gal. Updated ${fboUpdated} FBO row(s) with missing prices.`,
    indexPrice: index.pricePerGallon,
    effectiveDate: index.effectiveDate,
    fboUpdated,
  };
}
