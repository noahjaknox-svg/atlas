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
  const delegate = (
    prisma as unknown as {
      companySettings?: {
        findUnique: typeof prisma.proposal.findUnique;
        create: typeof prisma.proposal.create;
      };
    }
  ).companySettings;

  if (!delegate?.findUnique) {
    return fallbackCompanySettings();
  }

  const existing = await delegate.findUnique({ where: { id: "default" } });
  if (existing) return existing as CompanySettings;
  return delegate.create({ data: { id: "default" } }) as Promise<CompanySettings>;
}

function fallbackCompanySettings(): CompanySettings {
  return {
    id: "default",
    usAverageFuelCost: COMPANY_SETTINGS_DEFAULTS.usAverageFuelCost as unknown as CompanySettings["usAverageFuelCost"],
    annualManagementFee: COMPANY_SETTINGS_DEFAULTS.annualManagementFee,
    annualMaintenanceManagementFee: COMPANY_SETTINGS_DEFAULTS.annualMaintenanceManagementFee,
    charterPaybackPercent: COMPANY_SETTINGS_DEFAULTS.charterPaybackPercent as unknown as CompanySettings["charterPaybackPercent"],
    crewBenefitsPercent: COMPANY_SETTINGS_DEFAULTS.crewBenefitsPercent as unknown as CompanySettings["crewBenefitsPercent"],
    fuelTaxRefund: COMPANY_SETTINGS_DEFAULTS.fuelTaxRefund as unknown as CompanySettings["fuelTaxRefund"],
    updatedAt: new Date(),
  };
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
