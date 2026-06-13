"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn, parseFormattedNumber } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/money-input";
import { HoursInput } from "@/components/ui/hours-input";
import { ClientProFormaStatement } from "@/components/client/client-proforma-statement";
import { ProFormaVisualSummary } from "@/components/client/experience/pro-forma-visual-summary";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";
import {
  computeWorkspaceProFormaForClient,
  stringsToAssumptionMap,
} from "@/lib/workspace-proforma-client";

interface AircraftListOption {
  id: string;
  label: string;
  tailNumber: string | null;
  year: number | null;
  portalImageUrl: string | null;
}

interface ClientProFormaData {
  aircraft: {
    id: string;
    label: string;
  };
  aircraftList: AircraftListOption[];
  editableFields: {
    aircraftValue: { value: number };
    ownerAnnualHours: { value: number };
  };
  baseMetrics: {
    aircraftValue: number;
    ownerHours: number;
  };
  proForma: {
    netAnnualCost: number;
    netMonthlyCost: number;
    costPerOwnerHour: number;
    lineItems: Array<{ key: string; label: string; category: string; annual: number; monthly: number }>;
  };
  fixedCostBreakdown: Array<{ label: string; annual: number; monthly: number }>;
  statementRows: ProFormaStatementRow[];
  calculationAssumptions?: Record<string, string>;
}

const inputClass =
  "mt-1.5 w-full rounded border border-white/20 bg-white/10 px-3 py-2.5 font-mono text-sm text-white backdrop-blur focus:border-atlas-accent focus:outline-none focus:ring-1 focus:ring-atlas-accent/30";

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
  const [ownerHours, setOwnerHours] = useState(initial.editableFields.ownerAnnualHours.value);
  const [baseline, setBaseline] = useState({
    aircraftValue: initial.baseMetrics.aircraftValue,
    ownerHours: initial.baseMetrics.ownerHours,
  });
  const [aircraftLoading, setAircraftLoading] = useState(false);

  const calculationAssumptions = snapshot.calculationAssumptions ?? {};
  const canComputeLocally = Object.keys(calculationAssumptions).length > 0;

  const showAircraftSelector = snapshot.aircraftList.length > 1;
  const userEditedRef = useRef(false);

  const applySnapshot = useCallback((next: ClientProFormaData, resetEdits = true) => {
    setSnapshot(next);
    setAircraftValue(String(next.editableFields.aircraftValue.value));
    setOwnerHours(next.editableFields.ownerAnnualHours.value);
    setBaseline({
      aircraftValue: next.baseMetrics.aircraftValue,
      ownerHours: next.baseMetrics.ownerHours,
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

  const statementRows = useMemo(() => {
    if (!canComputeLocally) return snapshot.statementRows;
    const calc = computeWorkspaceProFormaForClient(
      stringsToAssumptionMap(calculationAssumptions),
      { aircraftValue: parsedAircraftValue, ownerHours }
    );
    return calc.statementRows;
  }, [
    canComputeLocally,
    calculationAssumptions,
    parsedAircraftValue,
    ownerHours,
    snapshot.statementRows,
  ]);

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

  const persistScenario = useCallback(async () => {
    await fetch(`/api/portal/${slug}/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aircraftValue: parsedAircraftValue,
        ownerHours,
        aircraftInstanceId: selectedAircraftId || undefined,
        persistScenario: true,
      }),
    });
  }, [slug, parsedAircraftValue, ownerHours, selectedAircraftId]);

  // Fallback server recalc when snapshot lacks calculation assumptions (legacy publishes).
  const fetchFromServer = useCallback(async () => {
    const res = await fetch(`/api/portal/${slug}/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aircraftValue: parsedAircraftValue,
        ownerHours,
        aircraftInstanceId: selectedAircraftId || undefined,
        persistScenario: userEditedRef.current,
      }),
    });
    if (res.ok) {
      const updated = (await res.json()) as ClientProFormaData;
      applySnapshot(updated, false);
    }
  }, [slug, parsedAircraftValue, ownerHours, selectedAircraftId, applySnapshot]);

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
    setOwnerHours(baseline.ownerHours);
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
        <label className="block text-sm text-white/70">
          Owner annual hours
          <HoursInput
            value={ownerHours}
            onChange={(hours) => {
              userEditedRef.current = true;
              setOwnerHours(hours);
            }}
            className={inputClass}
          />
        </label>
      </div>
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
            model scenarios — updates live.
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
