"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { type AircraftListItem } from "@/components/internal/workspace/aircraft-list-panel";
import { AircraftTabsPanel } from "@/components/internal/workspace/aircraft-tabs-panel";
import type { PortalPresentationState } from "@/components/internal/workspace/portal-presentation-panel";
import { PortalPresentationDialog } from "@/components/internal/workspace/portal-presentation-dialog";
import { PROSPECT_PORTAL_UPDATED_MESSAGE } from "@/lib/product-terminology";
import { ROUTES } from "@/lib/routes";
import { WorkspaceLayout } from "@/components/internal/workspace/workspace-layout";
import type { ExperienceSectionRow } from "@/components/internal/workspace/experience-manager-panel";
import { WorkspaceProposalFooter } from "@/components/internal/workspace/workspace-proposal-footer";
import type { ProposalComment } from "@/components/internal/workspace/proposal-comments-panel";
import {
  AddAircraftModal,
  type AddAircraftPayload,
} from "@/components/internal/workspace/add-aircraft-modal";
import { syncUtilizationHours } from "@/lib/proforma-utilization";
import {
  aircraftAssumptionCategory,
  buildPayloadForCategory,
  buildMetaAssumptionPayload,
  getAllAircraftEditorFields,
  instancePatchFromAssumptions,
  assumptionsFromInstance,
  usageTypeToOperatingModel,
} from "@/lib/aircraft-workspace";
import {
  normalizeProformaCustomFixedCostsAssumption,
} from "@/lib/proforma-custom-fixed-costs";
import type { AssumptionMap } from "@/lib/assumptions";
import type { OwnerExpenseAllocationMode } from "@/lib/owner-expense-allocation";
import {
  assumptionsAfterOwnerDefaultsChange,
  mergeOwnerProfilesAfterPersist,
  normalizeProfilesForCount,
  ownerDefaultHoursChanged,
  ownerHoursForUtilization,
  profileFromLegacyAssumptions,
  validateOwnerProfiles,
  validateProformaOwnerHours,
  type ProposalOwnerProfile,
} from "@/lib/proposal-owners";
import { OWNER_EXPENSE_ALLOCATION_KEY } from "@/lib/owner-expense-allocation";
import { patchAssumptionsWithCrewStep } from "@/lib/crew-step";
import { mergeWithDerived } from "@/lib/aircraft-calculated-fields";
import {
  mergeAssumptionsForCrewStep,
  resolveCrewStepFromAssumptions,
} from "@/lib/crew-step";
import {
  applyWarehouseDefaults,
  warehouseDefaultsBaseline,
} from "@/lib/warehouse-assumption-seed";
import { buildDefaultsQueryParams } from "@/lib/build-defaults-query";
import { needsWarehouseSeed } from "@/lib/needs-warehouse-seed";
import type { ProspectFormState, ProspectSavePayload } from "@/lib/workspace-sections";
import type { AtlasUserOption } from "@/components/internal/workspace/prospect-panel";

type SectionRow = {
  id: string;
  sectionType: string;
  title: string;
  bodyCopy: string | null;
  visible: boolean;
  sortOrder: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
  posterUrl?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  contentBlocks?: ExperienceSectionRow["contentBlocks"];
};

export type ProposalWorkspaceData = {
  id: string;
  proposalName: string;
  status: string;
  updatedAt: string;
  currentManager: string;
  currentUserId: string;
  currentUserName: string;
  initialComments: ProposalComment[];
  portalPin: string | null;
  prospect: ProspectFormState;
  assignedToId: string | null;
  assignedToName: string | null;
  atlasUsers: AtlasUserOption[];
  selectedAircraftId: string | null;
  aircraft: AircraftListItem[];
  sections: SectionRow[];
  scenarios: Array<{
    aircraftInstanceId: string | null;
    isBaseCase: boolean;
    netAnnualCost: string | number | null;
    netMonthlyCost: string | number | null;
    costPerOwnerHour: string | number | null;
    ownerHours: string | number | null;
  }>;
  clientPortal: { slug: string; active: boolean; portalUrl?: string } | null;
  lastPublishedAt: string | null;
  initialNeedsRepublish?: boolean;
  initialClientEditable?: Record<string, boolean>;
  ownersByAircraft: Record<string, ProposalOwnerProfile[]>;
  allocationModeByAircraft: Record<string, OwnerExpenseAllocationMode>;
  deletedAt?: string | null;
};

function mergeAssumptions(
  stored: AssumptionMap,
  meta: AircraftListItem
): AssumptionMap {
  return { ...assumptionsFromInstance(meta), ...stored };
}

export function ProposalWorkspace({
  data,
  isAdmin,
}: {
  data: ProposalWorkspaceData;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [prospect, setProspect] = useState(data.prospect);
  const [currentManager, setCurrentManager] = useState(data.currentManager);
  const [assignedToId, setAssignedToId] = useState<string | null>(data.assignedToId);
  const [assignedToName, setAssignedToName] = useState<string | null>(data.assignedToName);
  const [aircraft, setAircraft] = useState(data.aircraft);
  const [selectedId, setSelectedId] = useState<string | null>(data.selectedAircraftId);
  const [assumptionsByAircraft, setAssumptionsByAircraft] = useState<Record<string, AssumptionMap>>(
    () =>
      Object.fromEntries(
        data.aircraft.map((a) => [a.id, mergeAssumptions(a.assumptions, a)])
      )
  );
  const [warehouseBaselineByAircraft, setWarehouseBaselineByAircraft] = useState<
    Record<string, Record<string, string>>
  >(() => Object.fromEntries(data.aircraft.map((a) => [a.id, {}])));
  const [portal, setPortal] = useState(data.clientPortal);
  const [clientEditable, setClientEditable] = useState<Record<string, boolean>>(
    () => data.initialClientEditable ?? {}
  );
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [portalPresentationOpen, setPortalPresentationOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [prospectSaveState, setProspectSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [needsRepublish, setNeedsRepublish] = useState(data.initialNeedsRepublish ?? false);
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(data.lastPublishedAt);
  const [proposalName, setProposalName] = useState(data.proposalName);
  const [portalPin, setPortalPin] = useState<string | null>(data.portalPin);
  const markNeedsRepublish = useCallback(() => {
    if (portalPin) setNeedsRepublish(true);
  }, [portalPin]);
  const [ownersByAircraft, setOwnersByAircraft] = useState(data.ownersByAircraft);
  const [allocationModeByAircraft, setAllocationModeByAircraft] = useState(
    data.allocationModeByAircraft
  );
  const [sections, setSections] = useState(data.sections);
  const [deletedAt, setDeletedAt] = useState<string | null>(data.deletedAt ?? null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const ownersSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownersDirtyRef = useRef(new Set<string>());
  const ownersRevisionRef = useRef<Record<string, number>>({});
  const ownersByAircraftRef = useRef(ownersByAircraft);
  const warehouseSeedAttempted = useRef(new Set<string>());

  async function handleRegeneratePin() {
    if (
      !confirm(
        "Regenerate the client access code? The previous code will stop working immediately."
      )
    )
      return;
    const res = await fetch(`/api/proposals/${data.id}/portal/regenerate-pin`, { method: "POST" });
    const json = await res.json();
    if (res.ok && json.pin) {
      setPortalPin(json.pin);
      alert(`New PIN: ${json.pin}`);
    }
  }

  async function handleToggleIncluded(aircraftId: string, included: boolean) {
    setAircraft((list) =>
      list.map((a) => (a.id === aircraftId ? { ...a, includedOnProposal: included } : a))
    );
    await fetch(`/api/proposals/${data.id}/aircraft/${aircraftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includedOnProposal: included }),
    });
    markNeedsRepublish();
  }

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scenarioSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSave = useRef(true);
  const dirtyAircraftRef = useRef(new Set<string>());
  const assumptionRevisionRef = useRef<Record<string, number>>({});
  const persistInFlight = useRef(false);
  const persistQueued = useRef(false);
  const saveStatusRef = useRef(saveStatus);
  const assumptionsByAircraftRef = useRef(assumptionsByAircraft);
  const warehouseBaselineByAircraftRef = useRef(warehouseBaselineByAircraft);

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  useEffect(() => {
    assumptionsByAircraftRef.current = assumptionsByAircraft;
  }, [assumptionsByAircraft]);

  useEffect(() => {
    warehouseBaselineByAircraftRef.current = warehouseBaselineByAircraft;
  }, [warehouseBaselineByAircraft]);

  useEffect(() => {
    ownersByAircraftRef.current = ownersByAircraft;
  }, [ownersByAircraft]);

  function markAircraftDirty(aircraftId: string) {
    dirtyAircraftRef.current.add(aircraftId);
    assumptionRevisionRef.current[aircraftId] =
      (assumptionRevisionRef.current[aircraftId] ?? 0) + 1;
  }

  function releasePersistedDirty(
    dirtyIds: string[],
    revisionsAtStart: Map<string, number>
  ) {
    for (const acId of dirtyIds) {
      if ((assumptionRevisionRef.current[acId] ?? 0) === revisionsAtStart.get(acId)) {
        dirtyAircraftRef.current.delete(acId);
      }
    }
  }

  function seedWarehouseBaseline(aircraftId: string, defaults: Record<string, string>) {
    setWarehouseBaselineByAircraft((prev) => ({
      ...prev,
      [aircraftId]: warehouseDefaultsBaseline(defaults),
    }));
  }

  const loadWarehouseBaselineOnly = useCallback(
    async (aircraftId: string) => {
      const assumptions = assumptionsByAircraftRef.current[aircraftId] ?? {};
      const params = buildDefaultsQueryParams(assumptions);

      const res = await fetch(
        `/api/proposals/${data.id}/aircraft/${aircraftId}/defaults?${params.toString()}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.defaults) return false;

      setWarehouseBaselineByAircraft((prev) => ({
        ...prev,
        [aircraftId]: warehouseDefaultsBaseline(json.defaults as Record<string, string>),
      }));
      return true;
    },
    [data.id]
  );

  const applyWarehouseFromApi = useCallback(
    async (aircraftId: string, mode: "seed" | "refresh") => {
      const assumptions = assumptionsByAircraftRef.current[aircraftId] ?? {};
      const params = buildDefaultsQueryParams(assumptions);

      const res = await fetch(
        `/api/proposals/${data.id}/aircraft/${aircraftId}/defaults?${params.toString()}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.defaults) return false;

      const defaults = json.defaults as Record<string, string>;
      const baseline = warehouseDefaultsBaseline(defaults);
      const nextAssumptions = mergeWithDerived(
        applyWarehouseDefaults(assumptions, defaults, mode)
      );

      markAircraftDirty(aircraftId);
      setAssumptionsByAircraft((prev) => ({ ...prev, [aircraftId]: nextAssumptions }));
      setWarehouseBaselineByAircraft((prev) => ({ ...prev, [aircraftId]: baseline }));

      const resolvedMaster = defaults.aircraft_master_id?.trim();
      if (resolvedMaster && resolvedMaster !== assumptions.aircraft_master_id?.trim()) {
        void fetch(`/api/proposals/${data.id}/aircraft/${aircraftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aircraftMasterId: resolvedMaster }),
        });
      }

      return true;
    },
    [data.id]
  );

  function applySetupDefaults(
    aircraftId: string,
    patch: Partial<AssumptionMap>,
    instancePatch?: Record<string, unknown>
  ) {
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter((entry): entry is [string, string] => entry[1] != null)
    ) as AssumptionMap;
    markAircraftDirty(aircraftId);
    setAssumptionsByAircraft((prev) => ({
      ...prev,
      [aircraftId]: mergeWithDerived({ ...(prev[aircraftId] ?? {}), ...cleaned }),
    }));
    if (instancePatch) {
      setAircraft((list) =>
        list.map((a) =>
          a.id === aircraftId
            ? {
                ...a,
                proposedHomeBaseIcao:
                  (instancePatch.proposedHomeBaseIcao as string | null | undefined) ??
                  a.proposedHomeBaseIcao,
                year:
                  instancePatch.year !== undefined
                    ? (instancePatch.year as number | null)
                    : a.year,
                tailNumber:
                  instancePatch.tailNumber !== undefined
                    ? (instancePatch.tailNumber as string | null)
                    : a.tailNumber,
                serialNumber:
                  instancePatch.serialNumber !== undefined
                    ? (instancePatch.serialNumber as string | null)
                    : a.serialNumber,
              }
            : a
        )
      );
      void fetch(`/api/proposals/${data.id}/aircraft/${aircraftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(instancePatch),
      });
    }
  }

  const selected = aircraft.find((a) => a.id === selectedId) ?? aircraft[0] ?? null;
  const selectedAssumptions = selected ? (assumptionsByAircraft[selected.id] ?? {}) : {};
  const selectedOwners = selected
    ? (ownersByAircraft[selected.id] ?? profileFromLegacyAssumptions(selectedAssumptions))
    : [];
  const selectedAllocationMode = selected
    ? (allocationModeByAircraft[selected.id] ?? "hybrid")
    : "hybrid";

  const persistOwners = useCallback(
    async (aircraftId: string) => {
      if (!ownersDirtyRef.current.has(aircraftId)) return;

      const revisionAtStart = ownersRevisionRef.current[aircraftId] ?? 0;
      const profiles = ownersByAircraftRef.current[aircraftId] ?? [];
      const mode = allocationModeByAircraft[aircraftId] ?? "hybrid";
      const map = assumptionsByAircraftRef.current[aircraftId] ?? {};
      const warehouseDefaults = warehouseBaselineByAircraftRef.current[aircraftId] ?? {};
      const ownerHours = ownerHoursForUtilization(profiles, map);
      const merged = mergeAssumptionsForCrewStep(map, warehouseDefaults);
      const resolved = resolveCrewStepFromAssumptions(
        merged,
        { ownerHours },
        warehouseDefaults
      );
      const validation = validateProformaOwnerHours(
        profiles,
        map,
        resolved.maxAnnualUtilization
      );
      const profileValidation = validateOwnerProfiles(
        profiles,
        0,
        profiles.length > 1
      );
      if (!profileValidation.ok) return;
      if (!validation.ok) return;

      const res = await fetch(
        `/api/proposals/${data.id}/aircraft/${aircraftId}/owners`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profiles, allocationMode: mode }),
        }
      );
      if (!res.ok) return;
      const json = await res.json();
      ownersDirtyRef.current.delete(aircraftId);
      const applySavedValues =
        revisionAtStart === (ownersRevisionRef.current[aircraftId] ?? 0);
      if (json.profiles) {
        setOwnersByAircraft((prev) => ({
          ...prev,
          [aircraftId]: mergeOwnerProfilesAfterPersist(
            prev[aircraftId] ?? profiles,
            json.profiles,
            applySavedValues
          ),
        }));
      }
      if (portalPin) markNeedsRepublish();
    },
    [data.id, allocationModeByAircraft, portal?.active]
  );

  const scheduleOwnersPersist = useCallback(
    (aircraftId: string) => {
      ownersDirtyRef.current.add(aircraftId);
      if (ownersSaveTimer.current) clearTimeout(ownersSaveTimer.current);
      ownersSaveTimer.current = setTimeout(() => void persistOwners(aircraftId), 1200);
    },
    [persistOwners]
  );

  function applyOwnerChanges(
    aircraftId: string,
    profiles: ProposalOwnerProfile[],
    mode: OwnerExpenseAllocationMode
  ) {
    const prevProfiles = ownersByAircraftRef.current[aircraftId] ?? [];
    const seedProforma =
      profiles.length !== prevProfiles.length ||
      ownerDefaultHoursChanged(prevProfiles, profiles);

    ownersRevisionRef.current[aircraftId] =
      (ownersRevisionRef.current[aircraftId] ?? 0) + 1;
    setOwnersByAircraft((prev) => ({ ...prev, [aircraftId]: profiles }));
    setAllocationModeByAircraft((prev) => ({ ...prev, [aircraftId]: mode }));
    if (seedProforma) {
      markAircraftDirty(aircraftId);
    } else {
      skipSave.current = true;
    }
    setAssumptionsByAircraft((prev) => {
      const base = prev[aircraftId] ?? {};
      const warehouseDefaults = warehouseBaselineByAircraftRef.current[aircraftId] ?? {};
      let next: AssumptionMap = { ...base, [OWNER_EXPENSE_ALLOCATION_KEY]: mode };
      if (seedProforma) {
        next = assumptionsAfterOwnerDefaultsChange(
          next,
          profiles,
          mode,
          warehouseDefaults,
          true
        );
      } else {
        const hours = ownerHoursForUtilization(profiles, next);
        next = patchAssumptionsWithCrewStep(next, warehouseDefaults, { ownerHours: hours });
      }
      return {
        ...prev,
        [aircraftId]: mergeWithDerived(next),
      };
    });
    scheduleOwnersPersist(aircraftId);
  }
  const isArchived = deletedAt != null;
  const previewDisabledReason = !selected
    ? "Select an aircraft to preview the prospect portal"
    : saveStatus === "saving"
      ? "Wait until your changes finish saving"
      : saveStatus === "error"
        ? "Fix save errors before previewing"
        : undefined;
  const previewDisabled =
    !selected || saveStatus === "saving" || saveStatus === "error" || previewLoading;
  const saveLabel = isArchived
    ? "Archived — read only"
    : saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? lastSavedAt
          ? `Saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
          : "Saved"
        : saveStatus === "error"
          ? "Save failed — retrying on next edit"
          : "Autosave on";

  useEffect(() => {
    if (isArchived) return;
    for (const ac of aircraft) {
      void loadWarehouseBaselineOnly(ac.id);
    }
  }, [aircraft, isArchived, loadWarehouseBaselineOnly]);

  useEffect(() => {
    if (!selected || isArchived) return;
    const assumptions = assumptionsByAircraft[selected.id];
    if (!assumptions || !needsWarehouseSeed(assumptions)) return;
    if (warehouseSeedAttempted.current.has(selected.id)) return;

    warehouseSeedAttempted.current.add(selected.id);
    void applyWarehouseFromApi(selected.id, "seed");
  }, [selected, isArchived, assumptionsByAircraft, applyWarehouseFromApi]);

  const scheduleScenarioSync = useCallback(
    (aircraftId: string) => {
      if (scenarioSyncTimer.current) clearTimeout(scenarioSyncTimer.current);
      scenarioSyncTimer.current = setTimeout(() => {
        const map = assumptionsByAircraftRef.current[aircraftId];
        if (!map) return;
        void fetch(
          `/api/proposals/${data.id}/calculate?aircraftInstanceId=${aircraftId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assumptions: map }),
            keepalive: true,
          }
        );
      }, 4000);
    },
    [data.id]
  );

  const waitForPersistIdle = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const tick = () => {
          if (!persistInFlight.current) resolve();
          else setTimeout(tick, 25);
        };
        tick();
      }),
    []
  );

  const persist = useCallback(async (): Promise<boolean> => {
    if (isArchived) return true;
    if (persistInFlight.current) {
      persistQueued.current = true;
      await waitForPersistIdle();
      return saveStatusRef.current !== "error";
    }

    const dirtyIds = Array.from(dirtyAircraftRef.current);
    if (dirtyIds.length === 0) return true;

    const revisionsAtStart = new Map(
      dirtyIds.map((id) => [id, assumptionRevisionRef.current[id] ?? 0])
    );

    persistInFlight.current = true;
    setSaveStatus("saving");
    try {
      const payload = dirtyIds.flatMap((acId) => {
        const map = assumptionsByAircraftRef.current[acId];
        if (!map) return [];
        const category = aircraftAssumptionCategory(acId);
        const fields = getAllAircraftEditorFields(category);
        const synced = syncUtilizationHours(map);
        return [
          ...buildPayloadForCategory(category, synced, fields, clientEditable),
          ...buildMetaAssumptionPayload(category, synced),
        ];
      });

      if (payload.length === 0) {
        releasePersistedDirty(dirtyIds, revisionsAtStart);
        setSaveStatus("saved");
        return true;
      }

      const requests: Promise<Response>[] = [
        fetch(`/api/proposals/${data.id}/assumptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      ];

      for (const acId of dirtyIds) {
        const map = assumptionsByAircraftRef.current[acId];
        if (!map) continue;
        const patch = instancePatchFromAssumptions(map);
        if (acId === selectedId) {
          Object.assign(patch, { select: true });
        }
        requests.push(
          fetch(`/api/proposals/${data.id}/aircraft/${acId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          })
        );
      }
      const results = await Promise.all(requests);
      if (results.some((r) => !r.ok)) throw new Error("save failed");

      releasePersistedDirty(dirtyIds, revisionsAtStart);

      for (const acId of dirtyIds) {
        const map = assumptionsByAircraftRef.current[acId];
        if (!map) continue;
        const normalized = normalizeProformaCustomFixedCostsAssumption(map);
        assumptionsByAircraftRef.current[acId] = normalized;
        setAssumptionsByAircraft((prev) =>
          prev[acId] ? { ...prev, [acId]: normalized } : prev
        );
      }

      setSaveStatus("saved");
      setLastSavedAt(new Date());
      if (portalPin) markNeedsRepublish();
      if (selectedId) scheduleScenarioSync(selectedId);
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    } finally {
      persistInFlight.current = false;
      if (persistQueued.current) {
        persistQueued.current = false;
        void persist();
      }
    }
  }, [
    data.id,
    selectedId,
    clientEditable,
    portal?.active,
    scheduleScenarioSync,
    isArchived,
    waitForPersistIdle,
  ]);

  const flushPersist = useCallback(async (): Promise<boolean> => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    if (selectedId) {
      markAircraftDirty(selectedId);
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      await waitForPersistIdle();
      if (dirtyAircraftRef.current.size === 0) break;
      await persist();
      await waitForPersistIdle();
      if (saveStatusRef.current === "error") break;
    }

    return saveStatusRef.current !== "error";
  }, [persist, selectedId, waitForPersistIdle]);

  async function handleProspectSave(payload: ProspectSavePayload) {
    setProspectSaveState("saving");
    try {
      const res = await fetch(`/api/proposals/${data.id}/prospect`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save prospect");

      setProspect({
        prospectName: payload.prospectName,
        contactName: payload.contactName,
        contactEmail: payload.contactEmail,
        contactPhone: payload.contactPhone,
        internalNotes: payload.internalNotes,
        clientSummary: payload.clientSummary,
      });
      setCurrentManager(payload.currentManager);
      setAssignedToId(payload.assignedToId);
      setAssignedToName(
        json.assignedTo?.name ??
          data.atlasUsers.find((u) => u.id === payload.assignedToId)?.name ??
          null
      );
      setProspectSaveState("saved");
      markNeedsRepublish();
    } catch {
      setProspectSaveState("error");
      throw new Error("Failed to save prospect");
    }
  }

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    setSaveStatus("idle");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(), 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [assumptionsByAircraft, persist]);

  function setAssumption(name: string, value: string) {
    if (!selectedId) return;
    markAircraftDirty(selectedId);
    setAssumptionsByAircraft((prev) => {
      const base = syncUtilizationHours({ ...(prev[selectedId] ?? {}), [name]: value });
      const merged = mergeWithDerived(base);
      const updated = { ...prev, [selectedId]: merged };
      assumptionsByAircraftRef.current = updated;
      return updated;
    });
  }

  function setAssumptionsMap(next: AssumptionMap) {
    if (!selectedId) return;
    markAircraftDirty(selectedId);
    setAssumptionsByAircraft((prev) => {
      const merged = mergeWithDerived(syncUtilizationHours(next));
      const updated = { ...prev, [selectedId]: merged };
      assumptionsByAircraftRef.current = updated;
      return updated;
    });
  }

  async function handleSelect(id: string) {
    setSelectedId(id);
    await fetch(`/api/proposals/${data.id}/aircraft/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ select: true }),
    });
  }

  async function handleAddAircraft(payload: AddAircraftPayload) {
    const res = await fetch(`/api/proposals/${data.id}/aircraft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aircraftModel: payload.aircraftModel,
        aircraftMasterId: payload.aircraftMasterId,
        proposedHomeBase: payload.proposedHomeBase,
        fboName: payload.fboName,
        usageType: payload.usageType,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to add aircraft");

    const ac = json.aircraft;
    const serverAssumptions = (json.assumptions ?? {}) as AssumptionMap;
    const assumptions: AssumptionMap = mergeWithDerived(serverAssumptions);

    const item: AircraftListItem = {
      id: ac.id,
      year: ac.year,
      tailNumber: ac.tailNumber,
      serialNumber: ac.serialNumber,
      proposedHomeBaseIcao: ac.proposedHomeBaseIcao,
      estimatedValue: ac.estimatedValue?.toString() ?? null,
      valueSource: ac.valueSource,
      aircraftMaster: ac.warehouseAircraft ?? ac.aircraftMaster ?? null,
      assumptions,
    };

    warehouseSeedAttempted.current.add(ac.id);
    setAircraft((list) => [...list, item]);
    setAssumptionsByAircraft((m) => ({ ...m, [ac.id]: assumptions }));
    setWarehouseBaselineByAircraft((m) => ({ ...m, [ac.id]: {} }));
    void applyWarehouseFromApi(ac.id, "seed");
    setOwnersByAircraft((m) => ({
      ...m,
      [ac.id]: profileFromLegacyAssumptions(assumptions),
    }));
    setAllocationModeByAircraft((m) => ({ ...m, [ac.id]: "hybrid" }));
    setSelectedId(ac.id);
    markAircraftDirty(ac.id);
  }

  async function handleRefreshWarehouseData(aircraftId: string) {
    if (
      !confirm(
        "Refresh warehouse data for this aircraft? Values from the Data Warehouse will replace unstored defaults. Your saved overrides are kept."
      )
    ) {
      return;
    }
    const ok = await applyWarehouseFromApi(aircraftId, "refresh");
    if (!ok) {
      alert("Could not refresh warehouse data. Check aircraft type and home base.");
    }
  }

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/proposals/${data.id}/aircraft/${id}/duplicate`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) return;
    const ac = json.aircraft;
    const src = assumptionsByAircraft[id] ?? {};
    const assumptions = {
      ...src,
      aircraft_model: `${src.aircraft_model || "Aircraft"} (copy)`,
    };
    const item: AircraftListItem = {
      id: ac.id,
      year: ac.year,
      tailNumber: ac.tailNumber,
      serialNumber: ac.serialNumber,
      proposedHomeBaseIcao: ac.proposedHomeBaseIcao,
      estimatedValue: ac.estimatedValue?.toString() ?? null,
      valueSource: ac.valueSource,
      aircraftMaster: ac.aircraftMaster,
      assumptions,
    };
    setAircraft((list) => [...list, item]);
    setAssumptionsByAircraft((m) => ({ ...m, [ac.id]: assumptions }));
    setWarehouseBaselineByAircraft((m) => ({
      ...m,
      [ac.id]: warehouseBaselineByAircraft[id] ?? {},
    }));
    void loadWarehouseBaselineOnly(ac.id);
    const srcOwners = ownersByAircraft[id] ?? profileFromLegacyAssumptions(src);
    setOwnersByAircraft((m) => ({
      ...m,
      [ac.id]: normalizeProfilesForCount(srcOwners.length, srcOwners).map((p, i) => ({
        ...p,
        displayName: i === 0 ? `${p.displayName} (copy)` : p.displayName,
      })),
    }));
    setAllocationModeByAircraft((m) => ({
      ...m,
      [ac.id]: allocationModeByAircraft[id] ?? "hybrid",
    }));
    setSelectedId(ac.id);
    scheduleOwnersPersist(ac.id);
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this aircraft from the proposal?")) return;
    const res = await fetch(`/api/proposals/${data.id}/aircraft/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? "Could not remove aircraft");
      return;
    }
    setAircraft((list) => list.filter((a) => a.id !== id));
    setAssumptionsByAircraft((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    setWarehouseBaselineByAircraft((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    setOwnersByAircraft((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    setAllocationModeByAircraft((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    setSelectedId(json.selectedAircraftId ?? aircraft.find((a) => a.id !== id)?.id ?? null);
    if (portalPin) setNeedsRepublish(true);
  }

  function setPreviewTabMessage(tab: Window | null, message: string) {
    if (!tab || tab.closed) return;
    try {
      tab.document.title = "Atlas — Preview";
      tab.document.body.innerHTML = `<p style="margin:0;padding:2rem;font-family:system-ui,sans-serif;color:#334155">${message}</p>`;
    } catch {
      // Ignore if the browser blocks writing to the placeholder tab.
    }
  }

  function navigatePreviewTab(tab: Window | null, url: string) {
    if (tab && !tab.closed) {
      tab.location.replace(url);
      return true;
    }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    return opened != null;
  }

  async function handlePreviewPortal() {
    if (previewDisabled) return;

    const previewTab = window.open("about:blank", "_blank");
    setPreviewTabMessage(previewTab, "Saving your changes…");
    setPreviewLoading(true);
    try {
      if (selectedId) {
        markAircraftDirty(selectedId);
      }
      const saved = await flushPersist();
      if (!saved) {
        previewTab?.close();
        alert("Could not save your latest changes. Fix any save errors and try preview again.");
        return;
      }

      setPreviewTabMessage(previewTab, "Opening preview…");

      let slug = previewSlug;
      if (!slug) {
        let res: Response;
        try {
          res = await fetch(`/api/proposals/${data.id}/portal/draft`, { method: "POST" });
        } catch {
          previewTab?.close();
          alert("Could not reach the server. Check your connection and try preview again.");
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.slug) {
          previewTab?.close();
          alert(json.error ?? "Could not open preview");
          return;
        }
        slug = json.slug as string;
        setPortal({
          slug,
          active: false,
          portalUrl: json.portalUrl ?? null,
        });
      }

      const aircraftQs =
        selectedId != null
          ? `&aircraft=${encodeURIComponent(selectedId)}`
          : "";
      const previewUrl = `${window.location.origin}/${slug}/experience/pro-forma?draft=1${aircraftQs}&_t=${Date.now()}`;
      const opened = navigatePreviewTab(previewTab, previewUrl);
      if (!opened) {
        alert(
          "Your browser blocked the preview tab. Allow popups for this site and try again."
        );
      }
    } catch {
      previewTab?.close();
      alert("Could not open preview. Please try again.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handlePublish(republishing = false) {
    if (
      !confirm(
        republishing
          ? "Republish this prospect portal? Clients will see your latest workspace changes."
          : "Publish this prospect portal? Clients will receive a new access code on first publish."
      )
    ) {
      return;
    }
    setPublishLoading(true);
    try {
      const res = await fetch(`/api/proposals/${data.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(republishing ? { republish: true } : {}),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? (republishing ? "Republish failed" : "Publish failed"));
        return;
      }
      if (!republishing) {
        setPortal({
          slug: json.slug,
          active: true,
          portalUrl: json.portalUrl,
        });
        if (json.pin) {
          setPortalPin(json.pin);
          alert(`Published. Access code: ${json.pin}`);
        }
      } else {
        setNeedsRepublish(false);
        alert(PROSPECT_PORTAL_UPDATED_MESSAGE);
      }
      if (json.publishedAt) {
        setLastPublishedAt(json.publishedAt);
      }
    } finally {
      setPublishLoading(false);
    }
  }

  const portalSlug = portal?.active ? portal.slug : null;
  const previewSlug = portal?.slug ?? null;
  const portalActive = !!portal?.active;

  async function handleSetPortalActive(active: boolean) {
    if (!active) {
      if (
        !confirm(
          "Take down this proposal? Clients with the link will no longer be able to open it. " +
            "The deal stays in your pipeline and nothing is deleted — you can restore it anytime."
        )
      ) {
        return;
      }
    } else if (
      !confirm(
        "Restore this prospect portal? Clients will see the last published version — not your current draft — until you republish."
      )
    ) {
      return;
    }
    setPublishLoading(true);
    try {
      const res = await fetch(`/api/proposals/${data.id}/portal/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "Could not update portal visibility");
        return;
      }
      setPortal((p) => (p ? { ...p, active } : p));
    } finally {
      setPublishLoading(false);
    }
  }

  async function handleProposalNameChange(name: string) {
    if (isArchived) return;
    setProposalName(name);
    await fetch(`/api/proposals/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalName: name }),
    });
    markNeedsRepublish();
  }

  async function handleArchive() {
    setArchiveLoading(true);
    try {
      const res = await fetch(`/api/proposals/${data.id}/archive`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "Archive failed");
        return;
      }
      router.push(ROUTES.aircraftManagement.pipeline);
      router.refresh();
    } finally {
      setArchiveLoading(false);
    }
  }

  async function handleRestore() {
    setArchiveLoading(true);
    try {
      const res = await fetch(`/api/proposals/${data.id}/restore`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "Restore failed");
        return;
      }
      setDeletedAt(null);
      router.refresh();
    } finally {
      setArchiveLoading(false);
    }
  }

  function portalPresentationFor(ac: AircraftListItem): PortalPresentationState {
    const highlights = ac.portalSpecHighlights ?? [];
    return {
      clientSummary: ac.clientSummary ?? "",
      portalImageUrl: ac.portalImageUrl ?? "",
      portalVideoUrl: ac.portalVideoUrl ?? "",
      portalSpecHighlights: highlights.length > 0 ? [...highlights, ""] : [""],
    };
  }

  function handlePortalPresentationSaved(acId: string, next: PortalPresentationState) {
    setAircraft((prev) =>
      prev.map((ac) =>
        ac.id === acId
          ? {
              ...ac,
              clientSummary: next.clientSummary || null,
              portalImageUrl: next.portalImageUrl || null,
              portalVideoUrl: next.portalVideoUrl || null,
              portalSpecHighlights: next.portalSpecHighlights.filter((s) => s.trim()),
            }
          : ac
      )
    );
    markNeedsRepublish();
  }

  const listItems: AircraftListItem[] = aircraft.map((ac) => ({
    ...ac,
    assumptions: assumptionsByAircraft[ac.id] ?? ac.assumptions,
  }));

  return (
    <div className="flex h-full flex-col">
      <WorkspaceLayout
        proposalId={data.id}
        proposalName={proposalName}
        status={data.status}
        onProposalNameChange={handleProposalNameChange}
        aircraft={listItems}
        selectedId={selectedId}
        onSelectAircraft={(id) => void handleSelect(id)}
        onAddAircraft={() => setAddModalOpen(true)}
        onRemoveAircraft={(id) => void handleRemove(id)}
        onDuplicateAircraft={(id) => void handleDuplicate(id)}
        onRefreshWarehouseData={(id) => void handleRefreshWarehouseData(id)}
        onToggleIncluded={handleToggleIncluded}
        assumptionsByAircraft={assumptionsByAircraft}
        prospect={prospect}
        currentManager={currentManager}
        assignedToId={assignedToId}
        assignedToName={assignedToName}
        atlasUsers={data.atlasUsers}
        onProspectSave={handleProspectSave}
        prospectSaveState={prospectSaveState}
        saveLabel={saveLabel}
        deletedAt={deletedAt}
        archiveLoading={archiveLoading}
        onArchive={handleArchive}
        onRestore={handleRestore}
        currentUserId={data.currentUserId}
        currentUserName={data.currentUserName}
        initialComments={data.initialComments}
        ownerBar={null}
        footer={
          isArchived ? null : (
          <WorkspaceProposalFooter
            portalSlug={previewSlug}
            portalUrl={portal?.portalUrl ?? null}
            portalPin={portalPin}
            portalActive={portalActive}
            publishLoading={publishLoading}
            needsRepublish={needsRepublish}
            lastPublishedAt={lastPublishedAt}
            isAdmin={isAdmin}
            hasSelectedAircraft={!!selected}
            previewLoading={previewLoading}
            previewDisabled={previewDisabled}
            previewDisabledReason={previewDisabledReason}
            onPreview={() => void handlePreviewPortal()}
            onPublish={(republish) => void handlePublish(republish)}
            onTakeDown={() => void handleSetPortalActive(false)}
            onRestorePortal={() => void handleSetPortalActive(true)}
            onRegeneratePin={() => void handleRegeneratePin()}
            onEditPresentation={() => setPortalPresentationOpen(true)}
            onOpenDesigner={() => router.push(ROUTES.aircraftManagement.proposalDesignView(data.id))}
          />
          )
        }
      >
        {selected ? (
          <AircraftTabsPanel
            key={selected.id}
            proposalId={data.id}
            aircraftId={selected.id}
            assumptions={selectedAssumptions}
            warehouseDefaults={warehouseBaselineByAircraft[selected.id] ?? {}}
            onAssumptionsChange={setAssumptionsMap}
            ownerProfiles={selectedOwners}
            allocationMode={selectedAllocationMode}
            onOwnerProfilesChange={(profiles) =>
              applyOwnerChanges(selected.id, profiles, selectedAllocationMode)
            }
            onAllocationModeChange={(mode) =>
              applyOwnerChanges(selected.id, selectedOwners, mode)
            }
            onApplySetupDefaults={(patch, instancePatch) =>
              applySetupDefaults(selected.id, patch, instancePatch)
            }
            onWarehouseDefaultsSeeded={(defaults) =>
              seedWarehouseBaseline(selected.id, defaults)
            }
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-atlas-muted">
            Add an aircraft to begin configuration.
          </div>
        )}
      </WorkspaceLayout>

      <AddAircraftModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={handleAddAircraft}
      />

      {selected ? (
        <PortalPresentationDialog
          open={portalPresentationOpen}
          onOpenChange={setPortalPresentationOpen}
          proposalId={data.id}
          sections={sections as ExperienceSectionRow[]}
          onSectionsChange={setSections}
          onExperienceSaved={() => markNeedsRepublish()}
        />
      ) : null}
    </div>
  );
}
