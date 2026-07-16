"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { CrudTab } from "@/components/internal/data-hub/crud-tab";
import { filtersForTab } from "@/components/internal/data-hub/filter-configs";
import { clearDataHubFilters } from "@/lib/data-hub-filters";
import { ROUTES } from "@/lib/routes";
import {
  DataHubFilterSidebar,
  DataHubSearchBar,
} from "@/components/internal/data-hub/filter-bar";
import {
  CompanySettingsSectionTab,
  CompanySettingsTab,
  INSURANCE_FIELDS,
  REGISTRATION_TAX_FIELDS,
} from "@/components/internal/data-hub/company-settings-tab";
import { CrewDataHubPanel } from "@/components/internal/data-hub/crew-data-hub-panel";
import { AircraftWorkbench } from "@/components/internal/data-hub/aircraft-workbench";
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
  { id: "airports", label: "Airports" },
  { id: "fbos", label: "FBOs" },
  { id: "general", label: "General and Company" },
  { id: "insurance", label: "Insurance" },
  { id: "registration-taxes", label: "Registration & Taxes" },
] as const;

const CREW_TAB = { id: "performance-data", label: "Fleet & performance" } as const;

export function DataHubClient({
  initialTab,
  initialTabData = null,
}: {
  initialTab: string;
  initialTabData?: DataHubListPayload | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? initialTab;

  const setTab = useCallback(
    (id: string) => {
      router.replace(`${ROUTES.dataWarehouse.data}?${clearDataHubFilters(id).toString()}`);
    },
    [router]
  );

  const isCrewTab = tab === CREW_TAB.id;
  const sidebarFilters = filtersForTab(tab);
  const showSidebarTools =
    !isCrewTab &&
    tab !== "general" &&
    tab !== "insurance" &&
    tab !== "registration-taxes" &&
    tab !== "aircraft" &&
    tab !== "fbos";
  const scrollContainedTab = tab === "aircraft" || tab === "fbos" || tab === "airports" || isCrewTab;
  const workbenchTab = tab === "aircraft" || tab === "fbos" || tab === "airports";
  const activeTab = isCrewTab
    ? CREW_TAB
    : (REFERENCE_TABS.find((t) => t.id === tab) ?? REFERENCE_TABS[0]);

  const navButtonClass = (active: boolean, pinned = false, compact = false) =>
    `rounded text-left text-sm transition-colors ${
      compact ? "shrink-0 whitespace-nowrap px-3 py-1.5" : "block w-full px-3 py-2"
    } ${
      active
        ? pinned
          ? "bg-atlas-accent/20 font-medium text-atlas-accent ring-1 ring-atlas-accent/30"
          : "bg-atlas-accent/15 text-atlas-accent"
        : pinned
          ? "text-atlas-text hover:bg-atlas-border/30"
          : "text-atlas-text/75 hover:bg-atlas-border/30 hover:text-atlas-text"
    }`;

  const sidebarTools = showSidebarTools ? (
    <div className="space-y-3 border-t border-atlas-border px-3 py-3">
      <DataHubSearchBar tab={tab} />
      <DataHubFilterSidebar tab={tab} fields={sidebarFilters} />
    </div>
  ) : null;

  const allTabs = [...REFERENCE_TABS, CREW_TAB];

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="shrink-0 border-b border-atlas-border bg-atlas-chrome/95 lg:hidden">
        <nav
          className="atlas-scroll-x flex gap-1 overflow-x-auto px-3 py-2"
          aria-label="Data sections"
        >
          {allTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={navButtonClass(tab === t.id, t.id === CREW_TAB.id, true)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {sidebarTools ? (
          <details className="group border-t border-atlas-border">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-medium text-atlas-muted marker:content-none [&::-webkit-details-marker]:hidden">
              Search &amp; filters
            </summary>
            <div className="border-t border-atlas-border/60">{sidebarTools}</div>
          </details>
        ) : null}
      </div>

      <aside className="data-hub-sidebar hidden min-h-0 w-56 shrink-0 flex-col border-r border-atlas-border bg-atlas-chrome/95 lg:flex xl:w-60">
        <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto">
          <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-atlas-muted/80">
            Data warehouse
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
          {sidebarTools}
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
        className={`min-w-0 flex-1 ${
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
            {!isCrewTab && (
              <p className="mt-0.5 text-sm text-atlas-muted">
                Reference data for proposals and pro forma
              </p>
            )}
          </header>
        ) : null}

        {isCrewTab ? (
          <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto pr-0.5 sm:pr-1">
            <CrewDataHubPanel />
          </div>
        ) : null}

        {tab === "aircraft" && (
          <div className="flex min-h-0 flex-1">
            <AircraftWorkbench
              initialData={initialTab === "aircraft" ? initialTabData : undefined}
            />
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
                    { key: "annualRate", label: "Annual hangar rate ($)", type: "number", required: true },
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
    </div>
  );
}
