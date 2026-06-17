import { readFileSync } from "fs";
import {
  normalizeAirportCode,
  resolveIcaoFromRow,
} from "@/lib/ourairports/normalize-code";

export { normalizeAirportCode, resolveIcaoFromRow };

/** RFC 4180-style parser (handles quoted fields with embedded newlines). */
export function parseCsvRecords(content: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" || (ch === "\r" && next === "\n")) {
      if (ch === "\r") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0)) records.push(row);
      row = [];
      continue;
    }
    if (ch !== "\r") field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) records.push(row);
  }

  return records;
}

export function readOurAirportsCsv(path: string): Record<string, string>[] {
  const content = readFileSync(path, "utf8");
  const lines = parseCsvRecords(content);
  if (lines.length < 2) return [];

  const headers = lines[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i];
    if (fields.length === 0) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (fields[j] ?? "").trim();
    }
    rows.push(row);
  }

  return rows;
}

export function parseIntOrNull(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export function parseFloatOrNull(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function parseBool01(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "yes" || value?.toLowerCase() === "true";
}

export const OURAIRPORTS_DATA_BASE =
  "https://davidmegginson.github.io/ourairports-data";

export const OURAIRPORTS_FILES = [
  "countries.csv",
  "regions.csv",
  "airports.csv",
  "runways.csv",
  "airport-frequencies.csv",
] as const;
