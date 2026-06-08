"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AssumptionMap } from "@/lib/assumptions";
import { AircraftSetupBar } from "@/components/internal/workspace/aircraft-setup-panel";
import {
  OwnerControlsStrip,
  OwnerSplitsTable,
} from "@/components/internal/workspace/owner-splits-panel";
import { AssumptionsSectionTable } from "@/components/internal/workspace/assumptions-table";
import { effectiveFieldValue } from "@/components/internal/workspace/default-override-field";
import { AircraftProFormaColumn } from "@/components/internal/workspace/aircraft-pro-forma-tab";
import { isCalculatedField } from "@/lib/aircraft-calculated-fields";
import { hangarFieldActive } from "@/lib/hangar-assumptions";
import type { OwnerExpenseAllocationMode } from "@/lib/owner-expense-allocation";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";
import { OwnerFinancingSplitPanel } from "@/components/internal/workspace/owner-financing-split-panel";
import {
  buildEffectiveAssumptions,
  mergeAssumptionsWithDefaults,
} from "@/lib/resolve-effective-assumptions";
import { syncUtilizationHours } from "@/lib/proforma-utilization";
import {
  TAB_LABELS,
  TAB_STRIP_LABELS,
  editorTabsForAssumptions,
  sectionsForTab,
  insuranceFieldActive,
} from "@/lib/aircraft-tab-fields";
import type { WorkspaceField } from "@/lib/workspace-sections";
import {
  fieldVisibleForUsage,
  isCharterUsageEnabled,
  sectionVisibleForUsage,
} from "@/lib/usage-type";

const UTILIZATION_SYNC_KEYS = new Set([
  "max_annual_utilization",
  "charter_block_to_flight_ratio",
]);

export function AircraftTabsPanel({
  proposalId,
  aircraftId,
  assumptions,
  onAssumptionsChange,
  onApplySetupDefaults,
  ownerProfiles,
  allocationMode,
  onOwnerProfilesChange,
  onAllocationModeChange,
}: {
  proposalId: string;
  aircraftId: string;
  assumptions: AssumptionMap;
  onAssumptionsChange: (next: AssumptionMap) => void;
  onApplySetupDefaults: (
    patch: Partial<AssumptionMap>,
    instancePatch?: Record<string, unknown>
  ) => void;
  ownerProfiles: ProposalOwnerProfile[];
  allocationMode: OwnerExpenseAllocationMode;
  onOwnerProfilesChange: (profiles: ProposalOwnerProfile[]) => void;
  onAllocationModeChange: (mode: OwnerExpenseAllocationMode) => void;
}) {
  const tabs = useMemo(() => editorTabsForAssumptions(assumptions), [assumptions]);
  type EditorTab = (typeof tabs)[number];
  const [activeTab, setActiveTab] = useState<EditorTab>("aircraft");
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const defaultsCache = useRef(new Map<string, Record<string, string>>());

  const effective = useMemo(
    () => buildEffectiveAssumptions(assumptions, defaults),
    [assumptions, defaults]
  );

  const defaultsCacheKey = `${aircraftId}:${assumptions.aircraft_master_id ?? ""}:${assumptions.home_airport_icao ?? ""}`;

  const loadDefaults = useCallback(async () => {
    const cached = defaultsCache.current.get(defaultsCacheKey);
    if (cached) {
      setDefaults(cached);
      setLoadingDefaults(false);
      return;
    }

    setLoadingDefaults(true);
    const res = await fetch(
      `/api/proposals/${proposalId}/aircraft/${aircraftId}/defaults`
    );
    const json = await res.json();
    setLoadingDefaults(false);
    if (res.ok && json.defaults) {
      defaultsCache.current.set(defaultsCacheKey, json.defaults);
      setDefaults(json.defaults);
    }
  }, [proposalId, aircraftId, defaultsCacheKey]);

  useEffect(() => {
    void loadDefaults();
  }, [loadDefaults]);

  const handleOverride = useCallback(
    (name: string, overrideRaw: string) => {
      if (isCalculatedField(name, assumptions)) return;
      const def = defaults[name] ?? "";
      let next = { ...assumptions, [name]: effectiveFieldValue(def, overrideRaw) };
      if (UTILIZATION_SYNC_KEYS.has(name)) {
        next = syncUtilizationHours(mergeAssumptionsWithDefaults(next, defaults));
      }
      onAssumptionsChange(next);
    },
    [assumptions, defaults, onAssumptionsChange]
  );

  const charterEnabled = isCharterUsageEnabled(assumptions);

  useEffect(() => {
    if (!tabs.includes(activeTab)) {
      setActiveTab("utilization_costs");
    }
  }, [tabs, activeTab]);

  const fieldHidden = useCallback(
    (field: WorkspaceField): boolean => {
      if (!fieldVisibleForUsage(field, assumptions)) return true;
      const name = field.assumptionName!;
      if (name === "insurance_annual" || name === "insurance_premium_percent") {
        return !insuranceFieldActive(assumptions.insurance_mode, name);
      }
      if (name === "hangar_monthly" || name === "hangar_annual") {
        return !hangarFieldActive(assumptions.hangar_pricing_mode, name);
      }
      return false;
    },
    [assumptions]
  );

  function renderTabContent(tab: EditorTab) {
    if (tab === "owners") {
      const defaultHours =
        parseFloat(assumptions.default_owner_hours ?? "400") || 400;
      return (
        <div className="flex flex-col gap-6">
          <section className="rounded-lg border border-atlas-border/80 bg-atlas-surface/10 p-4">
            <h3 className="mb-4 font-serif text-base tracking-tight text-atlas-accent">
              Ownership structure
            </h3>
            <OwnerControlsStrip
              profiles={ownerProfiles}
              allocationMode={allocationMode}
              onProfilesChange={onOwnerProfilesChange}
              onAllocationModeChange={onAllocationModeChange}
              defaultHours={defaultHours}
            />
          </section>
          <section className="rounded-lg border border-atlas-border/80 bg-atlas-surface/10 p-4">
            <h3 className="mb-4 font-serif text-base tracking-tight text-atlas-accent">
              Owner flight hours & equity
            </h3>
            <OwnerSplitsTable
              profiles={ownerProfiles}
              maxAnnualUtilization={
                parseFloat(assumptions.max_annual_utilization ?? "0") || 0
              }
              defaultHours={defaultHours}
              onProfilesChange={onOwnerProfilesChange}
              fullWidth
            />
          </section>
          {loadingDefaults && Object.keys(defaults).length === 0 ? (
            <p className="atlas-caption py-2 text-center">Loading defaults…</p>
          ) : (
            sectionsForTab("owners").map((section) => (
              <AssumptionsSectionTable
                key={section.title}
                section={section}
                defaults={defaults}
                assumptions={assumptions}
                effective={effective}
                fieldHidden={fieldHidden}
                onOverride={handleOverride}
              />
            ))
          )}
        </div>
      );
    }

    const sections = sectionsForTab(tab);
    const visibleSections = sections.filter((s) =>
      sectionVisibleForUsage(s, assumptions, fieldHidden)
    );
    if (loadingDefaults && Object.keys(defaults).length === 0) {
      return <p className="atlas-caption py-6 text-center">Loading defaults from data hub…</p>;
    }

    const showOwnerFinancing =
      tab === "financing_fees" &&
      assumptions.financing_enabled === "yes" &&
      ownerProfiles.length > 1;

    return (
      <div className="flex flex-col gap-8">
        {showOwnerFinancing ? (
          <OwnerFinancingSplitPanel
            assumptions={effective}
            profiles={ownerProfiles}
            allocationMode={allocationMode}
          />
        ) : null}
        {visibleSections.map((section) => (
          <AssumptionsSectionTable
            key={section.title}
            section={section}
            defaults={defaults}
            assumptions={assumptions}
            effective={effective}
            fieldHidden={fieldHidden}
            onOverride={handleOverride}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-atlas-bg">
      <AircraftSetupBar
        assumptions={assumptions}
        onApplyDefaults={onApplySetupDefaults}
      />

      <div className="atlas-workspace grid min-h-0 flex-1 grid-cols-2">
      {/* Configurator — equal width */}
      <div className="flex min-h-0 min-w-0 flex-col border-r border-atlas-border">
        <nav className="atlas-tab-strip shrink-0 px-1" aria-label="Configuration tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              title={TAB_LABELS[tab]}
              className={cn(
                "atlas-tab",
                activeTab === tab
                  ? "border-atlas-accent text-atlas-accent"
                  : "border-transparent text-atlas-muted hover:text-atlas-text"
              )}
            >
              {TAB_STRIP_LABELS[tab]}
            </button>
          ))}
        </nav>

        <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
          {renderTabContent(activeTab)}
        </div>
      </div>

      {/* Pro Forma — equal width */}
      <aside className="flex min-h-0 min-w-0 flex-col bg-atlas-surface/10">
        <div className="shrink-0 border-b border-atlas-border px-4 py-2.5">
          <p className="atlas-section-title whitespace-nowrap text-lg">
            {TAB_LABELS.pro_forma}
          </p>
        </div>
        <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
          <AircraftProFormaColumn
            assumptions={effective}
            rawAssumptions={assumptions}
            charterEnabled={charterEnabled}
            ownerProfiles={ownerProfiles}
            allocationMode={allocationMode}
            onAssumptionsChange={onAssumptionsChange}
          />
        </div>
      </aside>
      </div>
    </div>
  );
}
