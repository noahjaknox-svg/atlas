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
import type { FormField } from "@/components/internal/data-hub/entity-dialog";
import { ScenarioTemplatesTab } from "@/components/internal/data-hub/scenario-templates-tab";
import { CrewDataHubPanel } from "@/components/internal/data-hub/crew-data-hub-panel";
import { CsvImportPanel } from "@/components/internal/data-hub/csv-import-panel";
import type { DataTableColumn } from "@/components/internal/data-hub/data-table";
import { formatHubLabel } from "@/lib/data-hub-labels";

type HubRow = Record<string, unknown>;

function hubLabelColumn(key: string, label: string): DataTableColumn<HubRow> {
  return {
    key,
    label,
    render: (row) => formatHubLabel(String(row[key] ?? "")),
  };
}

const EFFECTIVE_DATE_FIELD: FormField = {
  key: "effectiveDate",
  label: "Effective date",
  type: "date",
  placeholder: "YYYY-MM-DD",
};

const AIRPORT_FIELD: FormField = {
  key: "airportId",
  label: "Airport",
  type: "searchable",
  searchKind: "airport",
  displayFromRow: "airportIcao",
  required: true,
  placeholder: "Search ICAO or city…",
};

const AIRPORT_FIELD_OPTIONAL: FormField = {
  ...AIRPORT_FIELD,
  required: false,
};

const AIRCRAFT_FIELD: FormField = {
  key: "aircraftMasterId",
  label: "Aircraft",
  type: "searchable",
  searchKind: "aircraft",
  displayFromRow: "aircraft",
  required: true,
  placeholder: "Search manufacturer or model…",
};

const AIRCRAFT_FIELD_OPTIONAL: FormField = {
  ...AIRCRAFT_FIELD,
  required: false,
};

const FBO_FIELD: FormField = {
  key: "fboLocationId",
  label: "FBO",
  type: "searchable",
  searchKind: "fbo",
  searchDependsOn: "airportId",
  displayFromRow: "fboName",
  placeholder: "Search FBO name…",
};

/** Pro forma / proposal reference data — top of Data hub nav. */
const REFERENCE_TABS = [
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

/** Operational fleet + POH grids for the PrismJet Crew iOS app — pinned separately. */
const CREW_TAB = { id: "performance-data", label: "PrismJet Crew Data" } as const;

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
    setSyncMsg("Syncing…");
    const res = await fetch("/api/data/fuel/sync", { method: "POST" });
    const json = await res.json();
    setSyncMsg(json.message ?? (res.ok ? "Sync complete" : "Sync failed"));
    if (res.ok) {
      const idx = await fetch("/api/data/fuel-index");
      if (idx.ok) setFuelIndex(await idx.json());
    }
  }

  async function importCsv() {
    if (
      !confirm(
        "Re-import reference data from the bundled seed CSV (data/seeds/aircraft-master-proforma.csv)? Existing records will be upserted."
      )
    ) {
      return;
    }
    setImportMsg("Importing…");
    try {
      const res = await fetch("/api/data/import-aircraft-csv", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setImportMsg(json.message ?? "Seed CSV import complete.");
      } else {
        setImportMsg(
          typeof json.error === "string"
            ? json.error
            : "Import failed. Check server logs or run npm run db:import locally."
        );
      }
    } catch {
      setImportMsg("Import failed — could not reach the server.");
    }
  }

  const isCrewTab = tab === CREW_TAB.id;
  const sidebarFilters = filtersForTab(tab);
  const singleTableTab = tab !== "airports" && tab !== "fuel" && !isCrewTab;
  const showSidebarTools = !isCrewTab;
  const activeTab = isCrewTab
    ? CREW_TAB
    : (REFERENCE_TABS.find((t) => t.id === tab) ?? REFERENCE_TABS[0]);

  const navButtonClass = (active: boolean, pinned = false) =>
    `block w-full rounded px-3 py-2 text-left text-sm ${
      active
        ? pinned
          ? "bg-atlas-accent/20 font-medium text-atlas-accent ring-1 ring-atlas-accent/30"
          : "bg-atlas-accent/15 text-atlas-accent"
        : pinned
          ? "text-atlas-text hover:bg-atlas-border/30"
          : "text-atlas-muted hover:bg-atlas-border/30"
    }`;

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex min-h-0 w-56 shrink-0 flex-col border-r border-atlas-border bg-atlas-surface/20">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-atlas-muted/80">
            Pro forma reference
          </p>
          <nav className="space-y-0.5 px-3 pb-3">
            {REFERENCE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={navButtonClass(tab === t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {showSidebarTools ? (
            <div className="space-y-3 border-t border-atlas-border px-3 py-3">
              <DataHubSearchBar tab={tab} />
              <DataHubFilterSidebar tab={tab} fields={sidebarFilters} />
            </div>
          ) : null}

          {showSidebarTools ? (
            <div className="border-t border-atlas-border p-3 space-y-0">
              <Button variant="secondary" className="w-full text-xs" onClick={() => void importCsv()}>
                Re-import seed CSV
              </Button>
              {importMsg && (
                <p
                  className={`mt-2 text-xs ${importMsg.includes("failed") || importMsg.includes("Failed") ? "text-atlas-danger" : "text-atlas-muted"}`}
                >
                  {importMsg}
                </p>
              )}
              {tab === "aircraft" ? (
                <CsvImportPanel onImported={() => router.refresh()} />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-auto shrink-0 border-t border-atlas-accent/25 bg-atlas-surface/60 p-3">
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-atlas-accent/80">
            PrismJet Crew
          </p>
          <button
            type="button"
            onClick={() => setTab(CREW_TAB.id)}
            className={navButtonClass(isCrewTab, true)}
          >
            {CREW_TAB.label}
          </button>
        </div>
      </aside>

        <div
          className={`min-w-0 flex-1 p-4 ${
            singleTableTab ? "flex min-h-0 flex-col overflow-hidden" : "overflow-y-auto"
          }`}
        >
        <header className="mb-4 shrink-0">
          <h1 className="font-serif text-2xl">{activeTab.label}</h1>
          {!isCrewTab && (
            <p className="mt-0.5 text-sm text-atlas-muted">
              Reference data for proposals and pro forma
            </p>
          )}
          {isCrewTab && (
            <p className="mt-0.5 text-sm text-atlas-muted">
              Operational charter fleet and POH performance grids — synced to the PrismJet Crew iOS app
            </p>
          )}
        </header>
        {isCrewTab && <CrewDataHubPanel />}
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
                { key: "icao", label: "ICAO", required: true, placeholder: "e.g. KSDL" },
                { key: "airportName", label: "Airport name", required: true, placeholder: "Full airport name" },
                { key: "city", label: "City", placeholder: "City" },
                { key: "state", label: "State", placeholder: "2-letter code" },
                { key: "country", label: "Country", placeholder: "US" },
                { key: "iata", label: "IATA", placeholder: "3-letter code" },
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
                AIRPORT_FIELD,
                { key: "fboName", label: "FBO name", required: true, placeholder: "e.g. Ross Aviation" },
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
                  : "Not loaded — sync from EIA below (requires EIA_API_KEY)"}
              </p>
            </div>
            <p className="mb-4 text-sm text-atlas-muted">
              Edit per-FBO fuel prices in Airports &amp; FBOs → FBO Locations.
            </p>
            <Button onClick={() => void syncFuel()}>Sync fuel from EIA</Button>
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
              hubLabelColumn("aircraftCategory", "Category"),
              { key: "typicalFuelBurnGph", label: "Fuel burn GPH" },
              { key: "cabinSqft", label: "Sqft" },
              { key: "typicalHullValue", label: "Hull value" },
            ]}
            fields={[
              { key: "manufacturer", label: "Manufacturer", required: true, placeholder: "e.g. Bombardier" },
              { key: "model", label: "Model", required: true, placeholder: "e.g. Challenger 350" },
              {
                key: "aircraftCategory",
                label: "Category",
                type: "select",
                options: AIRCRAFT_CATEGORIES,
                required: true,
              },
              { key: "typicalFuelBurnGph", label: "Fuel burn GPH", type: "number", placeholder: "e.g. 250" },
              { key: "typicalCharterRate", label: "Charter rate", type: "number", placeholder: "USD/hr" },
              { key: "maxRecommendedUtilization", label: "Max utilization (hrs)", type: "number", placeholder: "e.g. 400" },
              { key: "cabinSqft", label: "Cabin sqft", type: "number" },
              { key: "typicalHullValue", label: "Typical hull value", type: "number" },
              { key: "typicalCrewRequired", label: "Crew required", type: "number", placeholder: "2" },
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
              hubLabelColumn("costKey", "Cost key"),
              { key: "annualAmount", label: "Annual amount" },
              { key: "effectiveDate", label: "Effective" },
            ]}
            fields={[
              AIRCRAFT_FIELD,
              {
                key: "costKey",
                label: "Cost key",
                type: "select",
                options: OPERATING_COST_KEYS,
                required: true,
              },
              { key: "annualAmount", label: "Annual amount", type: "number", required: true, placeholder: "USD" },
              EFFECTIVE_DATE_FIELD,
              { key: "source", label: "Source", placeholder: "Data source" },
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
              hubLabelColumn("role", "Role"),
              { key: "salaryBase", label: "Salary" },
              { key: "benefitsPercent", label: "Benefits %" },
            ]}
            fields={[
              AIRCRAFT_FIELD,
              { key: "role", label: "Role", type: "select", options: CREW_ROLES, required: true },
              { key: "salaryBase", label: "Salary base", type: "number", placeholder: "USD" },
              { key: "benefitsPercent", label: "Benefits %", type: "number", placeholder: "0–100" },
              EFFECTIVE_DATE_FIELD,
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
              hubLabelColumn("programType", "Type"),
              { key: "provider", label: "Provider" },
              { key: "hourlyRate", label: "Hourly rate" },
            ]}
            fields={[
              AIRCRAFT_FIELD,
              {
                key: "programType",
                label: "Program type",
                type: "select",
                options: PROGRAM_TYPES,
                required: true,
              },
              { key: "provider", label: "Provider" },
              { key: "hourlyRate", label: "Hourly rate", type: "number", placeholder: "USD/hr" },
              EFFECTIVE_DATE_FIELD,
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
              hubLabelColumn("role", "Role"),
              hubLabelColumn("trainingType", "Type"),
              { key: "annualCost", label: "Annual cost" },
            ]}
            fields={[
              AIRCRAFT_FIELD,
              { key: "role", label: "Role", type: "select", options: CREW_ROLES, required: true },
              {
                key: "trainingType",
                label: "Training type",
                type: "select",
                options: TRAINING_TYPES,
              },
              { key: "annualCost", label: "Annual cost", type: "number", placeholder: "USD" },
              { key: "provider", label: "Provider" },
              EFFECTIVE_DATE_FIELD,
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
              AIRCRAFT_FIELD,
              { key: "state", label: "State" },
              { key: "annualPremiumEstimate", label: "Annual premium", type: "number", placeholder: "USD" },
              EFFECTIVE_DATE_FIELD,
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
              AIRPORT_FIELD,
              {
                key: "aircraftCategory",
                label: "Category",
                type: "select",
                options: AIRCRAFT_CATEGORIES,
                required: true,
              },
              AIRCRAFT_FIELD_OPTIONAL,
              FBO_FIELD,
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
              EFFECTIVE_DATE_FIELD,
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
              AIRCRAFT_FIELD,
              AIRPORT_FIELD_OPTIONAL,
              { key: "retailRateBase", label: "Retail rate base", type: "number" },
              { key: "fuelSurcharge", label: "Fuel surcharge", type: "number" },
              { key: "ownerPaybackPercent", label: "Owner payback %", type: "number", placeholder: "0–100" },
              EFFECTIVE_DATE_FIELD,
            ]}
          />
        )}

        {tab === "scenarios" && <ScenarioTemplatesTab />}
      </div>
    </div>
  );
}
