import type { FormField } from "./entity-dialog";

export const AIRCRAFT_SEARCH_FIELD: FormField = {
  key: "aircraftMasterId",
  label: "Aircraft",
  type: "searchable",
  searchKind: "aircraft",
  displayFromRow: "aircraft",
  required: true,
  placeholder: "Search manufacturer or model…",
};
