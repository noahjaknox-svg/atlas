import { describe, expect, it } from "vitest";
import { calculateEmptyLegPrice, estimateOffRoutingHours } from "@/lib/charter/empty-legs/pricing";
import type { EmptyLegRoutingProfile } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

function profile(partial: Partial<EmptyLegRoutingProfile>): EmptyLegRoutingProfile {
  return {
    id: "p1",
    name: "SDL-ASE",
    scope: "global",
    publicListId: null,
    depIcao: "KSDL",
    arrIcao: "KASE",
    fixedPrice: new Decimal(10000),
    tailNumbers: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

const baseInput = {
  pricingMode: "calculated" as const,
  customPrice: null,
  displayDiscountMode: "none" as const,
  durationMinutes: 90,
  listMinimumQuotableHours: 1.5,
  listDiscountPercent: null as number | null,
  hourlyRate: 5000,
  listRoutingProfiles: [] as EmptyLegRoutingProfile[],
  globalRoutingProfiles: [] as EmptyLegRoutingProfile[],
  depIcao: "KSDL",
  arrIcao: "KASE",
  tailNumber: "N365AV",
};

describe("calculateEmptyLegPrice", () => {
  it("hides price when mode is hide_price", () => {
    const result = calculateEmptyLegPrice({ ...baseInput, pricingMode: "hide_price" });
    expect(result.source).toBe("hidden");
    expect(result.priceHidden).toBe(true);
    expect(result.finalDisplayPrice).toBeNull();
  });

  it("uses custom price", () => {
    const result = calculateEmptyLegPrice({
      ...baseInput,
      pricingMode: "custom",
      customPrice: 12345,
    });
    expect(result.source).toBe("custom");
    expect(result.finalDisplayPrice).toBe(12345);
  });

  it("prefers list routing profile over global and calculated", () => {
    const result = calculateEmptyLegPrice({
      ...baseInput,
      listRoutingProfiles: [
        profile({ id: "list", name: "List", scope: "public_list", fixedPrice: new Decimal(8000) }),
      ],
      globalRoutingProfiles: [
        profile({ id: "global", name: "Global", fixedPrice: new Decimal(9000) }),
      ],
    });
    expect(result.source).toBe("list_routing_profile");
    expect(result.finalDisplayPrice).toBe(8000);
    expect(result.listRoutingProfileName).toBe("List");
  });

  it("uses global routing profile when no list match", () => {
    const result = calculateEmptyLegPrice({
      ...baseInput,
      globalRoutingProfiles: [profile({ fixedPrice: new Decimal(9500) })],
    });
    expect(result.source).toBe("global_routing_profile");
    expect(result.finalDisplayPrice).toBe(9500);
  });

  it("matches routing profile by tail when restricted", () => {
    const result = calculateEmptyLegPrice({
      ...baseInput,
      globalRoutingProfiles: [
        profile({ tailNumbers: ["N999XX"], fixedPrice: new Decimal(7000) }),
        profile({ id: "match", name: "Match", tailNumbers: ["N365AV"], fixedPrice: new Decimal(8800) }),
      ],
    });
    expect(result.globalRoutingProfileId).toBe("match");
    expect(result.finalDisplayPrice).toBe(8800);
  });

  it("calculates from hourly rate and max(duration, min hours)", () => {
    // 90 min = 1.5h, min = 2 → use 2h * 5000
    const result = calculateEmptyLegPrice({
      ...baseInput,
      listMinimumQuotableHours: 2,
      durationMinutes: 90,
      hourlyRate: 5000,
    });
    expect(result.source).toBe("calculated");
    expect(result.pricingDurationHours).toBe(2);
    expect(result.basePrice).toBe(10000);
    expect(result.finalDisplayPrice).toBe(10000);
  });

  it("applies discount percent", () => {
    const result = calculateEmptyLegPrice({
      ...baseInput,
      listDiscountPercent: 10,
      hourlyRate: 5000,
      listMinimumQuotableHours: 1.5,
      durationMinutes: 90,
    });
    expect(result.basePrice).toBe(7500);
    expect(result.discountApplied).toBe(750);
    expect(result.finalDisplayPrice).toBe(6750);
  });

  it("returns null price when no hourly rate and no profile", () => {
    const result = calculateEmptyLegPrice({ ...baseInput, hourlyRate: null });
    expect(result.finalDisplayPrice).toBeNull();
    expect(result.source).toBe("calculated");
  });
});

describe("estimateOffRoutingHours", () => {
  it("returns null placeholder", () => {
    expect(
      estimateOffRoutingHours({
        emptyLegDep: "KSDL",
        emptyLegArr: "KASE",
        requestedDep: "KPHX",
        requestedArr: "KASE",
      })
    ).toBeNull();
  });
});
