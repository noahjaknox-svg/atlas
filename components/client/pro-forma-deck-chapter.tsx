"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AircraftSnapshotEntry } from "@/lib/portal-aircraft-types";
import { buildClientProFormaSummary } from "@/lib/client-proforma-summary";
import { ClientProFormaStatement } from "@/components/client/client-proforma-statement";

function proFormaHref(slug: string, aircraftId: string) {
  if (!aircraftId || aircraftId === "legacy-primary") {
    return `/${slug}/pro-forma`;
  }
  return `/${slug}/pro-forma?aircraft=${aircraftId}`;
}

export function ProFormaDeckChapter({
  slug,
  aircraftList,
  introCopy,
  active,
  CountUp,
}: {
  slug: string;
  aircraftList: AircraftSnapshotEntry[];
  introCopy?: string | null;
  active: boolean;
  CountUp: React.ComponentType<{
    value: number;
    format: (n: number) => string;
    active: boolean;
  }>;
}) {
  const [selectedId, setSelectedId] = useState(aircraftList[0]?.id ?? "");

  const selectedEntry = aircraftList.find((a) => a.id === selectedId) ?? aircraftList[0];
  const summary = useMemo(
    () => (selectedEntry ? buildClientProFormaSummary(selectedEntry) : null),
    [selectedEntry]
  );

  const showTabs = aircraftList.length > 1;

  if (!summary) return null;

  return (
    <div className="max-w-4xl motion-safe:animate-[fadeUp_0.5s_ease-out]">
      <p className="text-xs uppercase tracking-[0.3em] text-atlas-accent">Financial outlook</p>
      <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Pro Forma</h2>
      {!showTabs && summary.aircraftLabel ? (
        <p className="mt-2 text-white/60">{summary.aircraftLabel}</p>
      ) : null}

      {introCopy ? (
        <p className="mt-4 max-w-2xl whitespace-pre-wrap text-base leading-relaxed text-white/75">
          {introCopy}
        </p>
      ) : (
        <p className="mt-3 max-w-lg text-white/65">
          Your ownership economics based on PrismJet assumptions. Open the full Pro Forma to adjust
          aircraft value and owner hours live.
        </p>
      )}

      {showTabs ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {aircraftList.map((ac) => (
            <button
              key={ac.id}
              type="button"
              onClick={() => setSelectedId(ac.id)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm transition-colors",
                selectedId === ac.id
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Est. annual cost"
          value={
            <CountUp
              value={summary.metrics.netAnnualCost}
              format={(n) => formatCurrency(n)}
              active={active}
            />
          }
        />
        <MetricTile
          label="Monthly equivalent"
          value={
            <CountUp
              value={summary.metrics.netMonthlyCost}
              format={(n) => formatCurrency(n)}
              active={active}
            />
          }
        />
        <MetricTile
          label="Cost per hour"
          value={
            <CountUp
              value={summary.metrics.costPerOwnerHour}
              format={(n) => formatCurrency(n)}
              active={active}
            />
          }
        />
        <MetricTile
          label="Charter revenue offset"
          value={
            <CountUp
              value={summary.metrics.charterRevenueOffset}
              format={(n) => formatCurrency(n)}
              active={active}
            />
          }
        />
      </div>

      <ClientProFormaStatement
        className="mt-8"
        rows={summary.statementRows}
        period="annual"
        compact
        collapsible
      />

      <Link
        href={proFormaHref(slug, summary.aircraftId)}
        className="mt-8 inline-flex rounded-lg bg-atlas-accent px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#0a0d14] transition-colors hover:bg-atlas-accent-hover"
      >
        Open full Pro Forma
      </Link>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/5 p-4 backdrop-blur">
      <p className="text-[10px] uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-2 font-mono text-xl tabular-nums">{value}</p>
    </div>
  );
}
