import { describe, expect, it } from "vitest";
import { loadCompanySettingsDefaults } from "./company-settings-defaults";
import type { CompanySettings } from "@prisma/client";

function mockSettings(
  partial: Partial<CompanySettings> = {}
): CompanySettings {
  return {
    id: "default",
    usAverageFuelCost: 5.5 as unknown as CompanySettings["usAverageFuelCost"],
    annualManagementFee: 120000,
    annualMaintenanceManagementFee: 60000,
    charterPaybackPercent: 82.5 as unknown as CompanySettings["charterPaybackPercent"],
    crewBenefitsPercent: 0.16 as unknown as CompanySettings["crewBenefitsPercent"],
    fuelTaxRefund: 0.175 as unknown as CompanySettings["fuelTaxRefund"],
    charterBlockToFlightRatio: 1.13 as unknown as CompanySettings["charterBlockToFlightRatio"],
    defaultInsuranceMode: null,
    defaultInsuranceAnnual: null,
    defaultInsurancePremiumPercent: null,
    defaultRegistrationTaxRate: null,
    defaultDownPaymentPercent: null,
    defaultInterestRate: null,
    defaultTermMonths: null,
    defaultBalloonPayment: null,
    updatedAt: new Date(),
    ...partial,
  };
}

describe("company-settings-defaults", () => {
  it("maps block-to-flight factor to workspace assumption key", () => {
    const map = loadCompanySettingsDefaults(mockSettings({ charterBlockToFlightRatio: 1.2 as unknown as CompanySettings["charterBlockToFlightRatio"] }));
    expect(map.charter_block_to_flight_ratio).toBe("1.2");
  });
});
