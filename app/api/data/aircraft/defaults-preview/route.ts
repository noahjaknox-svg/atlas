import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { getCompanySettings } from "@/lib/company-settings";
import { loadCompanySettingsDefaults } from "@/lib/company-settings-defaults";
import { COST_OVERRIDE_KEYS } from "@/lib/cost-overrides";

export const dynamic = "force-dynamic";

/**
 * Current company-wide values for the costs an aircraft type can optionally override
 * (shown as "Company default" hints in the aircraft type editor).
 */
export async function GET() {
  try {
    await requireDepartmentAccess("data_warehouse");
    const defaults = loadCompanySettingsDefaults(await getCompanySettings());
    const out: Record<string, string> = {};
    for (const key of [...COST_OVERRIDE_KEYS, "jet_fuel_tax_differential_per_gal"]) {
      if (defaults[key] != null && defaults[key] !== "") out[key] = String(defaults[key]);
    }
    return jsonOk({ defaults: out });
  } catch (e) {
    return handleApiError(e);
  }
}
