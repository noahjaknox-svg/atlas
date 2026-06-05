"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClientProFormaStatement } from "@/components/client/client-proforma-statement";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";

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
}

const inputClass =
  "mt-1.5 w-full rounded border border-white/20 bg-white/10 px-3 py-2.5 font-mono text-sm text-white backdrop-blur focus:border-atlas-accent focus:outline-none focus:ring-1 focus:ring-atlas-accent/30";

export function ProFormaClient({
  slug,
  initial,
  initialAircraftId,
  embedded = false,
  experiencePath = true,
}: {
  slug: string;
  initial: ClientProFormaData;
  initialAircraftId?: string | null;
  /** Hide duplicate page chrome when rendered inside Experience hero. */
  embedded?: boolean;
  /** Use /experience/pro-forma URLs for aircraft query updates. */
  experiencePath?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const [selectedAircraftId, setSelectedAircraftId] = useState(
    initialAircraftId ?? initial.aircraft.id ?? initial.aircraftList[0]?.id ?? ""
  );
  const [aircraftValue, setAircraftValue] = useState(initial.editableFields.aircraftValue.value);
  const [ownerHours, setOwnerHours] = useState(initial.editableFields.ownerAnnualHours.value);
  const [data, setData] = useState(initial);
  const [baseline, setBaseline] = useState({
    aircraftValue: initial.baseMetrics.aircraftValue,
    ownerHours: initial.baseMetrics.ownerHours,
  });

  const showAircraftSelector = initial.aircraftList.length > 1;
  const skipInitialRecalc = useRef(true);
  const userEditedRef = useRef(false);

  const recalculate = useCallback(
    async (options?: { persist?: boolean }) => {
      const res = await fetch(`/api/portal/${slug}/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aircraftValue,
          ownerHours,
          aircraftInstanceId: selectedAircraftId || undefined,
          persistScenario: options?.persist === true,
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as ClientProFormaData;
        setData(updated);
        setBaseline({
          aircraftValue: updated.baseMetrics.aircraftValue,
          ownerHours: updated.baseMetrics.ownerHours,
        });
      }
    },
    [slug, aircraftValue, ownerHours, selectedAircraftId]
  );

  useEffect(() => {
    if (skipInitialRecalc.current) {
      skipInitialRecalc.current = false;
      return;
    }
    const t = setTimeout(() => {
      void recalculate({ persist: userEditedRef.current });
    }, 500);
    return () => clearTimeout(t);
  }, [recalculate]);

  function selectAircraft(id: string) {
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
  }

  function restore() {
    userEditedRef.current = true;
    setAircraftValue(baseline.aircraftValue);
    setOwnerHours(baseline.ownerHours);
  }

  return (
    <div className="space-y-10 text-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {!embedded ? (
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">Financial outlook</p>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl">Pro Forma</h1>
            {data.aircraft?.label ? (
              <p className="mt-2 text-white/60">{data.aircraft.label}</p>
            ) : null}
          </div>
        ) : data.aircraft?.label ? (
          <p className="text-sm text-white/60">{data.aircraft.label}</p>
        ) : (
          <span />
        )}
        <div className="flex rounded-lg border border-white/20 bg-white/5 p-1 backdrop-blur">
          {(["annual", "monthly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-4 py-2 text-sm capitalize transition-colors",
                period === p
                  ? "bg-atlas-accent text-[#0a0d14]"
                  : "text-white/60 hover:text-white"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {showAircraftSelector ? (
        <div className="flex flex-wrap gap-2">
          {initial.aircraftList.map((ac) => (
            <button
              key={ac.id}
              type="button"
              onClick={() => selectAircraft(ac.id)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm transition-colors",
                selectedAircraftId === ac.id
                  ? "border-atlas-accent bg-atlas-accent/15 text-atlas-accent"
                  : "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
              )}
            >
              {ac.label}
              {ac.tailNumber ? (
                <span className="ml-2 text-white/45">{ac.tailNumber}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {!embedded ? (
        <p className="max-w-2xl text-white/70">
          Explore annual and monthly ownership economics. Adjust aircraft value and owner hours to
          model scenarios — updates live.
        </p>
      ) : null}

      <div className="grid max-w-xl gap-6 sm:grid-cols-2">
        <label className="block text-sm text-white/70">
          Aircraft value
          <input
            type="number"
            value={aircraftValue}
            onChange={(e) => {
              userEditedRef.current = true;
              setAircraftValue(Number(e.target.value));
            }}
            className={inputClass}
          />
        </label>
        <label className="block text-sm text-white/70">
          Owner annual hours
          <input
            type="number"
            value={ownerHours}
            onChange={(e) => {
              userEditedRef.current = true;
              setOwnerHours(Number(e.target.value));
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

      <ClientProFormaStatement rows={data.statementRows} period={period} />
    </div>
  );
}
