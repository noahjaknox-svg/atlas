import { describe, expect, it } from "vitest";
import { applyWarehouseDefaults } from "@/lib/warehouse-assumption-seed";
import { PROFORMA_VISIBILITY_KEY } from "@/lib/proforma-line-visibility";
import { workspaceKeysPreservedOnRefresh, PROFORMA_SCENARIO_KEYS } from "@/lib/field-parity-manifest";
import { PROFORMA_SCENARIO_ASSUMPTION_KEYS } from "@/lib/proforma-scenario-assumptions";

describe("warehouse isolation after publish (regression)", () => {
  it("parity manifest preserve keys survive manual refresh", () => {
    const preserved = workspaceKeysPreservedOnRefresh();
    for (const key of ["insurance_annual", "model_code", "aircraft_value"]) {
      expect(preserved.has(key)).toBe(true);
      expect(
        applyWarehouseDefaults({ [key]: "user" }, { [key]: "warehouse" }, "refresh")[key]
      ).toBe("user");
    }
  });

  it("warehouse refresh does not overwrite line visibility", () => {
    const stored = JSON.stringify({ engine_pl: false, parts_pl: true });
    const next = applyWarehouseDefaults(
      { [PROFORMA_VISIBILITY_KEY]: stored },
      { [PROFORMA_VISIBILITY_KEY]: JSON.stringify({ engine_pl: true, parts_pl: false }) },
      "refresh"
    );
    expect(next[PROFORMA_VISIBILITY_KEY]).toBe(stored);
  });

  it("seed replaces empty visibility with warehouse defaults", () => {
    const next = applyWarehouseDefaults(
      {},
      { [PROFORMA_VISIBILITY_KEY]: JSON.stringify({ parts_pl: true }) },
      "seed"
    );
    expect(next[PROFORMA_VISIBILITY_KEY]).toContain("parts_pl");
  });

  it("refresh preserves demo proforma scenario keys", () => {
    for (const key of PROFORMA_SCENARIO_ASSUMPTION_KEYS) {
      expect(PROFORMA_SCENARIO_KEYS.includes(key)).toBe(true);
      expect(
        applyWarehouseDefaults({ [key]: "demo" }, { [key]: "warehouse" }, "refresh")[key]
      ).toBe("demo");
    }
  });
});
