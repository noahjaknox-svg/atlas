"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Status = {
  eiaConfigured: boolean;
  iflightConfigured: boolean;
  jetinsightConfigured: boolean;
  jetinsightSource: {
    name: string;
    lastSyncedAt: string | null;
    lastSyncStatus: string | null;
  } | null;
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
  const [scheduleSyncMsg, setScheduleSyncMsg] = useState("");
  const [scheduleSyncing, setScheduleSyncing] = useState(false);
  const [jetinsightSource, setJetinsightSource] = useState(initial.jetinsightSource);

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

  async function syncJetInsight() {
    setScheduleSyncing(true);
    setScheduleSyncMsg("");
    try {
      const res = await fetch("/api/schedule/sync", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      setScheduleSyncMsg(
        res.ok
          ? json.message ?? "Sync complete"
          : `Sync failed: ${json.error ?? json.message ?? res.statusText}`
      );
      if (res.ok) {
        setJetinsightSource((prev) =>
          prev
            ? {
                ...prev,
                lastSyncedAt: new Date().toISOString(),
                lastSyncStatus: "ok",
              }
            : prev
        );
      }
    } finally {
      setScheduleSyncing(false);
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
            <h2 className="font-medium">JetInsight — ICS schedule feed</h2>
            <p className="mt-1 text-sm text-atlas-muted">
              Pulls the fleet calendar export into Atlas for availability Kanban and aircraft
              matching.
            </p>
          </div>
          <StatusBadge
            ok={initial.jetinsightConfigured}
            label={initial.jetinsightConfigured ? "Configured" : "Not configured"}
          />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-atlas-muted">Env variable</dt>
            <dd className="font-mono text-xs">JETINSIGHT_ICS_URL</dd>
          </div>
          {jetinsightSource ? (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-atlas-muted">Source</dt>
                <dd>{jetinsightSource.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-atlas-muted">Last synced</dt>
                <dd>
                  {jetinsightSource.lastSyncedAt
                    ? new Date(jetinsightSource.lastSyncedAt).toLocaleString()
                    : "Never"}
                </dd>
              </div>
              {jetinsightSource.lastSyncStatus ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-atlas-muted">Status</dt>
                  <dd>{jetinsightSource.lastSyncStatus}</dd>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-atlas-muted">No schedule source synced yet.</p>
          )}
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={scheduleSyncing || !initial.jetinsightConfigured}
            onClick={() => void syncJetInsight()}
          >
            {scheduleSyncing ? "Syncing…" : "Sync JetInsight schedule"}
          </Button>
          <Link href="/schedule" className="text-sm text-atlas-accent hover:underline">
            Open schedule board →
          </Link>
        </div>
        {scheduleSyncMsg ? (
          <p className="mt-2 text-sm text-atlas-muted">{scheduleSyncMsg}</p>
        ) : null}
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
