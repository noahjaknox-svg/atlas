export const AIRCRAFT_CATEGORIES = [
  { value: "light_jet", label: "Light jet" },
  { value: "midsize_jet", label: "Midsize jet" },
  { value: "super_midsize_jet", label: "Super midsize jet" },
  { value: "large_cabin_jet", label: "Large cabin jet" },
  { value: "ultra_long_range_jet", label: "Ultra long range" },
  { value: "turboprop", label: "Turboprop" },
  { value: "piston", label: "Piston" },
  { value: "helicopter", label: "Helicopter" },
  { value: "other", label: "Other" },
];

export const CREW_ROLES = [
  { value: "pic", label: "PIC" },
  { value: "sic", label: "SIC" },
  { value: "cabin_attendant", label: "Cabin attendant" },
];

export const TRAINING_TYPES = [
  { value: "initial", label: "Initial" },
  { value: "recurrent", label: "Recurrent" },
];

export const PROGRAM_TYPES = [
  { value: "engine", label: "Engine" },
  { value: "apu", label: "APU" },
  { value: "parts", label: "Parts" },
  { value: "airframe", label: "Airframe" },
  { value: "avionics", label: "Avionics" },
  { value: "other", label: "Other" },
];

export const HANGAR_PRICING = [
  { value: "quoted", label: "Quoted annual" },
  { value: "sqft_rate", label: "Per sqft rate" },
  { value: "category_estimate", label: "Category estimate" },
];

export const DATA_CONFIDENCE = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const OPERATING_COST_KEYS = [
  { value: "wifi_annual", label: "Wi-Fi (annual)" },
  { value: "subscriptions_annual", label: "Subscriptions" },
  { value: "cleaning_annual", label: "Cleaning" },
  { value: "supplies_annual", label: "Supplies" },
  { value: "management_fee", label: "Management fee" },
  { value: "maintenance_management_fee", label: "Maintenance mgmt fee" },
];
