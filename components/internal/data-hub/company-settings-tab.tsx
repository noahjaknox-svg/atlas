"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Settings = {
  usAverageFuelCost: number;
  annualManagementFee: number;
  annualMaintenanceManagementFee: number;
  charterPaybackPercent: number;
  crewBenefitsPercent: number;
  fuelTaxRefund: number;
};

const FIELDS: { key: keyof Settings; label: string; hint?: string }[] = [
  { key: "usAverageFuelCost", label: "US Average Fuel Cost ($/gal)" },
  { key: "annualManagementFee", label: "Annual Management Fee ($)" },
  { key: "annualMaintenanceManagementFee", label: "Annual Maintenance Mgmt Fee ($)" },
  { key: "charterPaybackPercent", label: "Charter Payback (%)", hint: "e.g. 82.5" },
  { key: "crewBenefitsPercent", label: "Crew Benefits (fraction)", hint: "e.g. 0.16" },
  { key: "fuelTaxRefund", label: "Fuel Tax Refund ($/gal)", hint: "e.g. 0.175" },
];

export function CompanySettingsTab() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/data/company-settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        if (!active) return;
        const next: Record<string, string> = {};
        for (const f of FIELDS) next[f.key] = String(data[f.key] ?? "");
        setValues(next);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const body: Record<string, number> = {};
      for (const f of FIELDS) {
        const v = values[f.key];
        if (v !== "" && v != null) body[f.key] = Number(v);
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

  if (loading) return <p className="text-sm text-atlas-muted">Loading…</p>;

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-atlas-muted">
        Global defaults applied to every proposal pro forma.
      </p>
      <div className="grid gap-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              type="number"
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.hint}
              className="mt-1"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
        {message && <span className="text-sm text-atlas-muted">{message}</span>}
      </div>
    </div>
  );
}
