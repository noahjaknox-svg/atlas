import { z } from "zod";
import type { CatalogLineItem, SystemCalcId } from "@/lib/line-item-catalog";

/** Where each calculated (system) line gets its number — shown on the Line Items page. */
export const SYSTEM_CALC_SOURCES: Record<SystemCalcId, string> = {
  charter_revenue: "Charter rate × charter revenue hours × payback %",
  fuel_surcharge: "Aircraft type fuel surcharge × charter flight hours",
  fet_refund: "Company settings FET rate × charter fuel burn",
  crew: "Crew composition and salaries (aircraft type Crew tab)",
  crew_training: "Crew training costs (aircraft type Crew tab)",
  pilot_charter_incentive: "Pilot charter incentive × charter flight hours",
  management_fee: "Company settings → Annual Management Fee",
  maintenance_management_fee: "Company settings → Maintenance Mgmt Fee",
  hangar: "FBO hangar rate or per-aircraft hangar override",
  registration: "Company settings registration tax × aircraft value",
  insurance: "Company settings insurance defaults",
  debt_service: "Proposal financing terms",
  fuel: "Fuel burn × blended fuel price",
};

export type LineItemWire = CatalogLineItem & {
  builtIn: boolean;
  calculatedFrom: string | null;
  /** Aircraft types with a value (custom items only). */
  valueCount: number | null;
};

export const createLineItemSchema = z.object({
  label: z.string().trim().min(1).max(80),
  section: z.enum(["revenue", "fixed", "variable"]),
  kind: z.enum(["annual", "hourly"]),
  appliesTo: z.enum(["owner", "charter", "both"]).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateLineItemSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  // Custom items only:
  kind: z.enum(["annual", "hourly"]).optional(),
  appliesTo: z.enum(["owner", "charter", "both"]).optional(),
});

export const lineItemValuesSchema = z.object({
  values: z.record(z.string(), z.union([z.number().finite(), z.null()])),
});

/** Fixed lines are always annual, variable lines always hourly; revenue can be either. */
export function coerceKind(section: CatalogLineItem["section"], kind: CatalogLineItem["kind"]): CatalogLineItem["kind"] {
  if (section === "fixed") return "annual";
  if (section === "variable") return "hourly";
  return kind;
}
