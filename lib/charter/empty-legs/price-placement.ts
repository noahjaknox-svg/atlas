import type {
  EmptyLegDiscountDisplayMode,
  EmptyLegPricingMode,
  PrismaClient,
} from "@prisma/client";
import {
  calculateEmptyLegPrice,
  type PricingBreakdown,
} from "@/lib/charter/empty-legs/pricing";

type PlacementLike = {
  id: string;
  publicListId: string;
  pricingMode: EmptyLegPricingMode;
  customPrice: { toString(): string } | number | null;
  displayDiscountMode: EmptyLegDiscountDisplayMode;
  publicList: {
    id: string;
    discountPercent: { toString(): string } | number | null;
    minimumQuotableHours: { toString(): string } | number | null;
  };
};

type LegLike = {
  depIcao: string;
  arrIcao: string;
  tailNumber: string;
  durationMinutes: number;
};

/**
 * Load shared pricing context once, then price many placements cheaply.
 */
export async function loadEmptyLegPricingContext(db: PrismaClient) {
  const [settings, fleetConfigs, listProfiles, globalProfiles, aircraftProfiles] =
    await Promise.all([
      db.emptyLegSettings.findUnique({ where: { id: "default" } }),
      db.emptyLegFleetTailConfig.findMany({ where: { isActive: true } }),
      db.emptyLegRoutingProfile.findMany({
        where: { isActive: true, scope: "public_list" },
      }),
      db.emptyLegRoutingProfile.findMany({
        where: { isActive: true, scope: "global" },
      }),
      db.emptyLegAircraftProfile.findMany({ where: { isActive: true } }),
    ]);

  const fleetByTail = new Map(
    fleetConfigs.map((f) => [f.tailNumber.toUpperCase(), f])
  );
  const profileById = new Map(aircraftProfiles.map((p) => [p.id, p]));
  const listProfilesByListId = new Map<string, typeof listProfiles>();
  for (const profile of listProfiles) {
    if (!profile.publicListId) continue;
    const bucket = listProfilesByListId.get(profile.publicListId) ?? [];
    bucket.push(profile);
    listProfilesByListId.set(profile.publicListId, bucket);
  }

  return {
    settings,
    fleetByTail,
    profileById,
    listProfilesByListId,
    globalProfiles,
  };
}

export type EmptyLegPricingContext = Awaited<
  ReturnType<typeof loadEmptyLegPricingContext>
>;

export function pricePlacementWithContext(
  ctx: EmptyLegPricingContext,
  placement: PlacementLike,
  leg: LegLike
): PricingBreakdown {
  const fleet = ctx.fleetByTail.get(leg.tailNumber.toUpperCase());
  const aircraftProfile = fleet?.aircraftProfileId
    ? ctx.profileById.get(fleet.aircraftProfileId)
    : null;

  const minHours =
    placement.publicList.minimumQuotableHours != null
      ? Number(placement.publicList.minimumQuotableHours)
      : ctx.settings
        ? Number(ctx.settings.defaultMinimumQuotableHours)
        : 1.5;

  return calculateEmptyLegPrice({
    pricingMode: placement.pricingMode,
    customPrice:
      placement.customPrice != null ? Number(placement.customPrice) : null,
    displayDiscountMode: placement.displayDiscountMode,
    durationMinutes: leg.durationMinutes,
    listMinimumQuotableHours: minHours,
    listDiscountPercent:
      placement.publicList.discountPercent != null
        ? Number(placement.publicList.discountPercent)
        : null,
    hourlyRate: aircraftProfile
      ? Number(aircraftProfile.defaultHourlyRate)
      : null,
    listRoutingProfiles: ctx.listProfilesByListId.get(placement.publicListId) ?? [],
    globalRoutingProfiles: ctx.globalProfiles,
    depIcao: leg.depIcao,
    arrIcao: leg.arrIcao,
    tailNumber: leg.tailNumber,
  });
}

export function formatMoney(n: number | null | undefined): string | null {
  if (n == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
