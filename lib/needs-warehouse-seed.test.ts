import { describe, expect, it } from "vitest";
import { needsWarehouseSeed } from "@/lib/needs-warehouse-seed";

describe("needsWarehouseSeed", () => {
  it("returns true when model is set but warehouse fields are missing", () => {
    expect(
      needsWarehouseSeed({
        aircraft_manufacturer: "Bombardier",
        aircraft_model: "Challenger 300",
        home_airport_icao: "SDL",
      })
    ).toBe(true);
  });

  it("returns false when core warehouse fields are present", () => {
    expect(
      needsWarehouseSeed({
        aircraft_manufacturer: "Bombardier",
        aircraft_model: "Challenger 300",
        square_footage: "1500",
        engine_program_rate: "1150",
        crew_total: "452400",
      })
    ).toBe(false);
  });
});
