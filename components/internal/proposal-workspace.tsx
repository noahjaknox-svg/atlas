"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { type AircraftListItem } from "@/components/internal/workspace/aircraft-list-panel";
import { AircraftTabsPanel } from "@/components/internal/workspace/aircraft-tabs-panel";
import type { PortalPresentationState } from "@/components/internal/workspace/portal-presentation-panel";
import { PortalPresentationDialog } from "@/components/internal/workspace/portal-presentation-dialog";
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
import type { AssumptionMap } from "@/lib/assumptions";
import type { OwnerExpenseAllocationMode } from "@/lib/owner-expense-allocation";
import {
  mergeOwnerProfilesAfterPersist,
  normalizeProfilesForCount,
  profileFromLegacyAssumptions,
  syncOwnersIntoAssumptions,
  validateOwnerProfiles,
  type ProposalOwnerProfile,
} from "@/lib/proposal-owners";
import { mergeWithDerived } from "@/lib/aircraft-calculated-fields";
import {
  applyWarehouseDefaults,
  warehouseDefaultsBaseline,
} from "@/lib/warehouse-assumption-seed";
import { buildDefaultsQueryParams } from "@/lib/build-defaults-query";
import { needsWarehouseSeed } from "@/lib/needs-warehouse-seed";
import type { ProspectFormState, ProspectSavePayload } from "@/lib/workspace-sections";
import type { AtlasUserOption } from "@/components/internal/workspace/prospect-panel";
import { ROUTES } from "@/lib/routes";

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
  >(() =>
    Object.fromEntries(
      data.aircraft.map((a) => [
        a.id,
        warehouseDefaultsBaseline(mergeAssumptions(a.assumptions, a) as Record<string, string>),
      ])
    )
  );
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
  const [needsRepublish, setNeedsRepublish] = useState(false);
  const [proposalName, setProposalName] = useState(data.proposalName);
  const [portalPin, setPortalPin] = useState<string | null>(data.portalPin);
  const [ownersByAircraft, setOwnersByAircraft] = useState(data.ownersByAircraft);
  const [allocationModeByAircraft, setAllocationModeByAircraft] = useState(
    data.allocationModeByAircraft
  );
  const [sections, setSections] = useState(data.sections);
  const [deletedAt, setDeletedAt] = useState<string | null>(data.deletedAt ?? null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const ownersSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipOwnersSave = useRef(true);
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
  }

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scenarioSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSave = useRef(true);
  const dirtyAircraftRef = useRef(new Set<string>());
  const persistInFlight = useRef(false);
  const persistQueued = useRef(false);
  const assumptionsByAircraftRef = useRef(assumptionsByAircraft);

  useEffect(() => {
    assumptionsByAircraftRef.current = assumptionsByAircraft;
  }, [assumptionsByAircraft]);

  useEffect(() => {
    ownersByAircraftRef.current = ownersByAircraft;
  }, [ownersByAircraft]);

  function seedWarehouseBaseline(aircraftId: string, defaults: Record<string, string>) {
    setWarehouseBaselineByAircraft((prev) => ({
      ...prev,
      [aircraftId]: warehouseDefaultsBaseline(defaults),
    }));
  }

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

      dirtyAircraftRef.current.add(aircraftId);
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
    dirtyAircraftRef.current.add(aircraftId);
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
                  (instancePatch.proposedHomeBaseIcao as string) ?? a.proposedHomeBaseIcao,
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
      const revisionAtStart = ownersRevisionRef.current[aircraftId] ?? 0;
      const profiles = ownersByAircraftRef.current[aircraftId] ?? [];
      const mode = allocationModeByAircraft[aircraftId] ?? "hybrid";
      const map = assumptionsByAircraftRef.current[aircraftId] ?? {};
      const max = parseFloat(map.max_annual_utilization ?? "0") || 0;
      const validation = validateOwnerProfiles(profiles, max, profiles.length > 1);
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
      if (json.syncedAssumptions && applySavedValues) {
        setAssumptionsByAircraft((prev) => {
          const base = prev[aircraftId] ?? {};
          const synced = syncOwnersIntoAssumptions(base, json.profiles ?? profiles, mode);
          return {
            ...prev,
            [aircraftId]: mergeWithDerived({
              ...synced,
              ...json.syncedAssumptions,
            }),
          };
        });
      }
      if (portal?.active) setNeedsRepublish(true);
    },
    [data.id, allocationModeByAircraft, portal?.active]
  );

  function applyOwnerChanges(
    aircraftId: string,
    profiles: ProposalOwnerProfile[],
    mode: OwnerExpenseAllocationMode
  ) {
    ownersRevisionRef.current[aircraftId] =
      (ownersRevisionRef.current[aircraftId] ?? 0) + 1;
    setOwnersByAircraft((prev) => ({ ...prev, [aircraftId]: profiles }));
    setAllocationModeByAircraft((prev) => ({ ...prev, [aircraftId]: mode }));
    skipSave.current = true;
    setAssumptionsByAircraft((prev) => {
      const base = prev[aircraftId] ?? {};
      return {
        ...prev,
        [aircraftId]: mergeWithDerived(syncOwnersIntoAssumptions(base, profiles, mode)),
      };
    });
  }
  const isArchived = deletedAt != null;
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

  const persist = useCallback(async () => {
    if (isArchived) return;
    if (persistInFlight.current) {
      persistQueued.current = true;
      return;
    }

    const dirtyIds = Array.from(dirtyAircraftRef.current);
    if (dirtyIds.length === 0) return;

    persistInFlight.current = true;
    setSaveStatus("saving");
    try {
      const payload = dirtyIds.flatMap((acId) => {
        const map = assumptionsByAircraft[acId];
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
        dirtyAircraftRef.current.clear();
        setSaveStatus("saved");
        return;
      }

      const requests: Promise<Response>[] = [
        fetch(`/api/proposals/${data.id}/assumptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      ];

      for (const acId of dirtyIds) {
        const map = assumptionsByAircraft[acId];
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
      dirtyAircraftRef.current.clear();

      const results = await Promise.all(requests);
      if (results.some((r) => !r.ok)) throw new Error("save failed");

      setSaveStatus("saved");
      setLastSavedAt(new Date());
      if (portal?.active) setNeedsRepublish(true);
      if (selectedId) scheduleScenarioSync(selectedId);
    } catch {
      setSaveStatus("error");
    } finally {
      persistInFlight.current = false;
      if (persistQueued.current) {
        persistQueued.current = false;
        void persist();
      }
    }
  }, [
    data.id,
    assumptionsByAircraft,
    selectedId,
    clientEditable,
    portal?.active,
    scheduleScenarioSync,
    isArchived,
  ]);

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

  useEffect(() => {
    if (skipOwnersSave.current) {
      skipOwnersSave.current = false;
      return;
    }
    if (!selectedId) return;
    if (ownersSaveTimer.current) clearTimeout(ownersSaveTimer.current);
    ownersSaveTimer.current = setTimeout(() => void persistOwners(selectedId), 1200);
    return () => {
      if (ownersSaveTimer.current) clearTimeout(ownersSaveTimer.current);
    };
  }, [ownersByAircraft, allocationModeByAircraft, selectedId, persistOwners]);

  function setAssumption(name: string, value: string) {
    if (!selectedId) return;
    dirtyAircraftRef.current.add(selectedId);
    setAssumptionsByAircraft((prev) => {
      const base = syncUtilizationHours({ ...(prev[selectedId] ?? {}), [name]: value });
      return { ...prev, [selectedId]: mergeWithDerived(base) };
    });
  }

  function setAssumptionsMap(next: AssumptionMap) {
    if (!selectedId) return;
    dirtyAircraftRef.current.add(selectedId);
    setAssumptionsByAircraft((prev) => ({
      ...prev,
      [selectedId]: mergeWithDerived(syncUtilizationHours(next)),
    }));
    const owners = ownersByAircraft[selectedId];
    if (owners?.length === 1) {
      const hours = parseFloat(next.owner_annual_hours ?? "0") || 0;
      if (hours !== owners[0].annualFlightHours) {
        applyOwnerChanges(
          selectedId,
          [{ ...owners[0], annualFlightHours: hours }],
          allocationModeByAircraft[selectedId] ?? "hybrid"
        );
      }
    }
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
    const baseline = warehouseDefaultsBaseline(serverAssumptions);

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
    setWarehouseBaselineByAircraft((m) => ({ ...m, [ac.id]: baseline }));
    setOwnersByAircraft((m) => ({
      ...m,
      [ac.id]: profileFromLegacyAssumptions(assumptions),
    }));
    setAllocationModeByAircraft((m) => ({ ...m, [ac.id]: "hybrid" }));
    setSelectedId(ac.id);
    dirtyAircraftRef.current.add(ac.id);
  }

  async function handleRefreshWarehouseData(aircraftId: string) {
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
      [ac.id]: warehouseBaselineByAircraft[id] ?? warehouseDefaultsBaseline(assumptions),
    }));
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
    if (portal?.active) setNeedsRepublish(true);
  }

  async function handlePublish(republishing = false) {
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
        alert("Client portal updated with your latest changes.");
      }
    } finally {
      setPublishLoading(false);
    }
  }

  const portalSlug = portal?.active ? portal.slug : null;
  const previewSlug = portal?.slug ?? null;
  const portalActive = !!portal?.active;
  const portalExists = !!portal;

  async function handleSetPortalActive(active: boolean) {
    if (
      !active &&
      !confirm(
        "Take down this proposal? Clients with the link will no longer be able to open it. " +
          "The deal stays in your pipeline and nothing is deleted — you can restore it anytime."
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
            portalExists={portalExists}
            publishLoading={publishLoading}
            needsRepublish={needsRepublish}
            isAdmin={isAdmin}
            hasSelectedAircraft={!!selected}
            onPreview={() =>
              previewSlug &&
              window.open(`/${previewSlug}/experience/welcome?draft=1`, "_blank")
            }
            onPublish={() => void handlePublish(false)}
            onRepublish={() => void handlePublish(true)}
            onTakeDown={() => void handleSetPortalActive(false)}
            onRestorePortal={() => void handleSetPortalActive(true)}
            onRegeneratePin={() => void handleRegeneratePin()}
            onEditPresentation={() => setPortalPresentationOpen(true)}
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
          aircraftId={selected.id}
          initial={portalPresentationFor(selected)}
          onSaved={(next) => handlePortalPresentationSaved(selected.id, next)}
          sections={sections as ExperienceSectionRow[]}
          onSectionsChange={setSections}
          portalSlug={portalSlug}
          needsRepublish={needsRepublish}
          onExperienceSaved={() => setNeedsRepublish(true)}
        />
      ) : null}
    </div>
  );
}
