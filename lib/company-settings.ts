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

type CompanySettingsDelegate = {
  findUnique: (args: {
    where: { id: string };
  }) => Promise<CompanySettings | null>;
  create: (args: { data: { id: string } }) => Promise<CompanySettings>;
};

/** Get the single company-settings row, creating it with defaults if missing. */
export async function getCompanySettings(): Promise<CompanySettings> {
  const delegate = (
    prisma as unknown as { companySettings?: CompanySettingsDelegate }
  ).companySettings;

  if (!delegate?.findUnique) {
    return fallbackCompanySettings();
  }

  const existing = await delegate.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return delegate.create({ data: { id: "default" } });
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
    defaultInsuranceMode: null,
    defaultInsuranceAnnual: null,
    defaultInsurancePremiumPercent: null,
    defaultRegistrationTaxRate: null,
    defaultDownPaymentPercent: null,
    defaultInterestRate: null,
    defaultTermMonths: null,
    defaultBalloonPayment: null,
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
    defaultInsuranceMode: s.defaultInsuranceMode,
    defaultInsuranceAnnual: s.defaultInsuranceAnnual,
    defaultInsurancePremiumPercent:
      s.defaultInsurancePremiumPercent != null
        ? Number(s.defaultInsurancePremiumPercent)
        : null,
    defaultRegistrationTaxRate:
      s.defaultRegistrationTaxRate != null ? Number(s.defaultRegistrationTaxRate) : null,
    defaultDownPaymentPercent:
      s.defaultDownPaymentPercent != null ? Number(s.defaultDownPaymentPercent) : null,
    defaultInterestRate: s.defaultInterestRate != null ? Number(s.defaultInterestRate) : null,
    defaultTermMonths: s.defaultTermMonths,
    defaultBalloonPayment: s.defaultBalloonPayment,
  };
}

export type CompanySettingsValues = ReturnType<typeof serializeCompanySettings>;
