import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getCompanySettings, serializeCompanySettings } from "@/lib/company-settings";
import { parseOptionalDecimal, parseOptionalInt } from "@/lib/data-hub-parse";

export async function GET() {
  try {
    await requireDepartmentAccess("data_warehouse");
    const settings = await getCompanySettings();
    return jsonOk(serializeCompanySettings(settings));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const body = await request.json();
    await getCompanySettings();
    const updated = await prisma.companySettings.update({
      where: { id: "default" },
      data: {
        usAverageFuelCost: parseOptionalDecimal(body.usAverageFuelCost),
        annualManagementFee: parseOptionalInt(body.annualManagementFee),
        annualMaintenanceManagementFee: parseOptionalInt(body.annualMaintenanceManagementFee),
        charterPaybackPercent: parseOptionalDecimal(body.charterPaybackPercent),
        charterBlockToFlightRatio: parseOptionalDecimal(body.charterBlockToFlightRatio),
        crewBenefitsPercent: parseOptionalDecimal(body.crewBenefitsPercent),
        fuelTaxRefund: parseOptionalDecimal(body.fuelTaxRefund),
        defaultInsuranceMode:
          body.defaultInsuranceMode != null ? String(body.defaultInsuranceMode) : undefined,
        defaultInsuranceAnnual: parseOptionalInt(body.defaultInsuranceAnnual),
        defaultInsurancePremiumPercent: parseOptionalDecimal(body.defaultInsurancePremiumPercent),
        defaultRegistrationTaxRate: parseOptionalDecimal(body.defaultRegistrationTaxRate),
        defaultDownPaymentPercent: parseOptionalDecimal(body.defaultDownPaymentPercent),
        defaultInterestRate: parseOptionalDecimal(body.defaultInterestRate),
        defaultTermMonths: parseOptionalInt(body.defaultTermMonths),
        defaultBalloonPayment: parseOptionalInt(body.defaultBalloonPayment),
      },
    });
    return jsonOk(serializeCompanySettings(updated));
  } catch (e) {
    return handleApiError(e);
  }
}
