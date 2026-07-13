"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScheduleSyncProgressBar } from "@/components/internal/schedule-sync-progress";
import { ROUTES } from "@/lib/routes";
import { runScheduleSyncStream } from "@/lib/schedule/sync-client";

type Status = {
  iflightConfigured: boolean;
  jetinsightConfigured: boolean;
  jetinsightSource: {
    name: string;
    lastSyncedAt: string | null;
    lastSyncStatus: string | null;
  } | null;
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
  const [scheduleSyncMsg, setScheduleSyncMsg] = useState("");
  const [scheduleSyncing, setScheduleSyncing] = useState(false);
  const [jetinsightSource, setJetinsightSource] = useState(initial.jetinsightSource);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressDetail, setProgressDetail] = useState("");
  const [progressError, setProgressError] = useState<string | null>(null);

  async function syncJetInsight() {
    setScheduleSyncing(true);
    setScheduleSyncMsg("");
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
      setScheduleSyncMsg(result.message || "Sync complete");
      setProgressPercent(100);
      setProgressDetail("Sync complete");
      setJetinsightSource((prev) =>
        prev
          ? {
              ...prev,
              lastSyncedAt: new Date().toISOString(),
              lastSyncStatus: "ok",
            }
          : {
              name: "PrismJet JetInsight",
              lastSyncedAt: new Date().toISOString(),
              lastSyncStatus: "ok",
            }
      );
    } catch (e) {
      const err = e instanceof Error ? e.message : "Sync failed";
      setScheduleSyncMsg(err);
      setProgressError(err);
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
          <Link href={ROUTES.charter.schedule} className="text-sm text-atlas-accent hover:underline">
            Open schedule board →
          </Link>
          <Link
            href={ROUTES.charter.settings}
            className="text-sm text-atlas-accent hover:underline"
          >
            Auto-sync settings →
          </Link>
        </div>
        {(scheduleSyncing || progressPercent > 0 || progressError) && (
          <ScheduleSyncProgressBar
            className="mt-3"
            percent={progressPercent}
            detail={progressDetail}
            error={progressError}
          />
        )}
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
