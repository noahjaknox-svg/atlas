"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { CrudTab } from "@/components/internal/data-hub/crud-tab";
import { clearDataHubFilters } from "@/lib/data-hub-filters";
import { ROUTES } from "@/lib/routes";
import {
  CompanySettingsSectionTab,
  CompanySettingsTab,
  INSURANCE_FIELDS,
  REGISTRATION_TAX_FIELDS,
} from "@/components/internal/data-hub/company-settings-tab";
import { CrewStatusPanel } from "@/components/internal/data-hub/crew-status-panel";
import { AircraftWorkbench } from "@/components/internal/data-hub/aircraft-workbench";
import { FleetTailsWorkbench } from "@/components/internal/data-hub/fleet-tails-workbench";
import { AirportAuditWorkbench } from "@/components/internal/data-hub/airport-audit-workbench";
import {
  RecordWorkbench,
  type WorkbenchField,
} from "@/components/internal/data-hub/record-workbench";
import type { DataHubListPayload } from "@/lib/data-hub-prefetch";

const FBO_WORKBENCH_FIELDS: WorkbenchField[] = [
  {
    key: "airportIcao",
    label: "Airport ICAO",
    type: "text",
    required: true,
    group: "Details",
    placeholder: "e.g. KSDL",
  },
  { key: "fboName", label: "FBO Name", type: "text", required: true, group: "Details" },
  {
    key: "baseFuelRate",
    label: "Base Fuel Rate ($/gal)",
    type: "number",
    required: true,
    group: "Details",
  },
  {
    key: "hangarCostPerSqft",
    label: "Hangar Cost Per Sqft ($/yr)",
    type: "number",
    group: "Details",
  },
];

const REFERENCE_TABS = [
  { id: "aircraft", label: "Aircraft types" },
  { id: "tails", label: "Tails" },
  { id: "airports", label: "Airports" },
  { id: "fbos", label: "FBOs" },
  { id: "general", label: "General and Company" },
  { id: "insurance", label: "Insurance" },
  { id: "registration-taxes", label: "Registration & Taxes" },
] as const;

const LEGACY_CREW_TAB = "performance-data";

export function DataHubClient({
  initialTab,
  initialTabData = null,
}: {
  initialTab: string;
  initialTabData?: DataHubListPayload | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? initialTab;

  useEffect(() => {
    if (rawTab !== LEGACY_CREW_TAB) return;
    router.replace(`${ROUTES.dataWarehouse.data}?${clearDataHubFilters("aircraft").toString()}`);
  }, [rawTab, router]);

  const tab = rawTab === LEGACY_CREW_TAB ? "aircraft" : rawTab;

  const setTab = useCallback(
    (id: string) => {
      router.replace(`${ROUTES.dataWarehouse.data}?${clearDataHubFilters(id).toString()}`);
    },
    [router]
  );

  const scrollContainedTab =
    tab === "aircraft" || tab === "tails" || tab === "fbos" || tab === "airports";
  const workbenchTab =
    tab === "aircraft" || tab === "tails" || tab === "fbos" || tab === "airports";
  const activeTab = REFERENCE_TABS.find((t) => t.id === tab) ?? REFERENCE_TABS[0];

  const tabButtonClass = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-sm transition-colors ${
      active
        ? "bg-atlas-accent/15 font-medium text-atlas-accent"
        : "text-atlas-text/75 hover:bg-atlas-border/30 hover:text-atlas-text"
    }`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-atlas-border bg-atlas-chrome/95">
        <nav
          className="atlas-scroll-x flex gap-1 overflow-x-auto px-3 py-2 sm:px-4"
          aria-label="Data warehouse sections"
        >
          {REFERENCE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={tabButtonClass(tab === t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div
        className={`min-h-0 min-w-0 flex-1 ${
          workbenchTab ? "" : "p-3 sm:p-4 lg:p-5 xl:p-6"
        } ${
          scrollContainedTab
            ? "flex min-h-0 flex-col overflow-hidden"
            : "atlas-scroll overflow-y-auto"
        }`}
      >
        {!workbenchTab ? (
          <header className="mb-3 shrink-0 sm:mb-4">
            <h1 className="font-serif text-xl sm:text-2xl">{activeTab.label}</h1>
            <p className="mt-0.5 text-sm text-atlas-muted">
              Reference data for proposals, pro forma, and Crew sync
            </p>
          </header>
        ) : null}

        {tab === "aircraft" && (
          <div className="flex min-h-0 flex-1">
            <AircraftWorkbench
              initialData={initialTab === "aircraft" ? initialTabData : undefined}
            />
          </div>
        )}

        {tab === "tails" && (
          <div className="flex min-h-0 flex-1">
            <FleetTailsWorkbench />
          </div>
        )}

        {tab === "airports" && (
          <div className="flex min-h-0 flex-1">
            <AirportAuditWorkbench />
          </div>
        )}

        {tab === "fbos" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <div className="flex min-h-0 flex-1">
              <RecordWorkbench
                title="FBO"
                apiPath="/api/data/fbos"
                initialData={initialTab === "fbos" ? initialTabData : undefined}
                fields={FBO_WORKBENCH_FIELDS}
                primaryKey="fboName"
                subtitle={(row) =>
                  [row.airportIcao, row.baseFuelRate ? `$${row.baseFuelRate}/gal` : null]
                    .filter(Boolean)
                    .join(" · ")
                }
                searchKeys={["fboName", "airportIcao"]}
                filter={{ rowKey: "airportIcao", allLabel: "All airports" }}
              />
            </div>
            <details className="shrink-0 rounded-lg border border-atlas-border bg-atlas-surface/20">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-atlas-muted marker:content-none [&::-webkit-details-marker]:hidden">
                Specific hangar rates (per-aircraft overrides)
              </summary>
              <div className="border-t border-atlas-border p-4">
                <CrudTab
                  title="Specific hangar rates"
                  apiPath="/api/data/fbo-overrides"
                  columns={[
                    { key: "fboName", label: "FBO" },
                    { key: "aircraft", label: "Aircraft" },
                    { key: "annualRate", label: "Annual rate ($)" },
                  ]}
                  fields={[
                    {
                      key: "fboId",
                      label: "FBO",
                      type: "searchable",
                      searchKind: "fbo",
                      displayFromRow: "fboName",
                      required: true,
                      placeholder: "Search FBO…",
                    },
                    {
                      key: "aircraftTypeId",
                      label: "Aircraft",
                      type: "searchable",
                      searchKind: "aircraft",
                      displayFromRow: "aircraft",
                      required: true,
                      placeholder: "Search aircraft…",
                    },
                    {
                      key: "annualRate",
                      label: "Annual hangar rate ($)",
                      type: "number",
                      required: true,
                    },
                  ]}
                  emptyMessage="No per-aircraft overrides."
                />
              </div>
            </details>
          </div>
        )}

        {tab === "general" && <CompanySettingsTab />}

        {tab === "insurance" && (
          <CompanySettingsSectionTab
            title="Insurance defaults"
            description="Default insurance mode and amounts copied into each proposal workspace on aircraft add and manual refresh."
            fields={INSURANCE_FIELDS}
          />
        )}

        {tab === "registration-taxes" && (
          <CompanySettingsSectionTab
            title="Registration & taxes defaults"
            description="Default registration tax rate copied into each proposal workspace on aircraft add and manual refresh."
            fields={REGISTRATION_TAX_FIELDS}
          />
        )}
      </div>

      <CrewStatusPanel />
    </div>
  );
}
