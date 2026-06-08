import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | null | undefined,
  options?: { compact?: boolean }
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: options?.compact ? "compact" : "standard",
  }).format(value);
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function toNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Strip comma separators from a formatted numeric input string. */
export function parseFormattedNumber(value: string): string {
  return value.replace(/,/g, "").trim();
}

/** Comma-separated display for currency / large number inputs. */
export function formatFormattedNumber(
  value: string | number | undefined | null,
  options?: { maxDecimals?: number }
): string {
  if (value == null || value === "") return "";
  const raw =
    typeof value === "number" ? String(value) : parseFormattedNumber(String(value));
  if (!raw) return "";
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return String(value);
  const maxDecimals =
    options?.maxDecimals ?? (raw.includes(".") ? Math.min(2, raw.split(".")[1]?.length ?? 0) : 0);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  }).format(n);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function generatePortalSlug(prospectName: string): string {
  const base = slugify(prospectName) || "proposal";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export function generatePin(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}
