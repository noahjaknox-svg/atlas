"use client";

import { useState } from "react";
import { ScheduleSyncProgressBar } from "@/components/internal/schedule-sync-progress";
import { runScheduleSyncStream } from "@/lib/schedule/sync-client";
import {
  SYNC_POLL_OPTIONS,
  normalizePollIntervalMinutes,
  type SyncPollMinutes,
} from "@/lib/schedule/sync-poll";

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
  const [scheduleLastSync, setScheduleLastSync] = useState(initial.source?.lastSyncedAt ?? null);
  const [scheduleStatus, setScheduleStatus] = useState(initial.source?.lastSyncStatus ?? null);
  const [pollMinutes, setPollMinutes] = useState<SyncPollMinutes>(
    normalizePollIntervalMinutes(initial.source?.pollIntervalMinutes ?? 0)
  );
  const [pollSaving, setPollSaving] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressDetail, setProgressDetail] = useState("");
  const [progressError, setProgressError] = useState<string | null>(null);

  async function syncNow() {
    setSyncing(true);
    setMessage("");
    setProgressError(null);
    setProgressPercent(0);
    setProgressDetail("Starting sync…");
    try {
      const result = await runScheduleSyncStream({
        onProgress: (p) => {
          setProgressPercent(p.percent);
          setProgressDetail(p.detail);
        },
      });
      setMessage(result.message || "Sync complete");
      setStats(result.emptyLegs ?? null);
      setLastSyncAt(new Date().toISOString());
      setLastStatus("ok");
      setScheduleLastSync(new Date().toISOString());
      setScheduleStatus("ok");
      setProgressPercent(100);
      setProgressDetail("Sync complete");
    } catch (e) {
      const err = e instanceof Error ? e.message : "Sync failed";
      setMessage(err);
      setLastStatus(`error: ${err}`);
      setScheduleStatus(`error: ${err}`);
      setProgressError(err);
    } finally {
      setSyncing(false);
    }
  }

  async function onPollChange(value: string) {
    const next = normalizePollIntervalMinutes(Number(value));
    setPollMinutes(next);
    setPollSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/schedule/source", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollIntervalMinutes: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Failed to update auto-sync");
        return;
      }
      setMessage(json.message ?? "Auto-sync updated");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to update auto-sync");
    } finally {
      setPollSaving(false);
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
              <div className="flex items-center justify-between gap-4">
                <dt className="text-atlas-muted">Auto-sync</dt>
                <dd>
                  <select
                    value={pollMinutes}
                    disabled={pollSaving || !initial.jetinsightConfigured}
                    onChange={(e) => void onPollChange(e.target.value)}
                    className="rounded border border-atlas-border bg-atlas-bg px-2 py-1 text-sm"
                  >
                    {SYNC_POLL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-atlas-muted">Schedule last sync</dt>
                <dd>
                  {scheduleLastSync ? new Date(scheduleLastSync).toLocaleString() : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-atlas-muted">Schedule status</dt>
                <dd>{scheduleStatus ?? "—"}</dd>
              </div>
            </>
          )}
          {!initial.source && initial.jetinsightConfigured ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-atlas-muted">Auto-sync</dt>
              <dd>
                <select
                  value={pollMinutes}
                  disabled={pollSaving}
                  onChange={(e) => void onPollChange(e.target.value)}
                  className="rounded border border-atlas-border bg-atlas-bg px-2 py-1 text-sm"
                >
                  {SYNC_POLL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
          ) : null}
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
        {(syncing || progressPercent > 0 || progressError) && (
          <ScheduleSyncProgressBar
            className="mt-3"
            percent={progressPercent}
            detail={progressDetail}
            error={progressError}
          />
        )}
        {message ? <p className="mt-2 text-sm text-atlas-muted">{message}</p> : null}
        <p className="mt-3 text-xs text-atlas-muted">
          Auto-sync runs on an hourly check via Vercel Cron (<code className="font-mono">/api/cron/schedule-sync</code>).
          Choose Hourly or Daily above, and set <code className="font-mono">CRON_SECRET</code> (or{" "}
          <code className="font-mono">SCHEDULE_SYNC_SECRET</code>) in Vercel. Manual Sync Now always
          runs immediately.
        </p>
      </div>
    </div>
  );
}
