import { describe, expect, it } from "vitest";
import { applyWarehouseDefaults } from "@/lib/warehouse-assumption-seed";
import { PROFORMA_VISIBILITY_KEY } from "@/lib/proforma-line-visibility";
import { calculateWorkspaceProFormaScenarios } from "@/lib/workspace-proforma-scenarios";

describe("data flow integration matrix", () => {
  it("seed → user override → refresh preserves override", () => {
    const seeded = applyWarehouseDefaults(
      {},
      { charter_rate: "5000", fuel_burn_gph: "350", insurance_annual: "40000" },
      "seed"
    );
    const overridden = {
      ...seeded,
      insurance_annual: "62000",
      tail_number: "N999",
    };

    const refreshed = applyWarehouseDefaults(
      overridden,
      {
        charter_rate: "5500",
        fuel_burn_gph: "360",
        engine_program_rate: "800",
        insurance_annual: "45000",
      },
      "refresh"
    );

    expect(refreshed.insurance_annual).toBe("62000");
    expect(refreshed.tail_number).toBe("N999");
    expect(refreshed.charter_rate).toBe("5500");
    expect(refreshed.fuel_burn_gph).toBe("360");
    expect(refreshed.engine_program_rate).toBe("800");
  });

  it("refresh preserves pro forma line visibility toggles", () => {
    const userVisibility = JSON.stringify({ parts_pl: false });
    const refreshed = applyWarehouseDefaults(
      {
        [PROFORMA_VISIBILITY_KEY]: userVisibility,
        insurance_annual: "60000",
      },
      {
        [PROFORMA_VISIBILITY_KEY]: JSON.stringify({ parts_pl: true }),
        insurance_annual: "55000",
      },
      "refresh"
    );

    expect(refreshed[PROFORMA_VISIBILITY_KEY]).toBe(userVisibility);
    expect(refreshed.insurance_annual).toBe("60000");
  });

  it("publish scenario path uses workspace statement engine", () => {
    const assumptions = {
      fuel_burn_gph: "300",
      home_fuel_price: "6",
      away_fuel_price: "7",
      home_fuel_pct: "70",
      engine_program_rate: "800",
      apu_program_rate: "100",
      parts_program_rate: "200",
      inspection_reserve_rate: "50",
      maintenance_reserve_rate: "75",
      trip_expense_per_hour: "25",
      charter_rate: "5500",
      charter_payback_pct: "82.5",
      fuel_surcharge: "150",
      owner_annual_hours: "400",
      charter_block_hours: "300",
      charter_flight_hours: "339",
      usage_type: "part_91",
      lead_pilot_enabled: "no",
      crew_step_index: "0",
      pic_salary: "250000",
      sic_salary: "180000",
      management_fee: "120000",
      aircraft_value: "25000000",
      insurance_mode: "fixed",
      insurance_annual: "50000",
    };

    const [result] = calculateWorkspaceProFormaScenarios(assumptions, [
      {
        scenarioIndex: 1,
        charterBlockHours: 300,
        charterFlightHours: 339,
        ownerFlightHours: 125,
        crewStepIndex: 0,
        leadPilotEnabled: false,
      },
    ]);

    expect(Number.isFinite(result!.netAnnualCost)).toBe(true);
    expect(Number.isFinite(result!.totalRevenue)).toBe(true);
    expect(result!.ownerFlightHours).toBe(125);
  });
});
