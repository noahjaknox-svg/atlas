"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearDataHubFilters } from "@/lib/data-hub-filters";
import { ROUTES } from "@/lib/routes";
import type { CrewOperatingData } from "@/lib/crew/types";
import { parseOperatingJson } from "@/lib/crew/types";
import type { CrewSyncPolicy } from "@/lib/crew/performance-model";

type TypeRow = {
  id: string;
  code: string;
  manufacturer: string;
  model: string;
  afmStatus?: "complete" | "partial" | "missing";
  derivedAfmNotes?: string | null;
};

type FleetRow = {
  id: string;
  tailNumber: string;
  aircraftTypeCode: string;
  operating: CrewOperatingData;
};

type PerfRow = {
  id: string;
  aircraftTypeCode: string;
  metric: string;
};

type Gap = {
  id: string;
  label: string;
  href: string;
};

function sparseOperating(op: CrewOperatingData): boolean {
  return op.basicEmptyWeightLb <= 0 || op.mtowLb <= 0 || op.burnRateLbPerHr <= 0;
}

function afmDotClass(status?: string) {
  if (status === "complete") return "bg-emerald-500";
  if (status === "partial") return "bg-amber-500";
  return "bg-atlas-muted/50";
}

export function CrewStatusPanel() {
  const router = useRouter();
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [fleet, setFleet] = useState<FleetRow[]>([]);
  const [perf, setPerf] = useState<PerfRow[]>([]);
  const [policy, setPolicy] = useState<CrewSyncPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [importMsg, setImportMsg] = useState("");
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, f, p, pol] = await Promise.all([
        fetch("/api/data/crew-types").then((r) => r.json()),
        fetch("/api/data/crew-fleet").then((r) => r.json()),
        fetch("/api/data/crew-performance").then((r) => r.json()),
        fetch("/api/data/crew-policy").then((r) => r.json()),
      ]);
      if (t.rows) setTypes(t.rows);
      if (f.rows) setFleet(f.rows);
      if (p.rows) setPerf(p.rows);
      if (pol.policy) setPolicy(pol.policy);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const gaps = useMemo(() => {
    const next: Gap[] = [];
    for (const t of types) {
      const code = (t.code ?? "").trim();
      if (!code) {
        next.push({
          id: `type-code-${t.id}`,
          label: `${t.manufacturer} ${t.model} — missing Crew type code`,
          href: `${ROUTES.dataWarehouse.data}?tab=aircraft&typeId=${t.id}&section=General`,
        });
      }
      if (t.afmStatus !== "complete") {
        next.push({
          id: `type-afm-${t.id}`,
          label: `${code || t.model} — AFM ${t.afmStatus ?? "missing"}`,
          href: `${ROUTES.dataWarehouse.data}?tab=aircraft&typeId=${t.id}&section=AFM`,
        });
      }
    }
    for (const row of fleet) {
      const op = parseOperatingJson(row.operating);
      if (sparseOperating(op)) {
        next.push({
          id: `tail-op-${row.id}`,
          label: `${row.tailNumber} — incomplete operating data`,
          href: `${ROUTES.dataWarehouse.data}?tab=tails&tailId=${row.id}&section=Operating`,
        });
      }
    }
    if (fleet.length === 0) {
      next.push({
        id: "no-fleet",
        label: "No fleet tails registered for Crew sync",
        href: `${ROUTES.dataWarehouse.data}?tab=tails`,
      });
    }
    return next;
  }, [types, fleet]);

  const completeAfm = types.filter((t) => t.afmStatus === "complete").length;
  const healthOk = gaps.length === 0 && types.length > 0;

  async function runImport() {
    setImportMsg("Importing POH seed…");
    const res = await fetch("/api/data/crew-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useBundled: true }),
    });
    const json = await res.json();
    setImportMsg(res.ok ? json.message : json.error ?? "Import failed");
    if (res.ok) void load();
  }

  function go(href: string) {
    router.replace(href);
    setExpanded(true);
  }

  const summary = loading
    ? "Checking Crew connection…"
    : healthOk
      ? "Connected — no gaps detected"
      : `${gaps.length} gap${gaps.length === 1 ? "" : "s"} for Crew sync`;

  return (
    <div className="shrink-0 border-t border-atlas-accent/25 bg-atlas-surface/70">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-atlas-border/20"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              loading ? "bg-atlas-muted animate-pulse" : healthOk ? "bg-emerald-500" : "bg-amber-500"
            }`}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-atlas-accent/80">
              PrismJet Crew
            </p>
            <p className="truncate text-sm text-atlas-text">{summary}</p>
          </div>
        </div>
        <span className="shrink-0 text-xs text-atlas-muted">{expanded ? "Hide" : "Details"}</span>
      </button>

      {expanded ? (
        <div className="atlas-scroll max-h-[min(40vh,22rem)] space-y-4 overflow-y-auto border-t border-atlas-border/60 px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded border border-atlas-border/70 bg-atlas-bg/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-atlas-muted">Types</p>
              <p className="mt-0.5 text-sm text-atlas-text">
                {types.length} · {completeAfm} AFM complete
              </p>
            </div>
            <div className="rounded border border-atlas-border/70 bg-atlas-bg/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-atlas-muted">Fleet</p>
              <p className="mt-0.5 text-sm text-atlas-text">{fleet.length} tails</p>
            </div>
            <div className="rounded border border-atlas-border/70 bg-atlas-bg/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-atlas-muted">Performance grids</p>
              <p className="mt-0.5 text-sm text-atlas-text">{perf.length} uploaded</p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-atlas-muted">
              Sync pushes
            </p>
            <ul className="grid gap-1 text-sm text-atlas-text/90 sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${types.length ? "bg-emerald-500" : "bg-atlas-muted/40"}`} />
                Aircraft types ({types.length})
              </li>
              <li className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${fleet.length ? "bg-emerald-500" : "bg-atlas-muted/40"}`} />
                Fleet tails + operating ({fleet.length})
              </li>
              <li className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${perf.length ? "bg-emerald-500" : "bg-atlas-muted/40"}`} />
                AFM performance grids ({perf.length})
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Airports / timezones / slopes
              </li>
              <li className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${policy ? "bg-emerald-500" : "bg-atlas-muted/40"}`} />
                Org policy thresholds
              </li>
            </ul>
          </div>

          {gaps.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-atlas-muted">
                Gaps
              </p>
              <ul className="space-y-1">
                {gaps.slice(0, 8).map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => go(g.href)}
                      className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm text-atlas-text/90 transition-colors hover:bg-atlas-border/30"
                    >
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${afmDotClass("partial")}`} />
                      <span>{g.label}</span>
                    </button>
                  </li>
                ))}
                {gaps.length > 8 ? (
                  <li className="px-2 text-xs text-atlas-muted">+{gaps.length - 8} more</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-atlas-border/50 pt-3">
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() =>
                router.replace(
                  `${ROUTES.dataWarehouse.data}?${clearDataHubFilters("general").toString()}`
                )
              }
            >
              Org policy
            </Button>
            <Button type="button" variant="secondary" className="text-xs" onClick={() => void runImport()}>
              Load POH seed
            </Button>
            <Button type="button" variant="ghost" className="text-xs" onClick={() => void load()}>
              Refresh
            </Button>
            {importMsg ? <span className="text-xs text-atlas-muted">{importMsg}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
