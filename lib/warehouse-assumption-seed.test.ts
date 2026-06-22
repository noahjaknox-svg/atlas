import { describe, expect, it } from "vitest";
import { applyWarehouseDefaults } from "@/lib/warehouse-assumption-seed";

describe("applyWarehouseDefaults", () => {
  it("seeds all warehouse keys onto empty assumptions", () => {
    const next = applyWarehouseDefaults(
      {},
      {
        square_footage: "1500",
        hangar_cost_per_sqft: "24",
        engine_program_rate: "850",
        hangar_calculated_annual: "36000",
      },
      "seed"
    );

    expect(next.square_footage).toBe("1500");
    expect(next.hangar_cost_per_sqft).toBe("24");
    expect(next.engine_program_rate).toBe("850");
    expect(next.hangar_calculated_annual).toBeUndefined();
  });

  it("preserves user overrides when refreshing warehouse data", () => {
    const next = applyWarehouseDefaults(
      {
        square_footage: "1500",
        hangar_annual: "50000",
        tail_number: "N123AB",
      },
      {
        square_footage: "1600",
        hangar_annual: "38400",
        engine_program_rate: "900",
      },
      "refresh"
    );

    expect(next.square_footage).toBe("1600");
    expect(next.engine_program_rate).toBe("900");
    expect(next.hangar_annual).toBe("50000");
    expect(next.tail_number).toBe("N123AB");
  });
});
