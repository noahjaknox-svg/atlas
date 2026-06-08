import type { FilterField } from "@/lib/data-hub-filters";
import {
  AIRCRAFT_CATEGORIES,
  CREW_ROLES,
  HANGAR_PRICING,
  OPERATING_COST_KEYS,
  PROGRAM_TYPES,
} from "@/components/internal/data-hub/field-options";

export const AIRPORT_FILTERS: FilterField[] = [
  { key: "state", label: "State", type: "text", placeholder: "AZ" },
];

export const FBO_FILTERS: FilterField[] = [
  { key: "airportId", label: "Airport", type: "searchable", searchKind: "airport" },
];

export const AIRCRAFT_FILTERS: FilterField[] = [
  {
    key: "category",
    label: "Category",
    type: "select",
    options: AIRCRAFT_CATEGORIES,
  },
];

export const OPERATING_FILTERS: FilterField[] = [
  { key: "aircraftId", label: "Aircraft", type: "searchable", searchKind: "aircraft" },
  {
    key: "costKey",
    label: "Cost key",
    type: "select",
    options: OPERATING_COST_KEYS,
  },
];

export const CREW_FILTERS: FilterField[] = [
  { key: "aircraftId", label: "Aircraft", type: "searchable", searchKind: "aircraft" },
  { key: "role", label: "Role", type: "select", options: CREW_ROLES },
];

export const PROGRAM_FILTERS: FilterField[] = [
  { key: "aircraftId", label: "Aircraft", type: "searchable", searchKind: "aircraft" },
  { key: "programType", label: "Program", type: "select", options: PROGRAM_TYPES },
];

export const TRAINING_FILTERS: FilterField[] = [
  { key: "aircraftId", label: "Aircraft", type: "searchable", searchKind: "aircraft" },
  { key: "role", label: "Role", type: "select", options: CREW_ROLES },
];

export const INSURANCE_FILTERS: FilterField[] = [
  { key: "aircraftId", label: "Aircraft", type: "searchable", searchKind: "aircraft" },
  { key: "state", label: "State", type: "text", placeholder: "AZ" },
];

export const HANGAR_FILTERS: FilterField[] = [
  { key: "aircraftId", label: "Aircraft", type: "searchable", searchKind: "aircraft" },
  { key: "airportId", label: "Airport", type: "searchable", searchKind: "airport" },
  {
    key: "pricingMethod",
    label: "Pricing",
    type: "select",
    options: HANGAR_PRICING,
  },
];

export const TAX_FILTERS: FilterField[] = [
  { key: "state", label: "State", type: "text", placeholder: "AZ" },
];

export const CHARTER_FILTERS: FilterField[] = [
  { key: "aircraftId", label: "Aircraft", type: "searchable", searchKind: "aircraft" },
  { key: "airportId", label: "Airport", type: "searchable", searchKind: "airport" },
];

export const SCENARIO_FILTERS: FilterField[] = [
  { key: "aircraftId", label: "Aircraft", type: "searchable", searchKind: "aircraft" },
];

/** Filter fields shown in the sidebar for each Data Hub tab. */
export function filtersForTab(tab: string): FilterField[] {
  switch (tab) {
    case "airports":
      return [...AIRPORT_FILTERS, ...FBO_FILTERS];
    case "aircraft":
      return AIRCRAFT_FILTERS;
    case "operating":
      return OPERATING_FILTERS;
    case "crew":
      return CREW_FILTERS;
    case "programs":
      return PROGRAM_FILTERS;
    case "training":
      return TRAINING_FILTERS;
    case "insurance":
      return INSURANCE_FILTERS;
    case "hangar":
      return HANGAR_FILTERS;
    case "taxes":
      return TAX_FILTERS;
    case "charter":
      return CHARTER_FILTERS;
    case "scenarios":
      return SCENARIO_FILTERS;
    default:
      return [];
  }
}
