"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn, parseFormattedNumber } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/money-input";
import { HoursInput } from "@/components/ui/hours-input";
import { ClientProFormaStatement } from "@/components/client/client-proforma-statement";
import { ProFormaVisualSummary } from "@/components/client/experience/pro-forma-visual-summary";
import { ProFormaUtilizationSummary } from "@/components/client/pro-forma-utilization-summary";
import type { ClientSnapshotView } from "@/lib/client-serializer";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";
import {
  computeWorkspaceProFormaForClient,
  resolveClientCrewSummary,
  stringsToAssumptionMap,
} from "@/lib/workspace-proforma-client";

type ClientProFormaData = ClientSnapshotView;

const inputClass =
  "mt-1.5 w-full rounded border border-white/20 bg-white/10 px-3 py-2.5 font-mono text-sm text-white backdrop-blur focus:border-atlas-accent focus:outline-none focus:ring-1 focus:ring-atlas-accent/30";

function totalProformaHours(hours: number[]): number {
  return hours.reduce((s, h) => s + (Number.isFinite(h) && h >= 0 ? h : 0), 0);
}

export function ProFormaClient({
  slug,
  initial,
  initialAircraftId,
  embedded = false,
  experiencePath = true,
  slide = false,
}: {
  slug: string;
  initial: ClientProFormaData;
  initialAircraftId?: string | null;
  embedded?: boolean;
  experiencePath?: boolean;
  slide?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const [snapshot, setSnapshot] = useState(initial);
  const [selectedAircraftId, setSelectedAircraftId] = useState(
    initialAircraftId ?? initial.aircraft.id ?? initial.aircraftList[0]?.id ?? ""
  );
  const [aircraftValue, setAircraftValue] = useState(
    String(initial.editableFields.aircraftValue.value)
  );
  const [proformaOwnerHours, setProformaOwnerHours] = useState<number[]>(
    initial.proformaOwnerHours ?? [initial.editableFields.ownerAnnualHours.value]
  );
  const [baseline, setBaseline] = useState({
    aircraftValue: initial.baseMetrics.aircraftValue,
    proformaOwnerHours:
      initial.baseProformaOwnerHours ??
      initial.proformaOwnerHours ??
      [initial.baseMetrics.ownerHours],
  });
  const [aircraftLoading, setAircraftLoading] = useState(false);

  const ownerProfiles: ProposalOwnerProfile[] = snapshot.ownerProfiles ?? [];
  const multiOwner = ownerProfiles.length > 1;
  const totalOwnerHours = useMemo(
    () => totalProformaHours(proformaOwnerHours),
    [proformaOwnerHours]
  );

  const calculationAssumptions = useMemo(
    () => snapshot.calculationAssumptions ?? {},
    [snapshot.calculationAssumptions]
  );
  const canComputeLocally = Object.keys(calculationAssumptions).length > 0;

  const showAircraftSelector = snapshot.aircraftList.length > 1;
  const userEditedRef = useRef(false);

  const applySnapshot = useCallback((next: ClientProFormaData, resetEdits = true) => {
    setSnapshot(next);
    setAircraftValue(String(next.editableFields.aircraftValue.value));
    setProformaOwnerHours(
      next.proformaOwnerHours ?? [next.editableFields.ownerAnnualHours.value]
    );
    setBaseline({
      aircraftValue: next.baseMetrics.aircraftValue,
      proformaOwnerHours:
        next.baseProformaOwnerHours ??
        next.proformaOwnerHours ??
        [next.baseMetrics.ownerHours],
    });
    if (resetEdits) userEditedRef.current = false;
  }, []);

  const loadAircraftData = useCallback(
    async (aircraftId: string) => {
      setAircraftLoading(true);
      try {
        const res = await fetch(`/api/portal/${slug}/scenario`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aircraftInstanceId: aircraftId,
            persistScenario: false,
          }),
        });
        if (res.ok) {
          applySnapshot((await res.json()) as ClientProFormaData);
        }
      } finally {
        setAircraftLoading(false);
      }
    },
    [slug, applySnapshot]
  );

  const prevInitialAircraftIdRef = useRef(initialAircraftId);

  useEffect(() => {
    if (initialAircraftId === prevInitialAircraftIdRef.current) return;
    prevInitialAircraftIdRef.current = initialAircraftId;
    const id =
      initialAircraftId ?? initial.aircraft.id ?? initial.aircraftList[0]?.id ?? "";
    setSelectedAircraftId(id);
    applySnapshot(initial);
  }, [initialAircraftId, initial, applySnapshot]);

  const parsedAircraftValue = useMemo(
    () => parseFloat(parseFormattedNumber(aircraftValue)) || 0,
    [aircraftValue]
  );

  const localCalc = useMemo(() => {
    if (!canComputeLocally) return null;
    return computeWorkspaceProFormaForClient(
      stringsToAssumptionMap(calculationAssumptions),
      {
        aircraftValue: parsedAircraftValue,
        proformaOwnerHours,
        ownerProfiles: ownerProfiles.length > 0 ? ownerProfiles : undefined,
        ownerHours: multiOwner ? undefined : totalOwnerHours,
      }
    );
  }, [
    canComputeLocally,
    calculationAssumptions,
    parsedAircraftValue,
    proformaOwnerHours,
    ownerProfiles,
    multiOwner,
    totalOwnerHours,
  ]);

  const statementRows: ProFormaStatementRow[] = useMemo(() => {
    if (!localCalc) return snapshot.statementRows;
    return localCalc.statementRows;
  }, [localCalc, snapshot.statementRows]);

  const crewSummary = useMemo(() => {
    if (localCalc) {
      return resolveClientCrewSummary(localCalc.calculationAssumptions, {
        ownerProfiles: ownerProfiles.length > 0 ? ownerProfiles : undefined,
      });
    }
    return snapshot.crewSummary;
  }, [localCalc, ownerProfiles, snapshot.crewSummary]);

  const lineItemsForViz = useMemo(() => {
    const fromRows = statementRows
      .filter((r) => r.kind === "line" && r.annual != null && Math.abs(r.annual) > 0)
      .map((r) => ({
        key: r.key,
        label: r.label,
        category:
          r.layout === "fixed"
            ? "fixed"
            : r.layout === "hourly_variable" || r.layout === "revenue"
              ? "variable"
              : "other",
        annual: Math.abs(r.annual!),
        monthly: Math.abs(r.annual!) / 12,
      }));
    return fromRows.length > 0 ? fromRows : snapshot.proForma.lineItems;
  }, [statementRows, snapshot.proForma.lineItems]);

  const scenarioPayload = useMemo(
    () => ({
      aircraftValue: parsedAircraftValue,
      proformaOwnerHours,
      ownerHours: totalOwnerHours,
      aircraftInstanceId: selectedAircraftId || undefined,
    }),
    [parsedAircraftValue, proformaOwnerHours, totalOwnerHours, selectedAircraftId]
  );

  const persistScenario = useCallback(async () => {
    await fetch(`/api/portal/${slug}/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...scenarioPayload,
        persistScenario: true,
      }),
    });
  }, [slug, scenarioPayload]);

  const fetchFromServer = useCallback(async () => {
    const res = await fetch(`/api/portal/${slug}/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...scenarioPayload,
        persistScenario: userEditedRef.current,
      }),
    });
    if (res.ok) {
      const updated = (await res.json()) as ClientProFormaData;
      applySnapshot(updated, false);
    }
  }, [slug, scenarioPayload, applySnapshot]);

  useEffect(() => {
    if (canComputeLocally) return;
    const t = setTimeout(() => void fetchFromServer(), 200);
    return () => clearTimeout(t);
  }, [canComputeLocally, fetchFromServer]);

  useEffect(() => {
    if (!userEditedRef.current) return;
    const t = setTimeout(() => void persistScenario(), 800);
    return () => clearTimeout(t);
  }, [persistScenario]);

  function selectAircraft(id: string) {
    if (id === selectedAircraftId) return;
    setSelectedAircraftId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id && id !== "legacy-primary") {
      params.set("aircraft", id);
    } else {
      params.delete("aircraft");
    }
    const base = experiencePath
      ? `/${slug}/experience/pro-forma`
      : `/${slug}/pro-forma`;
    router.replace(`${base}?${params.toString()}`, { scroll: false });
    void loadAircraftData(id);
  }

  function restore() {
    userEditedRef.current = true;
    setAircraftValue(String(baseline.aircraftValue));
    setProformaOwnerHours([...baseline.proformaOwnerHours]);
  }

  function patchOwnerHoursAtIndex(index: number, hours: number) {
    userEditedRef.current = true;
    setProformaOwnerHours((prev) => {
      const next = [...prev];
      next[index] = Math.max(0, hours);
      return next;
    });
  }

  const aircraftSelector = showAircraftSelector ? (
    <div className="flex flex-wrap gap-2">
      {snapshot.aircraftList.map((ac) => (
        <button
          key={ac.id}
          type="button"
          onClick={() => selectAircraft(ac.id)}
          disabled={aircraftLoading}
          className={cn(
            "rounded-lg border px-4 py-2 text-sm transition-colors",
            selectedAircraftId === ac.id
              ? "border-atlas-accent bg-atlas-accent/15 text-atlas-accent"
              : "border-white/20 text-white/70 hover:border-white/40 hover:text-white",
            aircraftLoading && "pointer-events-none opacity-60"
          )}
        >
          {ac.label}
          {ac.tailNumber ? (
            <span className="ml-2 text-white/45">{ac.tailNumber}</span>
          ) : null}
        </button>
      ))}
    </div>
  ) : null;

  const ownerHoursInputs = multiOwner ? (
    <div className="sm:col-span-2">
      <p className="text-sm text-white/70">Owner flight hours</p>
      <ul className="mt-3 space-y-3">
        {ownerProfiles.map((profile, index) => (
          <li
            key={profile.id ?? profile.sortOrder}
            className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0"
          >
            <span className="min-w-0 truncate text-sm text-white/80">
              {profile.displayName}
            </span>
            <HoursInput
              min={0}
              step={1}
              className={cn(inputClass, "mt-0 max-w-[8rem] shrink-0 text-center")}
              value={Number.isFinite(proformaOwnerHours[index])
                ? proformaOwnerHours[index]!
                : 0}
              onChange={(hours) => patchOwnerHoursAtIndex(index, hours)}
              aria-label={`${profile.displayName} flight hours`}
            />
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <label className="block text-sm text-white/70">
      Owner annual hours
      <HoursInput
        value={proformaOwnerHours[0] ?? totalOwnerHours}
        onChange={(hours) => patchOwnerHoursAtIndex(0, hours)}
        className={inputClass}
      />
    </label>
  );

  const inputsPanel = (
    <div className={cn(slide ? "space-y-3" : "space-y-6")}>
      {embedded ? (
        <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">Your assumptions</p>
      ) : null}
      {aircraftSelector}
      <div
        className={cn(
          "grid gap-4",
          embedded ? "grid-cols-1" : "max-w-xl sm:grid-cols-2",
          slide && "gap-3"
        )}
      >
        <label className="block text-sm text-white/70">
          Aircraft value
          <MoneyInput
            value={aircraftValue}
            onChange={(v) => {
              userEditedRef.current = true;
              setAircraftValue(v);
            }}
            className={inputClass}
          />
        </label>
        {ownerHoursInputs}
      </div>
      {crewSummary ? (
        <ProFormaUtilizationSummary
          summary={crewSummary}
          totalOwnerHours={totalOwnerHours}
          maxHours={crewSummary.maxAnnualUtilization}
          compact={slide}
        />
      ) : null}
      <button
        type="button"
        onClick={restore}
        className="text-sm text-atlas-accent hover:underline"
      >
        Restore to PrismJet assumptions
      </button>
    </div>
  );

  const proFormaPanel = (
    <div className={cn(slide ? "flex min-h-0 flex-col gap-3 overflow-hidden" : "space-y-6")}>
      <ProFormaVisualSummary
        lineItems={lineItemsForViz}
        period={period}
        onPeriodChange={setPeriod}
        compact={slide}
      />
      <div className={slide ? "min-h-0 flex-1 overflow-hidden" : undefined}>
        <ClientProFormaStatement rows={statementRows} period={period} compact={slide} />
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "text-white",
        embedded ? (slide ? "h-full" : "space-y-8") : "space-y-10"
      )}
    >
      {!embedded ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">Financial outlook</p>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl">Pro Forma</h1>
              {snapshot.aircraft?.label ? (
                <p className="mt-2 text-white/60">{snapshot.aircraft.label}</p>
              ) : null}
            </div>
            <div className="flex rounded-lg border border-white/20 bg-white/5 p-1 backdrop-blur">
              {(["annual", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm capitalize transition-colors",
                    period === p
                      ? "bg-atlas-accent text-[#0B0F1A]"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <p className="max-w-2xl text-white/70">
            Explore annual and monthly ownership economics. Adjust aircraft value and owner hours to
            model scenarios — crew and utilization update live.
          </p>
        </>
      ) : null}

      {embedded ? (
        <div
          className={cn(
            "grid items-start gap-6 lg:grid-cols-[minmax(240px,320px)_1fr] lg:gap-8 xl:gap-10",
            slide && "h-full min-h-0 items-stretch gap-4 lg:gap-6",
            aircraftLoading && "opacity-70 transition-opacity"
          )}
        >
          {inputsPanel}
          {proFormaPanel}
        </div>
      ) : (
        <>
          {inputsPanel}
          {proFormaPanel}
        </>
      )}
    </div>
  );
}
