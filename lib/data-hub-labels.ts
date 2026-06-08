/** Human-readable labels for Data Hub enum / snake_case values. */

const LABELS: Record<string, string> = {
  light_jet: "Light jet",
  midsize_jet: "Midsize jet",
  super_midsize_jet: "Super-midsize jet",
  large_cabin_jet: "Large cabin jet",
  ultra_long_range_jet: "Ultra-long-range jet",
  high: "High",
  medium: "Medium",
  low: "Low",
  pic: "PIC",
  sic: "SIC",
  recurrent: "Recurrent",
  initial: "Initial",
  parts: "Parts program",
  engine: "Engine program",
  apu: "APU program",
  airframe: "Airframe / maintenance reserve",
  other: "Other",
  sqft_rate: "Per sq ft",
  flat_annual: "Flat annual",
  monthly: "Monthly",
  cleaning_annual: "Cleaning (annual)",
  maintenance_management_fee: "Maintenance management fee",
  aircraft_management_fee: "Aircraft management fee",
};

export function formatHubLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return LABELS[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
