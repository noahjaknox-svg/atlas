import type { CompanySettings } from "@prisma/client";

function setStr(map: Record<string, string>, key: string, value: string | null | undefined) {
  if (value == null || String(value).trim() === "") return;
  map[key] = String(value).trim();
}

function setInt(map: Record<string, string>, key: string, value: number | null | undefined) {
  if (value == null) return;
  map[key] = String(value);
}

function setDecimal(map: Record<string, string>, key: string, value: { toString(): string } | null | undefined) {
  if (value == null) return;
  map[key] = String(Number(value));
}

/** Map company settings row → workspace assumptions (only non-null DB values). */
export function loadCompanySettingsDefaults(
  settings: CompanySettings
): Record<string, string> {
  const map: Record<string, string> = {};

  if (settings.annualManagementFee != null) {
    map.management_fee = String(settings.annualManagementFee);
  }
  if (settings.annualMaintenanceManagementFee != null) {
    map.maintenance_management_fee = String(settings.annualMaintenanceManagementFee);
  }
  if (settings.charterPaybackPercent != null) {
    map.charter_payback_pct = String(Number(settings.charterPaybackPercent));
  }
  if (settings.crewBenefitsPercent != null) {
    map.benefits_pct = String(Number(settings.crewBenefitsPercent) * 100);
  }
  if (settings.fuelTaxRefund != null) {
    map.jet_fuel_tax_differential_per_gal = String(Number(settings.fuelTaxRefund));
  }
  if (settings.usAverageFuelCost != null) {
    map.away_fuel_price = String(Number(settings.usAverageFuelCost));
  }

  setStr(map, "insurance_mode", settings.defaultInsuranceMode);
  setInt(map, "insurance_annual", settings.defaultInsuranceAnnual);
  setDecimal(map, "insurance_premium_percent", settings.defaultInsurancePremiumPercent);
  setDecimal(map, "registration_tax_rate", settings.defaultRegistrationTaxRate);
  setDecimal(map, "down_payment_percent", settings.defaultDownPaymentPercent);
  setDecimal(map, "interest_rate", settings.defaultInterestRate);
  setInt(map, "term_months", settings.defaultTermMonths);
  setInt(map, "balloon_payment", settings.defaultBalloonPayment);

  return map;
}
