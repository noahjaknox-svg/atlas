import type { FilterField } from "@/lib/data-hub-filters";
import { AIRCRAFT_CATEGORIES } from "@/components/internal/data-hub/field-options";

export const AIRCRAFT_FILTERS: FilterField[] = [
  {
    key: "category",
    label: "Category",
    type: "select",
    options: AIRCRAFT_CATEGORIES,
  },
];

export const FBO_FILTERS: FilterField[] = [
  { key: "airportIcao", label: "Airport ICAO", type: "text", placeholder: "KSDL" },
];

/** Filter fields shown in the sidebar for each Data Hub tab. */
export function filtersForTab(tab: string): FilterField[] {
  switch (tab) {
    case "aircraft":
      return AIRCRAFT_FILTERS;
    case "fbos":
      return FBO_FILTERS;
    default:
      return [];
  }
}
