import { describe, expect, it } from "vitest";
import { resolveEmptyLegHourlyRate } from "@/lib/charter/empty-legs/price-placement";

describe("resolveEmptyLegHourlyRate", () => {
  it("uses type default when tail has no override", () => {
    expect(
      resolveEmptyLegHourlyRate({
        emptyLegHourlyRateOverride: null,
        aircraftType: { emptyLegHourlyRate: 6500 },
      })
    ).toBe(6500);
  });

  it("prefers tail override over type default", () => {
    expect(
      resolveEmptyLegHourlyRate({
        emptyLegHourlyRateOverride: 7200,
        aircraftType: { emptyLegHourlyRate: 6500 },
      })
    ).toBe(7200);
  });

  it("returns null when neither is set", () => {
    expect(
      resolveEmptyLegHourlyRate({
        emptyLegHourlyRateOverride: null,
        aircraftType: { emptyLegHourlyRate: null },
      })
    ).toBeNull();
  });
});
