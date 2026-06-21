import type { CompanySettings } from "@prisma/client";
import { prisma } from "@/lib/db";

export const COMPANY_SETTINGS_DEFAULTS = {
  usAverageFuelCost: 5.5,
  annualManagementFee: 120000,
  annualMaintenanceManagementFee: 60000,
  charterPaybackPercent: 82.5,
  crewBenefitsPercent: 0.16,
  fuelTaxRefund: 0.175,
};

/** Get the single company-settings row, creating it with defaults if missing. */
export async function getCompanySettings(): Promise<CompanySettings> {
  const existing = await prisma.companySettings.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return prisma.companySettings.create({ data: { id: "default" } });
}

export function serializeCompanySettings(s: CompanySettings) {
  return {
    id: s.id,
    usAverageFuelCost: Number(s.usAverageFuelCost),
    annualManagementFee: s.annualManagementFee,
    annualMaintenanceManagementFee: s.annualMaintenanceManagementFee,
    charterPaybackPercent: Number(s.charterPaybackPercent),
    crewBenefitsPercent: Number(s.crewBenefitsPercent),
    fuelTaxRefund: Number(s.fuelTaxRefund),
  };
}

export type CompanySettingsValues = ReturnType<typeof serializeCompanySettings>;
