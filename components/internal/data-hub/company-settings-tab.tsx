"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CompanySettingsFieldDef = {
  key: string;
  label: string;
  hint?: string;
};

const STRING_KEYS = new Set(["defaultInsuranceMode"]);

export function CompanySettingsFieldGrid({
  fields,
  values,
  onChange,
}: {
  fields: readonly CompanySettingsFieldDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {fields.map((f) => (
        <div key={f.key}>
          <Label htmlFor={f.key}>{f.label}</Label>
          <Input
            id={f.key}
            type="text"
            value={values[f.key] ?? ""}
            onChange={(e) => onChange(f.key, e.target.value)}
            placeholder={f.hint}
            className="mt-1"
          />
        </div>
      ))}
    </div>
  );
}

export function useCompanySettingsFields(fieldKeys: readonly string[]) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/data/company-settings")
      .then((r) => r.json())
      .then((data: Record<string, string | number | null>) => {
        if (!active) return;
        const next: Record<string, string> = {};
        for (const key of fieldKeys) {
          const v = data[key];
          next[key] = v == null ? "" : String(v);
        }
        setValues(next);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [fieldKeys.join("\0")]);

  async function save(allValues: Record<string, string>) {
    setSaving(true);
    setMessage("");
    try {
      const body: Record<string, string | number> = {};
      for (const key of fieldKeys) {
        const v = allValues[key];
        if (v !== "" && v != null) {
          if (STRING_KEYS.has(key)) {
            body[key] = v;
          } else {
            const num = Number(v);
            if (Number.isFinite(num)) body[key] = num;
          }
        }
      }
      const res = await fetch("/api/data/company-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setMessage(res.ok ? "Saved." : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return { values, setValues, loading, saving, message, save };
}

export const CORE_COMPANY_FIELDS = [
  { key: "usAverageFuelCost", label: "US Average Fuel Cost ($/gal)" },
  { key: "annualManagementFee", label: "Annual Management Fee ($)" },
  { key: "annualMaintenanceManagementFee", label: "Annual Maintenance Mgmt Fee ($)" },
  { key: "charterPaybackPercent", label: "Charter Payback (%)", hint: "e.g. 82.5" },
  { key: "crewBenefitsPercent", label: "Crew Benefits (fraction)", hint: "e.g. 0.16" },
  { key: "fuelTaxRefund", label: "FET fuel tax refund ($/gal)", hint: "e.g. 0.175" },
] as const satisfies readonly CompanySettingsFieldDef[];

export const FINANCING_TEMPLATE_FIELDS = [
  { key: "defaultDownPaymentPercent", label: "Default down payment (%)", hint: "e.g. 20" },
  { key: "defaultInterestRate", label: "Default interest rate (%)", hint: "e.g. 6.5" },
  { key: "defaultTermMonths", label: "Default term (months)", hint: "e.g. 120" },
  { key: "defaultBalloonPayment", label: "Default balloon payment ($)" },
] as const satisfies readonly CompanySettingsFieldDef[];

export const INSURANCE_FIELDS = [
  { key: "defaultInsuranceMode", label: "Default insurance mode", hint: "fixed or percent" },
  { key: "defaultInsuranceAnnual", label: "Default insurance annual ($)" },
  { key: "defaultInsurancePremiumPercent", label: "Default insurance premium (% of hull)" },
] as const satisfies readonly CompanySettingsFieldDef[];

export const REGISTRATION_TAX_FIELDS = [
  {
    key: "defaultRegistrationTaxRate",
    label: "Default registration tax rate (% of hull value)",
  },
] as const satisfies readonly CompanySettingsFieldDef[];

const ALL_GENERAL_FIELD_KEYS = [
  ...CORE_COMPANY_FIELDS.map((f) => f.key),
  ...FINANCING_TEMPLATE_FIELDS.map((f) => f.key),
];

export function CompanySettingsSectionTab({
  title,
  description,
  fields,
}: {
  title: string;
  description?: string;
  fields: readonly CompanySettingsFieldDef[];
}) {
  const fieldKeys = fields.map((f) => f.key);
  const { values, setValues, loading, saving, message, save } =
    useCompanySettingsFields(fieldKeys);

  if (loading) return <p className="text-sm text-atlas-muted">Loading…</p>;

  return (
    <div className="max-w-xl space-y-6">
      {description ? <p className="text-sm text-atlas-muted">{description}</p> : null}
      <section>
        <h3 className="mb-2 text-sm font-medium text-atlas-text">{title}</h3>
        <CompanySettingsFieldGrid
          fields={fields}
          values={values}
          onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        />
      </section>
      <div className="flex items-center gap-3">
        <Button onClick={() => void save(values)} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
        {message ? <span className="text-sm text-atlas-muted">{message}</span> : null}
      </div>
    </div>
  );
}

export function CompanySettingsTab() {
  const { values, setValues, loading, saving, message, save } =
    useCompanySettingsFields(ALL_GENERAL_FIELD_KEYS);

  if (loading) return <p className="text-sm text-atlas-muted">Loading…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-atlas-muted">
        Data Warehouse defaults — copied into each proposal workspace on aircraft add and manual
        refresh. Changes here do not alter published client portals until staff republish affected
        proposals.
      </p>
      <section>
        <h3 className="mb-2 text-sm font-medium text-atlas-text">Core fees & fuel</h3>
        <CompanySettingsFieldGrid
          fields={CORE_COMPANY_FIELDS}
          values={values}
          onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        />
      </section>
      <section>
        <h3 className="mb-2 text-sm font-medium text-atlas-text">Financing template</h3>
        <CompanySettingsFieldGrid
          fields={FINANCING_TEMPLATE_FIELDS}
          values={values}
          onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        />
      </section>
      <div className="flex items-center gap-3">
        <Button onClick={() => void save(values)} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
        {message ? <span className="text-sm text-atlas-muted">{message}</span> : null}
      </div>
    </div>
  );
}
