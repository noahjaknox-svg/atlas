"use client";

import { useState } from "react";

type Initial = {
  jetinsightConfigured: boolean;
  source: {
    name: string;
    lastSyncedAt: string | null;
    lastSyncStatus: string | null;
    pollIntervalMinutes: number;
  } | null;
  emptyLegSync: {
    lastCharterSyncAt: string | null;
    lastCharterSyncStatus: string | null;
    lastCharterSyncStatsJson: unknown;
  } | null;
};

export function CharterSettingsClient({ initial }: { initial: Initial }) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState(initial.emptyLegSync?.lastCharterSyncStatsJson ?? null);
  const [lastSyncAt, setLastSyncAt] = useState(initial.emptyLegSync?.lastCharterSyncAt ?? null);
  const [lastStatus, setLastStatus] = useState(initial.emptyLegSync?.lastCharterSyncStatus ?? null);

  async function syncNow() {
    setSyncing(true);
    setMessage("");
    try {
      const res = await fetch("/api/schedule/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Sync failed");
        setLastStatus(`error: ${json.error ?? "failed"}`);
      } else {
        setMessage("Sync complete");
        setStats(json.emptyLegs ?? null);
        setLastSyncAt(new Date().toISOString());
        setLastStatus("ok");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const emptyStats =
    stats && typeof stats === "object"
      ? (stats as {
          emptyLegsCreated?: number;
          emptyLegsUpdated?: number;
          emptyLegsHistoried?: number;
          placementsCreated?: number;
          warnings?: string[];
        })
      : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-atlas-border bg-atlas-surface p-4">
        <h2 className="font-serif text-lg">JetInsight schedule sync</h2>
        <p className="mt-1 text-sm text-atlas-muted">
          Syncs schedule events, then processes empty leg inventory, availability, history, and
          public list placements.
        </p>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-atlas-muted">Configured</dt>
            <dd>{initial.jetinsightConfigured ? "Yes" : "No — set JETINSIGHT_ICS_URL"}</dd>
          </div>
          {initial.source && (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-atlas-muted">Source</dt>
                <dd>{initial.source.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-atlas-muted">Poll interval</dt>
                <dd>{initial.source.pollIntervalMinutes} minutes</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-atlas-muted">Schedule last sync</dt>
                <dd>
                  {initial.source.lastSyncedAt
                    ? new Date(initial.source.lastSyncedAt).toLocaleString()
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-atlas-muted">Schedule status</dt>
                <dd>{initial.source.lastSyncStatus ?? "—"}</dd>
              </div>
            </>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-atlas-muted">Empty legs last sync</dt>
            <dd>{lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-atlas-muted">Empty legs status</dt>
            <dd>{lastStatus ?? "—"}</dd>
          </div>
        </dl>

        {emptyStats && (
          <ul className="mt-4 space-y-1 text-sm text-atlas-muted">
            <li>Empty legs created: {emptyStats.emptyLegsCreated ?? 0}</li>
            <li>Empty legs updated: {emptyStats.emptyLegsUpdated ?? 0}</li>
            <li>Moved to history: {emptyStats.emptyLegsHistoried ?? 0}</li>
            <li>Placements created: {emptyStats.placementsCreated ?? 0}</li>
            {(emptyStats.warnings?.length ?? 0) > 0 && (
              <li>Warnings: {emptyStats.warnings!.join("; ")}</li>
            )}
          </ul>
        )}

        <button
          type="button"
          disabled={syncing || !initial.jetinsightConfigured}
          onClick={() => void syncNow()}
          className="mt-4 rounded bg-atlas-accent px-4 py-2 text-sm text-white hover:bg-atlas-accent/90 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync Now"}
        </button>
        {message ? <p className="mt-2 text-sm text-atlas-muted">{message}</p> : null}
      </div>
    </div>
  );
}
