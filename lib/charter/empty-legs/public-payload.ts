import type { PrismaClient } from "@prisma/client";
import { toIcaoDisplay, toIcaoRouteKey } from "@/lib/airports/code-match";
import {
  DEFAULT_CONSENT_TEXT,
  DEFAULT_DISCLAIMER_TEXT,
  DEFAULT_VISIBLE_FIELDS,
  mergeVisibleFields,
  type EmptyLegBranding,
  type EmptyLegVisibleFields,
} from "@/lib/charter/empty-legs/defaults";
import { EMPTY_LEG_DISPLAY_TIMEZONE } from "@/lib/charter/empty-legs/display-timezone";
import { isEmptyLegPast } from "@/lib/charter/empty-legs/eligibility";
import { calculateEmptyLegPrice } from "@/lib/charter/empty-legs/pricing";

export async function getPublicListByToken(db: PrismaClient, token: string) {
  return db.emptyLegPublicList.findUnique({ where: { token } });
}

export async function loadPublicListPayload(db: PrismaClient, token: string) {
  const list = await getPublicListByToken(db, token);
  if (!list) return { status: "not_found" as const };
  if (list.tokenRevokedAt || !list.isActive) {
    return { status: "revoked" as const, listName: list.name };
  }

  const settings = await db.emptyLegSettings.findUnique({ where: { id: "default" } });
  const visibleFields = mergeVisibleFields({
    ...DEFAULT_VISIBLE_FIELDS,
    ...((settings?.defaultVisibleFieldsJson as Partial<EmptyLegVisibleFields>) ?? {}),
    ...((list.visibleFieldsJson as Partial<EmptyLegVisibleFields>) ?? {}),
  });

  const branding: EmptyLegBranding = {
    ...((settings?.brandingJson as EmptyLegBranding) ?? {}),
    ...((list.brandingOverrideJson as EmptyLegBranding) ?? {}),
  };

  const placements = await db.emptyLegPlacement.findMany({
    where: {
      publicListId: list.id,
      status: "approved",
      emptyLeg: {
        lifecycleStatus: "active",
        availabilityStatus: "available",
      },
    },
    include: {
      emptyLeg: true,
    },
  });

  const now = new Date();
  const live = placements.filter((p) => !isEmptyLegPast(p.emptyLeg, now));

  const [fleetConfigs, listProfiles, globalProfiles] = await Promise.all([
    db.emptyLegFleetTailConfig.findMany({ where: { isActive: true } }),
    db.emptyLegRoutingProfile.findMany({
      where: { isActive: true, scope: "public_list", publicListId: list.id },
    }),
    db.emptyLegRoutingProfile.findMany({
      where: { isActive: true, scope: "global" },
    }),
  ]);

  const fleetByTail = new Map(fleetConfigs.map((f) => [f.tailNumber.toUpperCase(), f]));
  const profiles = await db.emptyLegAircraftProfile.findMany({ where: { isActive: true } });
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const minHours =
    list.minimumQuotableHours != null
      ? Number(list.minimumQuotableHours)
      : settings
        ? Number(settings.defaultMinimumQuotableHours)
        : 1.5;

  const items = live
    .map((placement) => {
      const leg = placement.emptyLeg;
      const fleet = fleetByTail.get(leg.tailNumber.toUpperCase());
      const profile = fleet?.aircraftProfileId
        ? profileById.get(fleet.aircraftProfileId)
        : null;
      const pricing = calculateEmptyLegPrice({
        pricingMode: placement.pricingMode,
        customPrice: placement.customPrice != null ? Number(placement.customPrice) : null,
        displayDiscountMode: placement.displayDiscountMode,
        durationMinutes: leg.durationMinutes,
        listMinimumQuotableHours: minHours,
        listDiscountPercent:
          list.discountPercent != null ? Number(list.discountPercent) : null,
        hourlyRate: profile ? Number(profile.defaultHourlyRate) : null,
        listRoutingProfiles: listProfiles,
        globalRoutingProfiles: globalProfiles,
        depIcao: leg.depIcao,
        arrIcao: leg.arrIcao,
        tailNumber: leg.tailNumber,
      });

      return {
        placementId: placement.id,
        emptyLegId: leg.id,
        tripNumber: leg.tripNumber,
        routeKey: toIcaoRouteKey(leg.depIcao, leg.arrIcao),
        depIcao: toIcaoDisplay(leg.depIcao),
        arrIcao: toIcaoDisplay(leg.arrIcao),
        depTimezone: EMPTY_LEG_DISPLAY_TIMEZONE,
        scheduledDepartureAt: leg.scheduledDepartureAt.toISOString(),
        scheduledArrivalAt: leg.scheduledArrivalAt.toISOString(),
        slidingWindowStartAt: leg.slidingWindowStartAt?.toISOString() ?? null,
        slidingWindowEndAt: leg.slidingWindowEndAt?.toISOString() ?? null,
        durationMinutes: leg.durationMinutes,
        isFeatured: leg.isFeatured,
        tailNumber: visibleFields.tailNumber ? leg.tailNumber : null,
        aircraftType:
          fleet?.publicDisplayType || fleet?.aircraftType || leg.aircraftType || null,
        seatCount: fleet?.seatCount ?? null,
        luggageNote: fleet?.luggageNote ?? null,
        wifi: fleet?.wifi ?? false,
        amenities: (fleet?.amenitiesJson as string[]) ?? [],
        description: fleet?.description ?? null,
        primaryPhotoUrl: fleet?.primaryPhotoUrl ?? null,
        photoUrls: (fleet?.photoUrlsJson as string[]) ?? [],
        pricing: {
          priceHidden: pricing.priceHidden,
          finalDisplayPrice: pricing.finalDisplayPrice,
          basePrice: pricing.basePrice,
          discountApplied: pricing.discountApplied,
          displayDiscountMode: pricing.displayDiscountMode,
        },
        offRoutingAllowanceHours: profile?.offRoutingTimeAllowanceHours
          ? Number(profile.offRoutingTimeAllowanceHours)
          : null,
      };
    })
    .sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return (
        new Date(a.scheduledDepartureAt).getTime() -
        new Date(b.scheduledDepartureAt).getTime()
      );
    });

  return {
    status: "ok" as const,
    list: {
      id: list.id,
      name: list.name,
      slug: list.slug,
      layoutStyle: list.layoutStyle,
      token: list.token,
    },
    promotionLabel: settings?.promotionLabel ?? "Featured Empty Leg",
    consentText: list.consentTextOverride || settings?.consentText || DEFAULT_CONSENT_TEXT,
    disclaimerText:
      list.disclaimerOverride || settings?.disclaimerText || DEFAULT_DISCLAIMER_TEXT,
    branding,
    visibleFields,
    citySearchRadiusNm: settings?.citySearchRadiusNm ?? 50,
    items,
  };
}
