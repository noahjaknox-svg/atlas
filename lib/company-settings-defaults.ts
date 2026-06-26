import type { CompanySettings } from "@prisma/client";

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

  return map;
}
