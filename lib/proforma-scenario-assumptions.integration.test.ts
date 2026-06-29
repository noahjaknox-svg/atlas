import { describe, expect, it } from "vitest";
import {
  applyProformaScenarioOverlays,
  proformaFinancingScenarioPatch,
  PROFORMA_AIRCRAFT_VALUE_KEY,
  PROFORMA_FINANCING_ENABLED_KEY,
} from "@/lib/proforma-scenario-assumptions";
import { assumptionsWithFinancingDefault } from "@/lib/financing-scenario";

describe("demo pro forma scenario isolation", () => {
  const configuratorBaseline = assumptionsWithFinancingDefault({
    financing_scenario_mode: "hide_default",
    financing_enabled: "no",
    down_payment_percent: "20",
    interest_rate: "6",
    term_months: "120",
    balloon_payment: "0",
    aircraft_value: "9000000",
  });

  it("demo financing edit writes scenario keys only", () => {
    const demoState = {
      ...configuratorBaseline,
      financing_enabled: "yes",
      down_payment_percent: "25",
      aircraft_value: "12000000",
    };
    const patch = proformaFinancingScenarioPatch(demoState, configuratorBaseline);

    expect(patch.financing_enabled).toBeUndefined();
    expect(patch.down_payment_percent).toBeUndefined();
    expect(patch[PROFORMA_FINANCING_ENABLED_KEY]).toBe("yes");
    expect(patch.proforma_down_payment_percent).toBe("25");
    expect(patch[PROFORMA_AIRCRAFT_VALUE_KEY]).toBe("12000000");
  });

  it("demo overlays do not mutate configurator baseline map", () => {
    const raw = {
      ...configuratorBaseline,
      [PROFORMA_AIRCRAFT_VALUE_KEY]: "10000000",
      [PROFORMA_FINANCING_ENABLED_KEY]: "yes",
      proforma_down_payment_percent: "30",
    };
    const effective = applyProformaScenarioOverlays(configuratorBaseline, raw);

    expect(effective.aircraft_value).toBe("10000000");
    expect(effective.financing_enabled).toBe("yes");
    expect(configuratorBaseline.aircraft_value).toBe("9000000");
    expect(configuratorBaseline.financing_enabled).toBe("no");
  });
});
