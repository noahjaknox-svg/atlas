"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CrewOrgPolicySection } from "@/components/internal/data-hub/crew-org-policy-section";
import { DATA_HUB_SIDEBAR_CLASS } from "@/components/internal/data-hub/sidebar-class";
import { replaceDataHubUrl } from "@/lib/data-hub-filters";
import { cn } from "@/lib/utils";

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
  { key: "charterBlockToFlightRatio", label: "Block-to-Flight Factor", hint: "e.g. 1.13" },
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

const GENERAL_SECTIONS = [
  {
    id: "core",
    label: "Core fees & fuel",
    description: "Fuel, management fees, and charter payback used by every pro forma.",
    fields: CORE_COMPANY_FIELDS,
  },
  {
    id: "financing",
    label: "Financing template",
    description: "Starting financing terms for new proposal workspaces.",
    fields: FINANCING_TEMPLATE_FIELDS,
  },
  { id: "crew-policy", label: "Crew org policy", description: null, fields: null },
] as const;

type GeneralSectionId = (typeof GENERAL_SECTIONS)[number]["id"];

export function CompanySettingsTab() {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("section");
  const [sectionId, setSectionId] = useState<GeneralSectionId>(
    GENERAL_SECTIONS.find((s) => s.id === fromUrl)?.id ?? "core"
  );
  const section = GENERAL_SECTIONS.find((s) => s.id === sectionId) ?? GENERAL_SECTIONS[0];
  const { values, setValues, loading, saving, message, save } =
    useCompanySettingsFields(ALL_GENERAL_FIELD_KEYS);

  function selectSection(id: GeneralSectionId) {
    setSectionId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "general");
    params.set("section", id);
    replaceDataHubUrl(params);
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className={DATA_HUB_SIDEBAR_CLASS}>
        <div className="shrink-0 border-b border-atlas-border px-4 py-3">
          <p className="text-xs leading-relaxed text-atlas-muted">
            Defaults copied into each proposal workspace on aircraft add and manual refresh.
            Published portals change only when staff republish.
          </p>
        </div>
        <nav className="atlas-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-3" aria-label="General and Company sections">
          {GENERAL_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSection(s.id)}
              aria-current={s.id === sectionId ? "page" : undefined}
              className={cn(
                "flex w-full items-center rounded px-3 py-2 text-left text-sm transition-colors",
                s.id === sectionId
                  ? "bg-atlas-accent/15 font-medium text-atlas-accent"
                  : "text-atlas-text/75 hover:bg-atlas-border/30 hover:text-atlas-text"
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-atlas-border px-4 py-3">
          <h2 className="truncate font-serif text-lg font-medium sm:text-xl">{section.label}</h2>
          {section.description ? (
            <p className="mt-0.5 text-sm text-atlas-muted">{section.description}</p>
          ) : null}
        </header>
        <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto p-4">
          {section.fields === null ? (
            <div className="max-w-3xl">
              <CrewOrgPolicySection />
            </div>
          ) : loading ? (
            <p className="text-sm text-atlas-muted">Loading…</p>
          ) : (
            <div className="max-w-xl space-y-6">
              <CompanySettingsFieldGrid
                fields={section.fields}
                values={values}
                onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
              />
              <div className="flex items-center gap-3">
                <Button onClick={() => void save(values)} disabled={saving}>
                  {saving ? "Saving…" : "Save settings"}
                </Button>
                {message ? <span className="text-sm text-atlas-muted">{message}</span> : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
