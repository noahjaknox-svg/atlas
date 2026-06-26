import { describe, expect, it } from "vitest";
import {
  buildWarehouseAircraftData,
  normalizePaybackBasis,
} from "@/lib/warehouse-aircraft-fields";

describe("buildWarehouseAircraftData", () => {
  it("parses comma-formatted money fields", () => {
    const data = buildWarehouseAircraftData({
      leadPilotSalary: "240,000",
      leadPilotTrainingCost: "35,000",
      defaultMinimumCrew: "3",
    });

    expect(data.leadPilotSalary).toBe(240000);
    expect(data.leadPilotTrainingCost).toBe(35000);
    expect(data.defaultMinimumCrew).toBe(3);
  });

  it("normalizes legacy payback basis values", () => {
    const data = buildWarehouseAircraftData({
      charterPaybackBasis: "block_hours",
      fuelSurchargePaybackBasis: "flight_hours",
    });

    expect(data.charterPaybackBasis).toBe("block_time");
    expect(data.fuelSurchargePaybackBasis).toBe("flight_time");
  });

  it("rejects invalid numeric input with a readable error", () => {
    expect(() =>
      buildWarehouseAircraftData({
        leadPilotTrainingCost: "not-a-number",
      })
    ).toThrow("Lead Pilot Training Cost must be a valid number");
  });
});

describe("normalizePaybackBasis", () => {
  it("maps flight variants to flight_time", () => {
    expect(normalizePaybackBasis("flight_time")).toBe("flight_time");
    expect(normalizePaybackBasis("flight_hours")).toBe("flight_time");
  });

  it("maps block variants to block_time", () => {
    expect(normalizePaybackBasis("block_time")).toBe("block_time");
    expect(normalizePaybackBasis("block_hours")).toBe("block_time");
  });
});
