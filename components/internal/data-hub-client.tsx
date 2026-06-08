"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CrudTab } from "@/components/internal/data-hub/crud-tab";
import { filtersForTab } from "@/components/internal/data-hub/filter-configs";
import {
  AIRCRAFT_CATEGORIES,
  CREW_ROLES,
  DATA_CONFIDENCE,
  HANGAR_PRICING,
  OPERATING_COST_KEYS,
  PROGRAM_TYPES,
  TRAINING_TYPES,
} from "@/components/internal/data-hub/field-options";
import { clearDataHubFilters } from "@/lib/data-hub-filters";
import {
  DataHubFilterSidebar,
  DataHubSearchBar,
} from "@/components/internal/data-hub/filter-bar";

const TABS = [
  { id: "airports", label: "Airports & FBOs" },
  { id: "fuel", label: "Fuel Prices" },
  { id: "aircraft", label: "Aircraft Performance" },
  { id: "operating", label: "Operating Defaults" },
  { id: "crew", label: "Crew Salaries" },
  { id: "programs", label: "Maintenance Programs" },
  { id: "training", label: "Training Costs" },
  { id: "insurance", label: "Insurance" },
  { id: "hangar", label: "Hangar Rates" },
  { id: "taxes", label: "State Taxes" },
  { id: "charter", label: "Charter Rates" },
  { id: "scenarios", label: "Scenario Templates" },
] as const;

export function DataHubClient({ initialTab }: { initialTab: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? initialTab;
  const [fuelIndex, setFuelIndex] = useState<{ pricePerGallon: number; effectiveDate: string } | null>(null);
  const [syncMsg, setSyncMsg] = useState("");
  const [importMsg, setImportMsg] = useState("");

  const setTab = useCallback(
    (id: string) => {
      router.replace(`/data?${clearDataHubFilters(id).toString()}`);
    },
    [router]
  );

  useEffect(() => {
    if (tab === "fuel") {
      fetch("/api/data/fuel-index").then((r) => r.json()).then(setFuelIndex);
    }
  }, [tab]);

  async function syncFuel() {
    const res = await fetch("/api/data/fuel/sync", { method: "POST" });
    const json = await res.json();
    setSyncMsg(json.message ?? "Sync complete");
  }

  async function importCsv() {
    if (!confirm("Re-import aircraft data from CSV? This upserts reference records.")) return;
    setImportMsg("Importing…");
    const res = await fetch("/api/data/import-aircraft-csv", { method: "POST" });
    const json = await res.json();
    setImportMsg(res.ok ? (json.message ?? "Import complete") : (json.error ?? "Import failed"));
  }

  const sidebarFilters = filtersForTab(tab);
  const singleTableTab = tab !== "airports" && tab !== "fuel";

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-atlas-border bg-atlas-surface/20">
        <nav className="space-y-0.5 p-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`block w-full rounded px-3 py-2 text-left text-sm ${
                tab === t.id
                  ? "bg-atlas-accent/15 text-atlas-accent"
                  : "text-atlas-muted hover:bg-atlas-border/30"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="space-y-3 border-t border-atlas-border px-3 py-3">
          <DataHubSearchBar tab={tab} />
          <DataHubFilterSidebar tab={tab} fields={sidebarFilters} />
        </div>

        <div className="mt-auto border-t border-atlas-border p-3">
            <Button variant="secondary" className="w-full text-xs" onClick={() => void importCsv()}>
              Import CSV
            </Button>
            {importMsg && <p className="mt-2 text-xs text-atlas-muted">{importMsg}</p>}
          </div>
        </aside>

        <div
          className={`min-w-0 flex-1 p-4 ${
            singleTableTab ? "flex min-h-0 flex-col overflow-hidden" : "overflow-y-auto"
          }`}
        >
        {tab === "airports" && (
          <div className="space-y-8">
            <CrudTab
              title="Airports"
              apiPath="/api/data/airports"
              columns={[
                { key: "icao", label: "ICAO" },
                { key: "airportName", label: "Name" },
                { key: "city", label: "City" },
                { key: "state", label: "State" },
                { key: "fboCount", label: "FBOs" },
              ]}
              fields={[
                { key: "icao", label: "ICAO", required: true },
                { key: "airportName", label: "Airport name", required: true },
                { key: "city", label: "City" },
                { key: "state", label: "State" },
                { key: "country", label: "Country" },
                { key: "iata", label: "IATA" },
              ]}
            />
            <CrudTab
              title="FBO Locations"
              apiPath="/api/data/fbos"
              columns={[
                { key: "airportIcao", label: "Airport" },
                { key: "fboName", label: "FBO" },
                { key: "jetARetailPrice", label: "Jet-A retail" },
                { key: "jetAContractPrice", label: "Jet-A contract" },
              ]}
              fields={[
                { key: "airportId", label: "Airport ID (UUID)", required: true },
                { key: "fboName", label: "FBO name", required: true },
                { key: "jetARetailPrice", label: "Jet-A retail ($/gal)", type: "number" },
                { key: "jetAContractPrice", label: "Jet-A contract ($/gal)", type: "number" },
                { key: "phone", label: "Phone" },
                { key: "website", label: "Website" },
              ]}
            />
          </div>
        )}

        {tab === "fuel" && (
          <div>
            <div className="mb-4 rounded-lg border border-atlas-border bg-atlas-surface p-4">
              <p className="text-sm text-atlas-muted">EIA Jet-A reference index</p>
              <p className="mt-1 font-mono text-xl text-atlas-accent">
                {fuelIndex
                  ? `$${fuelIndex.pricePerGallon.toFixed(2)}/gal — ${fuelIndex.effectiveDate}`
                  : "Not loaded — set EIA_API_KEY and refresh"}
              </p>
            </div>
            <p className="mb-4 text-sm text-atlas-muted">
              Edit per-FBO fuel prices in Airports &amp; FBOs → FBO Locations.
            </p>
            <Button onClick={() => void syncFuel()}>Sync FBO fuel prices (stub)</Button>
            {syncMsg && <p className="mt-2 text-sm text-atlas-muted">{syncMsg}</p>}
          </div>
        )}

        {tab === "aircraft" && (
          <CrudTab
            title="Aircraft master"
            apiPath="/api/data/aircraft-master"
            fillHeight
            columns={[
              { key: "manufacturer", label: "Manufacturer" },
              { key: "model", label: "Model" },
              { key: "aircraftCategory", label: "Category" },
              { key: "typicalFuelBurnGph", label: "Fuel burn GPH" },
              { key: "cabinSqft", label: "Sqft" },
              { key: "typicalHullValue", label: "Hull value" },
            ]}
            fields={[
              { key: "manufacturer", label: "Manufacturer", required: true },
              { key: "model", label: "Model", required: true },
              {
                key: "aircraftCategory",
                label: "Category",
                type: "select",
                options: AIRCRAFT_CATEGORIES,
                required: true,
              },
              { key: "typicalFuelBurnGph", label: "Fuel burn GPH", type: "number" },
              { key: "typicalCharterRate", label: "Charter rate", type: "number" },
              { key: "maxRecommendedUtilization", label: "Max utilization (hrs)", type: "number" },
              { key: "cabinSqft", label: "Cabin sqft", type: "number" },
              { key: "typicalHullValue", label: "Typical hull value", type: "number" },
              { key: "typicalCrewRequired", label: "Crew required", type: "number" },
              {
                key: "dataConfidence",
                label: "Confidence",
                type: "select",
                options: DATA_CONFIDENCE,
              },
            ]}
          />
        )}

        {tab === "operating" && (
          <CrudTab
            title="Operating defaults"
            apiPath="/api/data/operating-defaults"
            fillHeight
            columns={[
              { key: "aircraft", label: "Aircraft" },
              { key: "costKey", label: "Cost key" },
              { key: "annualAmount", label: "Annual amount" },
              { key: "effectiveDate", label: "Effective" },
            ]}
            fields={[
              { key: "aircraftMasterId", label: "Aircraft master ID", required: true },
              {
                key: "costKey",
                label: "Cost key",
                type: "select",
                options: OPERATING_COST_KEYS,
                required: true,
              },
              { key: "annualAmount", label: "Annual amount", type: "number", required: true },
              { key: "effectiveDate", label: "Effective date (YYYY-MM-DD)" },
              { key: "source", label: "Source" },
            ]}
          />
        )}

        {tab === "crew" && (
          <CrudTab
            title="Crew rates"
            apiPath="/api/data/crew-rates"
            fillHeight
            columns={[
              { key: "aircraft", label: "Aircraft" },
              { key: "role", label: "Role" },
              { key: "salaryBase", label: "Salary" },
              { key: "benefitsPercent", label: "Benefits %" },
            ]}
            fields={[
              { key: "aircraftMasterId", label: "Aircraft master ID", required: true },
              { key: "role", label: "Role", type: "select", options: CREW_ROLES, required: true },
              { key: "salaryBase", label: "Salary base", type: "number" },
              { key: "benefitsPercent", label: "Benefits %", type: "number" },
              { key: "effectiveDate", label: "Effective date" },
            ]}
          />
        )}

        {tab === "programs" && (
          <CrudTab
            title="Program costs"
            apiPath="/api/data/program-costs"
            fillHeight
            columns={[
              { key: "aircraft", label: "Aircraft" },
              { key: "programType", label: "Type" },
              { key: "provider", label: "Provider" },
              { key: "hourlyRate", label: "Hourly rate" },
            ]}
            fields={[
              { key: "aircraftMasterId", label: "Aircraft master ID", required: true },
              {
                key: "programType",
                label: "Program type",
                type: "select",
                options: PROGRAM_TYPES,
                required: true,
              },
              { key: "provider", label: "Provider" },
              { key: "hourlyRate", label: "Hourly rate", type: "number" },
              { key: "effectiveDate", label: "Effective date" },
            ]}
          />
        )}

        {tab === "training" && (
          <CrudTab
            title="Training costs"
            apiPath="/api/data/training-costs"
            fillHeight
            columns={[
              { key: "aircraft", label: "Aircraft" },
              { key: "role", label: "Role" },
              { key: "trainingType", label: "Type" },
              { key: "annualCost", label: "Annual cost" },
            ]}
            fields={[
              { key: "aircraftMasterId", label: "Aircraft master ID", required: true },
              { key: "role", label: "Role", type: "select", options: CREW_ROLES, required: true },
              {
                key: "trainingType",
                label: "Training type",
                type: "select",
                options: TRAINING_TYPES,
              },
              { key: "annualCost", label: "Annual cost", type: "number" },
              { key: "provider", label: "Provider" },
              { key: "effectiveDate", label: "Effective date" },
            ]}
          />
        )}

        {tab === "insurance" && (
          <CrudTab
            title="Insurance assumptions"
            apiPath="/api/data/insurance-assumptions"
            fillHeight
            columns={[
              { key: "aircraft", label: "Aircraft" },
              { key: "state", label: "State" },
              { key: "annualPremiumEstimate", label: "Annual premium" },
            ]}
            fields={[
              { key: "aircraftMasterId", label: "Aircraft master ID", required: true },
              { key: "state", label: "State" },
              { key: "annualPremiumEstimate", label: "Annual premium", type: "number" },
              { key: "effectiveDate", label: "Effective date" },
            ]}
          />
        )}

        {tab === "hangar" && (
          <CrudTab
            title="Hangar costs"
            apiPath="/api/data/hangar-costs"
            fillHeight
            columns={[
              { key: "airportIcao", label: "Airport" },
              { key: "aircraft", label: "Aircraft" },
              { key: "fboName", label: "FBO" },
              { key: "quotedAnnual", label: "Quoted annual" },
              { key: "ratePerSqftAnnual", label: "$/sqft/yr" },
            ]}
            fields={[
              { key: "airportId", label: "Airport ID", required: true },
              {
                key: "aircraftCategory",
                label: "Category",
                type: "select",
                options: AIRCRAFT_CATEGORIES,
                required: true,
              },
              { key: "aircraftMasterId", label: "Aircraft master ID" },
              { key: "fboLocationId", label: "FBO location ID" },
              { key: "provider", label: "Provider" },
              {
                key: "pricingMethod",
                label: "Pricing method",
                type: "select",
                options: HANGAR_PRICING,
              },
              { key: "quotedAnnual", label: "Quoted annual", type: "number" },
              { key: "ratePerSqftAnnual", label: "Rate per sqft (annual)", type: "number" },
              { key: "monthlyCostBase", label: "Monthly base", type: "number" },
              { key: "effectiveDate", label: "Effective date" },
            ]}
          />
        )}

        {tab === "taxes" && (
          <CrudTab
            title="State cost factors"
            apiPath="/api/data/state-cost-factors"
            fillHeight
            columns={[
              { key: "state", label: "State" },
              { key: "registrationTaxRatePct", label: "Registration tax %" },
              { key: "jetFuelTaxDifferentialPerGal", label: "Jet fuel tax $/gal" },
            ]}
            fields={[
              { key: "state", label: "State (2-letter)", required: true },
              { key: "registrationTaxRatePct", label: "Registration tax %", type: "number" },
              { key: "jetFuelTaxDifferentialPerGal", label: "Jet fuel tax $/gal", type: "number" },
              { key: "registrationNotes", label: "Registration notes", type: "textarea" },
              { key: "taxNotes", label: "Tax notes", type: "textarea" },
            ]}
          />
        )}

        {tab === "charter" && (
          <CrudTab
            title="Charter market rates"
            apiPath="/api/data/charter-rates"
            fillHeight
            columns={[
              { key: "aircraft", label: "Aircraft" },
              { key: "airportIcao", label: "Airport" },
              { key: "retailRateBase", label: "Retail rate" },
              { key: "fuelSurcharge", label: "Fuel surcharge" },
              { key: "ownerPaybackPercent", label: "Payback %" },
            ]}
            fields={[
              { key: "aircraftMasterId", label: "Aircraft master ID", required: true },
              { key: "airportId", label: "Airport ID (optional)" },
              { key: "retailRateBase", label: "Retail rate base", type: "number" },
              { key: "fuelSurcharge", label: "Fuel surcharge", type: "number" },
              { key: "ownerPaybackPercent", label: "Owner payback %", type: "number" },
              { key: "effectiveDate", label: "Effective date" },
            ]}
          />
        )}

        {tab === "scenarios" && (
          <CrudTab
            title="Scenario templates"
            apiPath="/api/data/scenario-templates"
            fillHeight
            columns={[
              { key: "name", label: "Name" },
              { key: "aircraft", label: "Aircraft" },
              {
                key: "assumptions",
                label: "Overrides",
                render: (row) => {
                  const a = row.assumptions as Array<{ assumptionKey: string; value: string }> | undefined;
                  return a?.map((x) => `${x.assumptionKey}=${x.value}`).join(", ") ?? "";
                },
              },
            ]}
            fields={[
              { key: "name", label: "Template name", required: true },
              { key: "aircraftMasterId", label: "Aircraft master ID", required: true },
              { key: "description", label: "Description", type: "textarea" },
            ]}
          />
        )}
      </div>
    </div>
  );
}
