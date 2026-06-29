import { describe, expect, it } from "vitest";
import { mergeAssumptionsWithDefaults } from "@/lib/resolve-effective-assumptions";

describe("mergeAssumptionsWithDefaults", () => {
  it("restores warehouse aircraft_value when stored is zero", () => {
    const merged = mergeAssumptionsWithDefaults(
      { aircraft_value: "0" },
      { aircraft_value: "25000000" }
    );
    expect(merged.aircraft_value).toBe("25000000");
  });
});
