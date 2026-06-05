/** Shared option lists — keep free of aircraft-workspace / tab-fields imports. */

export const VALUE_SOURCE_OPTIONS = [
  { value: "owner_provided", label: "Owner provided" },
  { value: "broker_estimate", label: "Broker estimate" },
  { value: "vref", label: "VREF" },
  { value: "aircraft_bluebook", label: "Aircraft Bluebook" },
  { value: "jetnet", label: "JetNet" },
  { value: "amstat", label: "AMSTAT" },
  { value: "internal_estimate", label: "Internal estimate" },
  { value: "appraisal", label: "Appraisal" },
  { value: "other", label: "Other" },
];

export const YES_NO_OPTIONS = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
];

export const CREW_MODEL_OPTIONS = [
  { value: "full_time", label: "Full-time employees" },
  { value: "contract", label: "Contract / mixed" },
  { value: "owner_provided", label: "Owner-provided crew" },
];

export const FET_TREATMENT_OPTIONS = [
  { value: "pass_through", label: "Pass-through" },
  { value: "absorbed", label: "Absorbed" },
  { value: "excluded", label: "Excluded" },
];

export const CHARTER_DEMAND_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const FUEL_SOURCE_OPTIONS = [
  { value: "fbo_retail", label: "FBO retail" },
  { value: "contract", label: "Contract fuel" },
  { value: "owner_provided", label: "Owner provided" },
  { value: "manual", label: "Manual override" },
];

export const HANGAR_SOURCE_OPTIONS = [
  { value: "data_hub", label: "Data hub" },
  { value: "fbo_quote", label: "FBO quote" },
  { value: "owner_provided", label: "Owner provided" },
  { value: "manual", label: "Manual override" },
];

export const INSURANCE_MODE_OPTIONS = [
  { value: "annual", label: "Flat annual quote" },
  { value: "percent_hull", label: "Percent of hull value" },
];
