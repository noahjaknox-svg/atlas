import type {
  EmptyLegDiscountDisplayMode,
  EmptyLegPricingMode,
  EmptyLegRoutingProfile,
} from "@prisma/client";
import { airportCodesMatch } from "@/lib/airports/code-match";

export type PricingSource =
  | "list_routing_profile"
  | "global_routing_profile"
  | "calculated"
  | "custom"
  | "hidden";

export type PricingBreakdown = {
  source: PricingSource;
  listRoutingProfileId: string | null;
  listRoutingProfileName: string | null;
  globalRoutingProfileId: string | null;
  globalRoutingProfileName: string | null;
  hourlyRate: number | null;
  icalDurationHours: number;
  minimumQuotableHours: number;
  pricingDurationHours: number;
  basePrice: number | null;
  discountPercent: number | null;
  discountApplied: number | null;
  displayDiscountMode: EmptyLegDiscountDisplayMode;
  customPrice: number | null;
  finalDisplayPrice: number | null;
  priceHidden: boolean;
};

export type PricingInput = {
  pricingMode: EmptyLegPricingMode;
  customPrice: number | null;
  displayDiscountMode: EmptyLegDiscountDisplayMode;
  durationMinutes: number;
  listMinimumQuotableHours: number;
  listDiscountPercent: number | null;
  hourlyRate: number | null;
  listRoutingProfiles: EmptyLegRoutingProfile[];
  globalRoutingProfiles: EmptyLegRoutingProfile[];
  depIcao: string;
  arrIcao: string;
  tailNumber: string;
};

function profileMatches(
  profile: EmptyLegRoutingProfile,
  depIcao: string,
  arrIcao: string,
  tailNumber: string
): boolean {
  if (!profile.isActive) return false;
  // JetInsight legs often use FAA (SDL); routing profiles may use ICAO (KSDL).
  if (!airportCodesMatch(profile.depIcao, depIcao)) return false;
  if (!airportCodesMatch(profile.arrIcao, arrIcao)) return false;
  if (profile.tailNumbers.length === 0) return true;
  return profile.tailNumbers.some((t) => t.toUpperCase() === tailNumber.toUpperCase());
}

function applyDiscount(
  base: number,
  discountPercent: number | null
): { final: number; discountApplied: number | null } {
  if (discountPercent == null || discountPercent <= 0) {
    return { final: base, discountApplied: null };
  }
  const discountApplied = Math.round(base * (Number(discountPercent) / 100) * 100) / 100;
  return { final: Math.max(0, Math.round((base - discountApplied) * 100) / 100), discountApplied };
}

export function calculateEmptyLegPrice(input: PricingInput): PricingBreakdown {
  const icalDurationHours = input.durationMinutes / 60;
  const minimumQuotableHours = input.listMinimumQuotableHours;
  const pricingDurationHours = Math.max(icalDurationHours, minimumQuotableHours);

  const empty: PricingBreakdown = {
    source: "calculated",
    listRoutingProfileId: null,
    listRoutingProfileName: null,
    globalRoutingProfileId: null,
    globalRoutingProfileName: null,
    hourlyRate: input.hourlyRate,
    icalDurationHours,
    minimumQuotableHours,
    pricingDurationHours,
    basePrice: null,
    discountPercent: input.listDiscountPercent,
    discountApplied: null,
    displayDiscountMode: input.displayDiscountMode,
    customPrice: input.customPrice,
    finalDisplayPrice: null,
    priceHidden: false,
  };

  if (input.pricingMode === "hide_price") {
    return { ...empty, source: "hidden", priceHidden: true };
  }

  if (input.pricingMode === "custom") {
    const custom = input.customPrice ?? 0;
    return {
      ...empty,
      source: "custom",
      basePrice: custom,
      finalDisplayPrice: custom,
      customPrice: custom,
    };
  }

  const listMatch = input.listRoutingProfiles.find((p) =>
    profileMatches(p, input.depIcao, input.arrIcao, input.tailNumber)
  );
  if (listMatch) {
    const base = Number(listMatch.fixedPrice);
    const { final, discountApplied } = applyDiscount(base, input.listDiscountPercent);
    return {
      ...empty,
      source: "list_routing_profile",
      listRoutingProfileId: listMatch.id,
      listRoutingProfileName: listMatch.name,
      basePrice: base,
      discountApplied,
      finalDisplayPrice: final,
    };
  }

  const globalMatch = input.globalRoutingProfiles.find((p) =>
    profileMatches(p, input.depIcao, input.arrIcao, input.tailNumber)
  );
  if (globalMatch) {
    const base = Number(globalMatch.fixedPrice);
    const { final, discountApplied } = applyDiscount(base, input.listDiscountPercent);
    return {
      ...empty,
      source: "global_routing_profile",
      globalRoutingProfileId: globalMatch.id,
      globalRoutingProfileName: globalMatch.name,
      basePrice: base,
      discountApplied,
      finalDisplayPrice: final,
    };
  }

  if (input.hourlyRate == null) {
    return { ...empty, source: "calculated", basePrice: null, finalDisplayPrice: null };
  }

  const base = Math.round(input.hourlyRate * pricingDurationHours * 100) / 100;
  const { final, discountApplied } = applyDiscount(base, input.listDiscountPercent);
  return {
    ...empty,
    source: "calculated",
    basePrice: base,
    discountApplied,
    finalDisplayPrice: final,
  };
}

/** Placeholder for future performance-engine flight-time estimates. */
export function estimateOffRoutingHours(_input: {
  emptyLegDep: string;
  emptyLegArr: string;
  requestedDep: string;
  requestedArr: string;
}): number | null {
  return null;
}
