import type { FormField } from "@/components/internal/data-hub/entity-dialog";

export function validateEntityField(field: FormField, value: string): string | null {
  const v = value.trim();
  if (field.required && !v) return `${field.label} is required.`;

  if (!v) return null;

  if (field.key === "icao" || field.label.toLowerCase().includes("icao")) {
    if (!/^[A-Za-z0-9]{3,4}$/.test(v)) {
      return "ICAO must be 3–4 letters or digits.";
    }
  }

  if (field.key === "state" && field.label.toLowerCase().includes("2-letter")) {
    if (!/^[A-Za-z]{2}$/.test(v)) return "Use a 2-letter state code.";
  }

  if (field.type === "date" || field.key === "effectiveDate") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return "Use YYYY-MM-DD format.";
    }
    const d = new Date(`${v}T12:00:00`);
    if (Number.isNaN(d.getTime())) return "Enter a valid date.";
  }

  if (field.type === "number") {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return "Enter a valid number.";
    if (field.key.includes("Percent") || field.label.includes("%")) {
      if (n < 0 || n > 100) return "Must be between 0 and 100.";
    } else if (
      n < 0 &&
      field.key !== "jetFuelTaxDifferentialPerGal" &&
      !field.label.toLowerCase().includes("differential")
    ) {
      return "Must be zero or positive.";
    }
  }

  return null;
}

export function validateEntityFields(
  fields: FormField[],
  values: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const err = validateEntityField(f, values[f.key] ?? "");
    if (err) errors[f.key] = err;
  }
  return errors;
}
