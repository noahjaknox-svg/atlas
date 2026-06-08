"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Status = {
  eiaConfigured: boolean;
  iflightConfigured: boolean;
  latestFuel: {
    pricePerGallon: number;
    effectiveDate: string;
    fetchedAt: string;
    indexName: string;
  } | null;
  fboCount: number;
  fboWithPrices: number;
};

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ok ? "bg-atlas-success/15 text-atlas-success" : "bg-atlas-border/40 text-atlas-muted"
      }`}
    >
      {label}
    </span>
  );
}

export function IntegrationsClient({ initial }: { initial: Status }) {
  const [fuel, setFuel] = useState(initial.latestFuel);
  const [fboWithPrices, setFboWithPrices] = useState(initial.fboWithPrices);
  const [syncMsg, setSyncMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function syncEia() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/data/fuel/sync", { method: "POST" });
      const json = await res.json();
      setSyncMsg(json.message ?? (res.ok ? "Sync complete" : "Sync failed"));
      if (res.ok && json.indexPrice != null) {
        setFuel({
          pricePerGallon: json.indexPrice,
          effectiveDate: json.effectiveDate ?? new Date().toISOString().slice(0, 10),
          fetchedAt: new Date().toISOString(),
          indexName: "EIA US Kerosene-Type Jet Fuel (EPJK)",
        });
        if (typeof json.fboUpdated === "number") {
          setFboWithPrices((n) => n + json.fboUpdated);
        }
      }
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href="/settings" className="text-sm text-atlas-accent hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 font-serif text-2xl">Integrations</h1>
        <p className="mt-1 text-sm text-atlas-muted">
          API keys are configured via environment variables (Vercel / <code>.env.local</code>).
          This page shows connection status and manual sync triggers.
        </p>
      </div>

      <section className="rounded-lg border border-atlas-border bg-atlas-surface/30 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">EIA Open Data — Jet fuel index</h2>
            <p className="mt-1 text-sm text-atlas-muted">
              Powers the Fuel Prices tab reference index and backfills missing FBO Jet-A prices.
            </p>
          </div>
          <StatusBadge
            ok={initial.eiaConfigured}
            label={initial.eiaConfigured ? "Configured" : "Not configured"}
          />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-atlas-muted">Env variable</dt>
            <dd className="font-mono text-xs">EIA_API_KEY</dd>
          </div>
          {fuel ? (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-atlas-muted">Latest index</dt>
                <dd className="font-mono">${fuel.pricePerGallon.toFixed(2)}/gal</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-atlas-muted">Effective</dt>
                <dd>{fuel.effectiveDate}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-atlas-muted">Last fetched</dt>
                <dd>{new Date(fuel.fetchedAt).toLocaleString()}</dd>
              </div>
            </>
          ) : (
            <p className="text-atlas-muted">No index loaded yet.</p>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-atlas-muted">FBO rows with prices</dt>
            <dd>
              {fboWithPrices} / {initial.fboCount}
            </dd>
          </div>
        </dl>
        <Button
          type="button"
          className="mt-4"
          disabled={syncing || !initial.eiaConfigured}
          onClick={() => void syncEia()}
        >
          {syncing ? "Syncing…" : "Sync fuel from EIA"}
        </Button>
        {syncMsg ? <p className="mt-2 text-sm text-atlas-muted">{syncMsg}</p> : null}
      </section>

      <section className="rounded-lg border border-atlas-border bg-atlas-surface/30 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">iFlightPlanner</h2>
            <p className="mt-1 text-sm text-atlas-muted">Optional live FBO fuel feed (future).</p>
          </div>
          <StatusBadge
            ok={initial.iflightConfigured}
            label={initial.iflightConfigured ? "Configured" : "Not configured"}
          />
        </div>
        <p className="mt-3 text-sm text-atlas-muted">
          Set <code className="font-mono text-xs">IFLIGHTPLANNER_API_KEY</code> when ready. Manual
          FBO edits with override enabled are never overwritten.
        </p>
      </section>
    </div>
  );
}
