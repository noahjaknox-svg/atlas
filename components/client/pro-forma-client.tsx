"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn, parseFormattedNumber } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/money-input";
import { HoursInput } from "@/components/ui/hours-input";
import { ClientProFormaStatement, type ClientProFormaStatementHandle } from "@/components/client/client-proforma-statement";
import { ProFormaMetricsRow } from "@/components/client/experience/v2/pro-forma-hero";
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

const proFormaSegmentGroup = "flex shrink-0 rounded-lg border border-white/15 p-0.5";
const proFormaSegmentBtn =
  "rounded-md px-3 py-1 text-xs font-medium transition-colors sm:px-4 sm:py-1.5 text-white/60 hover:bg-white/5 hover:text-white";
const proFormaSegmentBtnActive = "bg-atlas-accent text-[#0B0F1A] hover:bg-atlas-accent hover:text-[#0B0F1A]";

function totalProformaHours(hours: number[]): number {
  return hours.reduce((s, h) => s + (Number.isFinite(h) && h >= 0 ? h : 0), 0);
}

export type ProFormaLiveMetrics = {
  netAnnualCost: number;
  costPerOwnerHour: number;
  charterRevenueOffset: number;
};

export function ProFormaClient({
  slug,
  initial,
  initialAircraftId,
  embedded = false,
  experiencePath = true,
  slide = false,
  hideVisualSummary = false,
  splitScroll = false,
  onMetricsChange,
  className,
  pageTitle,
  pageIntro,
}: {
  slug: string;
  initial: ClientProFormaData;
  initialAircraftId?: string | null;
  embedded?: boolean;
  experiencePath?: boolean;
  slide?: boolean;
  hideVisualSummary?: boolean;
  splitScroll?: boolean;
  onMetricsChange?: (metrics: ProFormaLiveMetrics) => void;
  className?: string;
  pageTitle?: string;
  pageIntro?: string;
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
  const statementRef = useRef<ClientProFormaStatementHandle>(null);

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

  const metrics = useMemo(() => {
    if (localCalc) {
      return {
        netAnnualCost: localCalc.metrics.netAnnualCost,
        costPerOwnerHour: localCalc.metrics.costPerOwnerHour,
        charterRevenueOffset: localCalc.metrics.charterRevenueOffset,
      };
    }
    return {
      netAnnualCost: snapshot.proForma.netAnnualCost,
      costPerOwnerHour: snapshot.proForma.costPerOwnerHour,
      charterRevenueOffset: snapshot.proForma.totalRevenue ?? 0,
    };
  }, [localCalc, snapshot.proForma]);

  useEffect(() => {
    onMetricsChange?.(metrics);
  }, [metrics, onMetricsChange]);

  const periodToggle = (
    <div className={proFormaSegmentGroup}>
      {(["annual", "monthly"] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => setPeriod(p)}
          className={cn(
            proFormaSegmentBtn,
            "capitalize",
            period === p && proFormaSegmentBtnActive
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );

  const statementToolbar = splitScroll ? (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <div className={proFormaSegmentGroup}>
        <button
          type="button"
          onClick={() => statementRef.current?.expandAll()}
          className={cn(proFormaSegmentBtn, "uppercase tracking-wide")}
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={() => statementRef.current?.collapseAll()}
          className={cn(proFormaSegmentBtn, "uppercase tracking-wide")}
        >
          Collapse all
        </button>
      </div>
      {periodToggle}
    </div>
  ) : null;

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
      {splitScroll && pageTitle ? (
        <header className="space-y-2 border-b border-white/10 pb-3">
          <h1 className="font-serif text-xl leading-tight text-white sm:text-2xl">
            {pageTitle}
          </h1>
          {pageIntro ? (
            <p className="text-xs leading-relaxed text-white/65 sm:text-sm">{pageIntro}</p>
          ) : null}
        </header>
      ) : null}
      {embedded && !splitScroll ? (
        <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">Your assumptions</p>
      ) : null}
      {splitScroll ? (
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
      {splitScroll ? (
        <ProFormaMetricsRow
          netAnnualCost={metrics.netAnnualCost}
          costPerOwnerHour={metrics.costPerOwnerHour}
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

  const proFormaPanel = splitScroll ? (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {statementToolbar}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-0.5 [scrollbar-gutter:stable]">
        <ClientProFormaStatement
          ref={statementRef}
          rows={statementRows}
          period={period}
          compact={slide}
          collapsible
          defaultExpanded
          hideToolbar
        />
      </div>
    </div>
  ) : (
    <div className={cn(slide ? "flex flex-col gap-4" : "space-y-6")}>
      {embedded && slide ? (
        <>
          <ProFormaMetricsRow
            netAnnualCost={metrics.netAnnualCost}
            costPerOwnerHour={metrics.costPerOwnerHour}
          />
          <div className="flex items-center justify-end gap-3">{periodToggle}</div>
        </>
      ) : null}
      {!hideVisualSummary ? (
        <ProFormaVisualSummary
          lineItems={lineItemsForViz}
          period={period}
          onPeriodChange={setPeriod}
          compact={slide}
        />
      ) : null}
      <ClientProFormaStatement rows={statementRows} period={period} compact={slide} />
    </div>
  );

  return (
    <div
      className={cn(
        "text-white",
        splitScroll && "flex min-h-0 flex-1 flex-col overflow-hidden",
        !splitScroll && embedded && (slide ? "space-y-4" : "space-y-8"),
        !splitScroll && !embedded && "space-y-10",
        className
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
            splitScroll
              ? "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:grid lg:grid-cols-[minmax(260px,340px)_1fr] lg:items-stretch lg:gap-8"
              : "grid items-start gap-6 lg:grid-cols-[minmax(260px,340px)_1fr] lg:gap-8 xl:gap-10",
            slide && !splitScroll && "gap-5 lg:gap-8",
            aircraftLoading && "opacity-70 transition-opacity"
          )}
        >
          <div className={cn(splitScroll && "shrink-0 lg:overflow-visible")}>
            {inputsPanel}
          </div>
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
