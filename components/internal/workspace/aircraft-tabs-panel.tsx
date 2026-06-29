"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { AssumptionMap } from "@/lib/assumptions";
import { AircraftSetupBar } from "@/components/internal/workspace/aircraft-setup-panel";
import {
  OwnerControlsStrip,
  OwnerSplitsTable,
} from "@/components/internal/workspace/owner-splits-panel";
import { AssumptionsSectionTable } from "@/components/internal/workspace/assumptions-table";
import { CrewLadderExplainer } from "@/components/internal/workspace/crew-ladder-explainer";
import { effectiveFieldValue } from "@/components/internal/workspace/default-override-field";
import { AircraftProFormaColumn } from "@/components/internal/workspace/aircraft-pro-forma-tab";
import { isCalculatedField } from "@/lib/aircraft-calculated-fields";
import type { OwnerExpenseAllocationMode } from "@/lib/owner-expense-allocation";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";
import { OwnerFinancingSplitPanel } from "@/components/internal/workspace/owner-financing-split-panel";
import { CustomFixedCostsPanel } from "@/components/internal/workspace/custom-fixed-costs-panel";
import {
  buildEffectiveAssumptions,
  mergeAssumptionsWithDefaults,
} from "@/lib/resolve-effective-assumptions";
import { syncUtilizationHours } from "@/lib/proforma-utilization";
import {
  clearFieldsForProfileModeSwitch,
  fieldVisibleForProfileMode,
  instancePatchForProfileModeSwitch,
  normalizeAircraftProfileMode,
} from "@/lib/aircraft-profile-mode";
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
import {
  financingEnabledForScenarioMode,
  isFinancingScenarioVisible,
  normalizeFinancingScenarioMode,
} from "@/lib/financing-scenario";

const UTILIZATION_SYNC_KEYS = new Set(["charter_block_to_flight_ratio"]);

export function AircraftTabsPanel({
  proposalId,
  aircraftId,
  assumptions,
  warehouseDefaults,
  onAssumptionsChange,
  onApplySetupDefaults,
  onWarehouseDefaultsSeeded,
  ownerProfiles,
  allocationMode,
  onOwnerProfilesChange,
  onAllocationModeChange,
}: {
  proposalId: string;
  aircraftId: string;
  assumptions: AssumptionMap;
  warehouseDefaults: Record<string, string>;
  onAssumptionsChange: (next: AssumptionMap) => void;
  onApplySetupDefaults: (
    patch: Partial<AssumptionMap>,
    instancePatch?: Record<string, unknown>
  ) => void;
  onWarehouseDefaultsSeeded: (defaults: Record<string, string>) => void;
  ownerProfiles: ProposalOwnerProfile[];
  allocationMode: OwnerExpenseAllocationMode;
  onOwnerProfilesChange: (profiles: ProposalOwnerProfile[]) => void;
  onAllocationModeChange: (mode: OwnerExpenseAllocationMode) => void;
}) {
  const tabs = useMemo(() => editorTabsForAssumptions(assumptions), [assumptions]);
  type EditorTab = (typeof tabs)[number];
  const [activeTab, setActiveTab] = useState<EditorTab>("aircraft");

  const effective = useMemo(
    () => buildEffectiveAssumptions(assumptions, warehouseDefaults),
    [assumptions, warehouseDefaults]
  );

  const profileMode = useMemo(
    () => normalizeAircraftProfileMode(assumptions),
    [assumptions]
  );

  const handleOverride = useCallback(
    (name: string, overrideRaw: string) => {
      if (isCalculatedField(name, assumptions)) return;
      const def = warehouseDefaults[name] ?? "";
      let next = { ...assumptions, [name]: effectiveFieldValue(def, overrideRaw) };
      if (name === "aircraft_profile_mode") {
        const mode = normalizeAircraftProfileMode(next);
        Object.assign(next, clearFieldsForProfileModeSwitch(mode));
        onApplySetupDefaults({}, instancePatchForProfileModeSwitch(mode));
      }
      if (UTILIZATION_SYNC_KEYS.has(name)) {
        next = syncUtilizationHours(mergeAssumptionsWithDefaults(next, warehouseDefaults));
      }
      if (name === "financing_scenario_mode") {
        const mode = normalizeFinancingScenarioMode(next.financing_scenario_mode);
        next.financing_scenario_mode = mode;
        next.financing_enabled = financingEnabledForScenarioMode(mode);
      }
      onAssumptionsChange(next);
    },
    [assumptions, warehouseDefaults, onAssumptionsChange, onApplySetupDefaults]
  );

  const charterEnabled = isCharterUsageEnabled(assumptions);

  useEffect(() => {
    if (!tabs.includes(activeTab)) {
      setActiveTab("utilization_costs");
    }
  }, [tabs, activeTab]);

  const fieldHidden = useCallback(
    (field: WorkspaceField): boolean => {
      if (!fieldVisibleForProfileMode(field, profileMode)) return true;
      if (!fieldVisibleForUsage(field, assumptions)) return true;
      const name = field.assumptionName!;
      if (name === "insurance_annual" || name === "insurance_premium_percent") {
        return !insuranceFieldActive(assumptions.insurance_mode, name);
      }
      if (name === "lead_pilot_salary" || name === "lead_pilot_training") {
        return effective.lead_pilot_enabled !== "yes";
      }
      return false;
    },
    [assumptions, effective, profileMode]
  );

  function renderTabContent(tab: EditorTab) {
    if (tab === "owners") {
      const defaultHours =
        ownerProfiles[0]?.annualFlightHours ??
        (parseFloat(assumptions.owner_annual_hours ?? "400") || 400);
      return (
        <div className="flex flex-col gap-6">
          <section className="atlas-workspace-section">
            <div className="atlas-workspace-section-header">
              <h3 className="atlas-panel-title">Ownership structure</h3>
            </div>
            <div className="atlas-workspace-section-body">
              <OwnerControlsStrip
              profiles={ownerProfiles}
              allocationMode={allocationMode}
              onProfilesChange={onOwnerProfilesChange}
              onAllocationModeChange={onAllocationModeChange}
              defaultHours={defaultHours}
            />
            </div>
          </section>
          <section className="atlas-workspace-section">
            <div className="atlas-workspace-section-header">
              <h3 className="atlas-panel-title">Owner flight hours & equity</h3>
            </div>
            <div className="atlas-workspace-section-body">
              <OwnerSplitsTable
              profiles={ownerProfiles}
              defaultHours={defaultHours}
              onProfilesChange={onOwnerProfilesChange}
            />
            </div>
          </section>
          {sectionsForTab("owners").map((section) => (
            <AssumptionsSectionTable
              key={section.title}
              section={section}
              defaults={warehouseDefaults}
              assumptions={assumptions}
              effective={effective}
              fieldHidden={fieldHidden}
              onOverride={handleOverride}
            />
          ))}
        </div>
      );
    }

    const sections = sectionsForTab(tab);
    const visibleSections = sections.filter((s) =>
      sectionVisibleForUsage(s, assumptions, fieldHidden)
    );

    const showOwnerFinancing =
      tab === "financing" &&
      isFinancingScenarioVisible(assumptions) &&
      assumptions.financing_enabled === "yes" &&
      ownerProfiles.length > 1;

    return (
      <div className="flex flex-col gap-6">
        {showOwnerFinancing ? (
          <OwnerFinancingSplitPanel
            assumptions={effective}
            profiles={ownerProfiles}
            allocationMode={allocationMode}
          />
        ) : null}
        {tab === "crew_training" ? (
          <CrewLadderExplainer
            assumptions={assumptions}
            warehouseDefaults={warehouseDefaults}
          />
        ) : null}
        {tab === "financing" ? (
          <p className="text-sm text-atlas-muted">
            Set how financing appears on the Demo Pro Forma and client portal. Estimated aircraft
            value comes from the Data Warehouse Average Cost column. Override here for the
            proposal baseline; the Demo Pro Forma can model a different scenario value without
            changing this tab. Loan defaults seed the financing block when it is shown.
          </p>
        ) : null}
        {visibleSections.map((section) => (
          <AssumptionsSectionTable
            key={section.title}
            section={section}
            defaults={warehouseDefaults}
            assumptions={assumptions}
            effective={effective}
            fieldHidden={fieldHidden}
            onOverride={handleOverride}
          />
        ))}
        {tab === "financing_fees" ? (
          <CustomFixedCostsPanel
            assumptions={assumptions}
            onAssumptionsChange={onAssumptionsChange}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-atlas-bg">
      <AircraftSetupBar
        proposalId={proposalId}
        aircraftId={aircraftId}
        assumptions={assumptions}
        onApplyDefaults={onApplySetupDefaults}
        onWarehouseDefaultsSeeded={onWarehouseDefaultsSeeded}
      />

      <div className="atlas-workspace grid min-h-0 flex-1 grid-cols-2">
      {/* Configurator — equal width */}
      <div className="flex min-h-0 min-w-0 flex-col border-r border-atlas-border">
        <nav
          className="grid shrink-0 border-b border-atlas-border bg-atlas-surface/20"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          aria-label="Configuration tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              title={TAB_LABELS[tab]}
              className={cn(
                "flex min-h-10 w-full min-w-0 items-center justify-center border-b-2 -mb-px px-1 py-2 text-center text-[11px] font-medium leading-tight transition-colors sm:text-xs",
                activeTab === tab
                  ? "border-atlas-accent text-atlas-accent"
                  : "border-transparent text-atlas-muted hover:text-atlas-text"
              )}
            >
              <span className="block w-full truncate">{TAB_STRIP_LABELS[tab]}</span>
            </button>
          ))}
        </nav>

        <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
          {renderTabContent(activeTab)}
        </div>
      </div>

      {/* Demo Pro Forma — equal width */}
      <aside className="flex min-h-0 min-w-0 flex-col bg-atlas-surface/10">
        <div className="shrink-0 border-b border-atlas-border bg-atlas-surface/30 px-4 py-2.5">
          <p className="atlas-panel-title whitespace-nowrap">
            {TAB_LABELS.pro_forma}
          </p>
        </div>
        <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
          <AircraftProFormaColumn
            assumptions={effective}
            rawAssumptions={assumptions}
            warehouseDefaults={warehouseDefaults}
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
