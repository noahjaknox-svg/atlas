/** UI + cron mapping for ScheduleSource.pollIntervalMinutes */
export const SYNC_POLL_OPTIONS = [
  { value: 0, label: "Never" },
  { value: 60, label: "Hourly" },
  { value: 1440, label: "Daily" },
] as const;

export type SyncPollMinutes = (typeof SYNC_POLL_OPTIONS)[number]["value"];

export function normalizePollIntervalMinutes(n: number): SyncPollMinutes {
  if (n === 60) return 60;
  if (n === 1440) return 1440;
  return 0;
}

export function pollIntervalLabel(minutes: number): string {
  const normalized = normalizePollIntervalMinutes(minutes);
  return SYNC_POLL_OPTIONS.find((o) => o.value === normalized)?.label ?? "Never";
}

/** Whether an automatic (cron) sync should run now. Manual sync always runs. */
export function shouldRunScheduledSync(source: {
  pollIntervalMinutes: number;
  lastSyncedAt: Date | null;
  enabled: boolean;
}): { run: boolean; reason?: string } {
  if (!source.enabled) return { run: false, reason: "disabled" };
  const interval = normalizePollIntervalMinutes(source.pollIntervalMinutes);
  if (interval === 0) return { run: false, reason: "never" };
  if (!source.lastSyncedAt) return { run: true };
  const elapsedMs = Date.now() - source.lastSyncedAt.getTime();
  const dueMs = interval * 60_000;
  if (elapsedMs < dueMs) {
    return { run: false, reason: "not_due" };
  }
  return { run: true };
}

export type SyncProgressPhase =
  | "fetch"
  | "parse"
  | "upsert"
  | "tombstone"
  | "empty_legs"
  | "done";

export type SyncProgress = {
  phase: SyncProgressPhase;
  percent: number;
  detail: string;
};
