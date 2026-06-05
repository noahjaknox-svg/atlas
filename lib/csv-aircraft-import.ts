import { readFileSync } from "fs";
import path from "path";
import type { AircraftCategory } from "@prisma/client";

export type AircraftSpec = {
  csvColumn: string;
  manufacturer: string;
  model: string;
  category: AircraftCategory;
};

/** Canonical aircraft types — first occurrence used for master data. */
export const CANONICAL_AIRCRAFT: AircraftSpec[] = [
  { csvColumn: "Lear 45XR", manufacturer: "Bombardier", model: "Lear 45XR", category: "midsize_jet" },
  { csvColumn: "Challenger 300", manufacturer: "Bombardier", model: "Challenger 300", category: "super_midsize_jet" },
  { csvColumn: "Challenger 350", manufacturer: "Bombardier", model: "Challenger 350", category: "super_midsize_jet" },
  { csvColumn: "Challenger 604", manufacturer: "Bombardier", model: "Challenger 604", category: "large_cabin_jet" },
  { csvColumn: "Challenger 605", manufacturer: "Bombardier", model: "Challenger 605", category: "large_cabin_jet" },
  { csvColumn: "G450", manufacturer: "Gulfstream", model: "G450", category: "ultra_long_range_jet" },
  { csvColumn: "GIVSP", manufacturer: "Gulfstream", model: "GIV-SP", category: "ultra_long_range_jet" },
  { csvColumn: "G650ER", manufacturer: "Gulfstream", model: "G650ER", category: "ultra_long_range_jet" },
  { csvColumn: "Falcon 2000", manufacturer: "Dassault", model: "Falcon 2000", category: "large_cabin_jet" },
  { csvColumn: "Hawker 800XP", manufacturer: "Hawker", model: "800XP", category: "midsize_jet" },
  { csvColumn: "Citation XLS +", manufacturer: "Cessna", model: "Citation XLS+", category: "midsize_jet" },
  { csvColumn: "Phenom 300", manufacturer: "Embraer", model: "Phenom 300", category: "light_jet" },
  { csvColumn: "Falcon 900LX", manufacturer: "Dassault", model: "Falcon 900LX", category: "large_cabin_jet" },
  { csvColumn: "Challenger 850", manufacturer: "Bombardier", model: "Challenger 850", category: "large_cabin_jet" },
  { csvColumn: "G150", manufacturer: "Gulfstream", model: "G150", category: "midsize_jet" },
  { csvColumn: "G550", manufacturer: "Gulfstream", model: "G550", category: "ultra_long_range_jet" },
  { csvColumn: "Global 5000", manufacturer: "Bombardier", model: "Global 5000", category: "ultra_long_range_jet" },
  { csvColumn: "CJ1", manufacturer: "Cessna", model: "CJ1", category: "light_jet" },
  { csvColumn: "CJ3", manufacturer: "Cessna", model: "CJ3", category: "light_jet" },
  { csvColumn: "CJ4", manufacturer: "Cessna", model: "CJ4", category: "light_jet" },
  { csvColumn: "Premier Y1 (2 Pilots)", manufacturer: "Beechcraft", model: "Premier I", category: "light_jet" },
  { csvColumn: "Premier Y2 (2 Pilots)", manufacturer: "Beechcraft", model: "Premier II", category: "light_jet" },
  { csvColumn: "Citation Sovereign+", manufacturer: "Cessna", model: "Citation Sovereign+", category: "super_midsize_jet" },
  { csvColumn: "Citation X+", manufacturer: "Cessna", model: "Citation X+", category: "super_midsize_jet" },
  { csvColumn: "Phenom 300E", manufacturer: "Embraer", model: "Phenom 300E", category: "light_jet" },
  { csvColumn: "Lear 75", manufacturer: "Bombardier", model: "Lear 75", category: "midsize_jet" },
  { csvColumn: "Lear 60XR", manufacturer: "Bombardier", model: "Lear 60XR", category: "midsize_jet" },
];

export type ScenarioTemplateSpec = {
  name: string;
  masterColumn: string;
  assumptions: Record<string, string>;
};

export const SCENARIO_TEMPLATES: ScenarioTemplateSpec[] = [
  { name: "VNY Challenger 300", masterColumn: "Challenger 300", assumptions: { proposed_home_base: "VNY" } },
  {
    name: "Premier Y1 (3 Pilots)",
    masterColumn: "Premier Y1 (2 Pilots)",
    assumptions: { pic_count: "1", sic_count: "2" },
  },
  {
    name: "Premier Y2 (3 Pilots)",
    masterColumn: "Premier Y2 (2 Pilots)",
    assumptions: { pic_count: "1", sic_count: "2" },
  },
  {
    name: "Single Owner Challenger 300 (75h)",
    masterColumn: "Challenger 300",
    assumptions: { owner_annual_hours: "75" },
  },
  {
    name: "Dual Owner Challenger 300 (75h)",
    masterColumn: "Challenger 300",
    assumptions: { owner_annual_hours: "75", ownership_percent: "50" },
  },
  { name: "Daxair", masterColumn: "CJ3", assumptions: { operator_notes: "Daxair" } },
  { name: "CJ3 Lease", masterColumn: "CJ3", assumptions: { management_fee: "0", financing_enabled: "yes" } },
  {
    name: "Floating Challenger 300",
    masterColumn: "Challenger 300",
    assumptions: { crew_model: "floating" },
  },
  {
    name: "Floating Citation XLS",
    masterColumn: "Citation XLS +",
    assumptions: { crew_model: "floating" },
  },
  {
    name: "Floating Lear 45XR",
    masterColumn: "Lear 45XR",
    assumptions: { crew_model: "floating" },
  },
];

export type HangarProviderSpec = {
  csvRow: string;
  airportIcao: string;
  fboName: string;
  pricingMethod: "quoted" | "sqft_rate" | "category_estimate";
  skipImport?: boolean;
};

export const HANGAR_PROVIDERS: HangarProviderSpec[] = [
  { csvRow: "PrismJet", airportIcao: "KSDL", fboName: "PrismJet", pricingMethod: "sqft_rate" },
  { csvRow: "AeroCenters (GEG)", airportIcao: "KGEG", fboName: "AeroCenters", pricingMethod: "quoted" },
  { csvRow: "jetCenters of CO (APA)", airportIcao: "KAPA", fboName: "jetCenters of Colorado", pricingMethod: "quoted" },
  { csvRow: "Sky Harbour (APA)", airportIcao: "KAPA", fboName: "Sky Harbour", pricingMethod: "quoted" },
  { csvRow: "Signature (BJC)", airportIcao: "KBJC", fboName: "Signature", pricingMethod: "quoted" },
  { csvRow: "Sheltair (BJC)", airportIcao: "KBJC", fboName: "Sheltair", pricingMethod: "quoted" },
  { csvRow: "Sky Harbour (APA Private)", airportIcao: "KAPA", fboName: "Sky Harbour Private", pricingMethod: "quoted" },
  { csvRow: "Average for CO", airportIcao: "KAPA", fboName: "", pricingMethod: "quoted", skipImport: true },
  { csvRow: "TBD", airportIcao: "KSDL", fboName: "PrismJet Estimate", pricingMethod: "sqft_rate" },
  { csvRow: "(SNA)", airportIcao: "KSNA", fboName: "SNA FBO", pricingMethod: "quoted" },
  { csvRow: "Castle and Cooke", airportIcao: "KSNA", fboName: "Castle and Cooke", pricingMethod: "quoted" },
];

export const OPERATING_COST_ROWS: Record<string, string> = {
  "In-flight Wi-Fi": "wifi_annual",
  Subscriptions: "subscriptions_annual",
  "Aircraft Cleaning": "cleaning_annual",
  Supplies: "supplies_annual",
  "Maintenance Management Fee": "maintenance_management_fee",
  "Aircraft Management Fee ": "management_fee",
  "Aircraft Management Fee": "management_fee",
};

export const PROGRAM_ROWS: Record<string, "parts" | "engine" | "apu" | "other"> = {
  "Parts Programs": "parts",
  "Engine Programs": "engine",
  "APU Programs": "apu",
  "Inspection Reserve": "other",
  "Trip Expenses": "other",
};

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
  hangarRows: Record<string, string>[];
};

export function parseMoney(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const cleaned = value.replace(/[$,\s]/g, "").trim();
  if (!cleaned || cleaned.toUpperCase() === "TBD") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const n = parseFloat(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Parse simple CSV with quoted fields. */
export function parseCsvLines(content: string): string[][] {
  const lines = content.split(/\r?\n/);
  const result: string[][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    fields.push(current.trim());
    result.push(fields);
  }
  return result;
}

export function parseAircraftCsv(content: string): ParsedCsv {
  const lines = parseCsvLines(content);
  const headerLine = lines[0];
  const headers = headerLine.slice(1).map((h) => h.trim());

  const dataRows: Record<string, string>[] = [];
  const hangarRows: Record<string, string>[] = [];
  let inHangar = false;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const label = row[0]?.trim() ?? "";
    if (!label) continue;
    if (label === "Annual Hangar Rates") {
      inHangar = true;
      continue;
    }
    const record: Record<string, string> = { _label: label };
    for (let c = 0; c < headers.length; c++) {
      record[headers[c]] = row[c + 1]?.trim() ?? "";
    }
    if (inHangar) hangarRows.push(record);
    else dataRows.push(record);
  }

  return { headers, rows: dataRows, hangarRows };
}

export function getRowValue(rows: Record<string, string>[], label: string): Record<string, string> | undefined {
  return rows.find((r) => r._label === label || r._label?.trim() === label.trim());
}

export function readAircraftCsvFile(filePath?: string): ParsedCsv {
  const resolved =
    filePath ?? path.join(process.cwd(), "data", "seeds", "aircraft-master-proforma.csv");
  const content = readFileSync(resolved, "utf-8");
  return parseAircraftCsv(content);
}

export function columnIndex(headers: string[], column: string): number {
  return headers.indexOf(column);
}

export function buildMasterColumnMap(headers: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const spec of CANONICAL_AIRCRAFT) {
    if (headers.includes(spec.csvColumn)) {
      map.set(`${spec.manufacturer}|${spec.model}`, spec.csvColumn);
    }
  }
  return map;
}
