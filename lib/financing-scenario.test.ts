import { describe, expect, it } from "vitest";
import {
  isFinancingScenarioRemoved,
  isFinancingScenarioVisible,
  normalizeFinancingScenarioMode,
  resolveInitialFinancingEnabled,
} from "@/lib/financing-scenario";

describe("financing-scenario", () => {
  it("normalizes unknown modes to hide_default", () => {
    expect(normalizeFinancingScenarioMode(undefined)).toBe("hide_default");
    expect(normalizeFinancingScenarioMode("")).toBe("hide_default");
  });

  it("hides financing UI when mode is remove", () => {
    expect(isFinancingScenarioRemoved("remove")).toBe(true);
    expect(isFinancingScenarioVisible({ financing_scenario_mode: "remove" })).toBe(false);
    expect(isFinancingScenarioVisible({ financing_scenario_mode: "show_default" })).toBe(true);
  });

  it("derives financing enabled from mode only", () => {
    expect(resolveInitialFinancingEnabled({ financing_scenario_mode: "show_default" })).toBe(true);
    expect(resolveInitialFinancingEnabled({ financing_scenario_mode: "hide_default" })).toBe(false);
    expect(
      resolveInitialFinancingEnabled({
        financing_scenario_mode: "hide_default",
        financing_enabled: "yes",
      })
    ).toBe(false);
  });
});
