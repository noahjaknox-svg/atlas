import { describe, expect, it } from "vitest";
import {
  applyProformaAircraftValueScenario,
  applyProformaFinancingScenario,
  applyProformaScenarioOverlays,
  normalizeProformaAircraftValueStorage,
  normalizeProformaFinancingEnabledStorage,
  normalizeProformaFinancingFieldStorage,
  proformaFinancingScenarioPatch,
  PROFORMA_AIRCRAFT_VALUE_KEY,
  PROFORMA_FINANCING_ENABLED_KEY,
} from "@/lib/proforma-scenario-assumptions";

describe("applyProformaAircraftValueScenario", () => {
  it("uses scenario value when set", () => {
    const effective = { aircraft_value: "9000000" };
    const raw = { [PROFORMA_AIRCRAFT_VALUE_KEY]: "12000000" };
    expect(applyProformaAircraftValueScenario(effective, raw).aircraft_value).toBe("12000000");
  });

  it("falls back to configurator effective value when scenario is empty", () => {
    const effective = { aircraft_value: "9000000" };
    expect(applyProformaAircraftValueScenario(effective, {}).aircraft_value).toBe("9000000");
  });
});

describe("applyProformaFinancingScenario", () => {
  it("overlays demo financing onto effective assumptions", () => {
    const effective = {
      financing_enabled: "no",
      down_payment_percent: "20",
      interest_rate: "6",
    };
    const raw = {
      [PROFORMA_FINANCING_ENABLED_KEY]: "yes",
      proforma_down_payment_percent: "25",
    };
    const out = applyProformaFinancingScenario(effective, raw);
    expect(out.financing_enabled).toBe("yes");
    expect(out.down_payment_percent).toBe("25");
    expect(out.interest_rate).toBe("6");
  });
});

describe("proformaFinancingScenarioPatch", () => {
  it("writes scenario keys only, not configurator financing fields", () => {
    const baseline = {
      financing_scenario_mode: "hide_default",
      financing_enabled: "no",
      down_payment_percent: "20",
      interest_rate: "6",
      term_months: "120",
      balloon_payment: "0",
      aircraft_value: "9000000",
    };
    const patch = proformaFinancingScenarioPatch(
      {
        ...baseline,
        financing_enabled: "yes",
        down_payment_percent: "25",
        aircraft_value: "12000000",
      },
      baseline
    );
    expect(patch.financing_enabled).toBeUndefined();
    expect(patch[PROFORMA_FINANCING_ENABLED_KEY]).toBe("yes");
    expect(patch.proforma_down_payment_percent).toBe("25");
    expect(patch[PROFORMA_AIRCRAFT_VALUE_KEY]).toBe("12000000");
  });
});

describe("normalizeProformaAircraftValueStorage", () => {
  it("clears storage when scenario matches configurator baseline", () => {
    expect(normalizeProformaAircraftValueStorage("9000000", "9000000")).toBe("");
  });

  it("stores scenario override when different from baseline", () => {
    expect(normalizeProformaAircraftValueStorage("12000000", "9000000")).toBe("12000000");
  });
});

describe("normalizeProformaFinancingEnabledStorage", () => {
  it("clears when matching configurator mode default", () => {
    expect(normalizeProformaFinancingEnabledStorage("no", "no")).toBe("");
  });

  it("stores when different from configurator", () => {
    expect(normalizeProformaFinancingEnabledStorage("yes", "no")).toBe("yes");
  });
});

describe("applyProformaScenarioOverlays", () => {
  it("applies aircraft and financing overlays together", () => {
    const effective = {
      aircraft_value: "9000000",
      financing_enabled: "no",
    };
    const raw = {
      [PROFORMA_AIRCRAFT_VALUE_KEY]: "10000000",
      [PROFORMA_FINANCING_ENABLED_KEY]: "yes",
    };
    const out = applyProformaScenarioOverlays(effective, raw);
    expect(out.aircraft_value).toBe("10000000");
    expect(out.financing_enabled).toBe("yes");
  });
});

describe("normalizeProformaFinancingFieldStorage", () => {
  it("clears matching numeric fields", () => {
    expect(normalizeProformaFinancingFieldStorage("20", "20")).toBe("");
  });
});
