import { describe, expect, it } from "vitest";
import {
  COMPANY_SETTINGS_PARITY,
  FIELD_PARITY_EXCEPTIONS,
  WAREHOUSE_AIRCRAFT_PARITY,
  workspaceKeysPreservedOnRefresh,
} from "@/lib/field-parity-manifest";

describe("field-parity-manifest", () => {
  it("maps warehouse-only fields to workspace keys", () => {
    const keys = WAREHOUSE_AIRCRAFT_PARITY.map((p) => p.workspaceKey);
    expect(keys).toContain("range_at_max_passengers");
    expect(keys).toContain("aircraft_category");
    expect(keys).toContain("model_code");
    expect(keys).toContain("airframe_program_rate");
  });

  it("maps company settings to workspace insurance and financing template keys", () => {
    const keys = COMPANY_SETTINGS_PARITY.map((p) => p.workspaceKey);
    expect(keys).toContain("insurance_mode");
    expect(keys).toContain("down_payment_percent");
    expect(keys).toContain("interest_rate");
    expect(keys).not.toContain("financing_enabled");
    expect(keys).not.toContain("loan_amount");
  });

  it("maps operating fees from warehouse aircraft", () => {
    const keys = WAREHOUSE_AIRCRAFT_PARITY.map((p) => p.workspaceKey);
    expect(keys).toContain("wifi_annual");
    expect(keys).toContain("airport_fees_annual");
  });

  it("preserves user insurance overrides on refresh", () => {
    const preserved = workspaceKeysPreservedOnRefresh();
    expect(preserved.has("insurance_annual")).toBe(true);
    expect(preserved.has("proforma_line_visibility")).toBe(false);
  });

  it("documents instance-only exceptions", () => {
    expect(FIELD_PARITY_EXCEPTIONS.has("tail_number")).toBe(true);
    expect(FIELD_PARITY_EXCEPTIONS.has("owner_annual_hours")).toBe(true);
  });
});
