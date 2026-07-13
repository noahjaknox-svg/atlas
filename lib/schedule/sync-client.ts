import type { SyncProgress, SyncProgressPhase } from "@/lib/schedule/sync-poll";

export type ScheduleSyncEmptyLegStats = {
  emptyLegsCreated: number;
  emptyLegsUpdated: number;
  emptyLegsHistoried: number;
  placementsCreated: number;
  warnings: string[];
};

export type ScheduleSyncStreamResult = {
  message: string;
  sourceId: string;
  eventsUpserted: number;
  eventsDeleted: number;
  unmatchedTails: string[];
  emptyLegs: ScheduleSyncEmptyLegStats;
};

export type ScheduleSyncProgressState = {
  phase: SyncProgressPhase | null;
  percent: number;
  detail: string;
};

export async function runScheduleSyncStream(opts?: {
  onProgress?: (p: SyncProgress) => void;
}): Promise<ScheduleSyncStreamResult> {
  const res = await fetch("/api/schedule/sync?stream=1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
    },
    body: JSON.stringify({ stream: true }),
  });

  if (!res.ok) {
    let message = `Sync failed (${res.status})`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (!res.body) {
    throw new Error("No response body from sync");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ScheduleSyncStreamResult | null = null;
  let streamError: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let event: {
        type?: string;
        phase?: SyncProgressPhase;
        percent?: number;
        detail?: string;
        error?: string;
        message?: string;
        sourceId?: string;
        eventsUpserted?: number;
        eventsDeleted?: number;
        unmatchedTails?: string[];
        emptyLegs?: ScheduleSyncEmptyLegStats;
      };
      try {
        event = JSON.parse(trimmed);
      } catch {
        continue;
      }

      if (event.type === "progress" && event.phase != null && event.percent != null) {
        opts?.onProgress?.({
          phase: event.phase,
          percent: event.percent,
          detail: event.detail ?? "",
        });
      } else if (event.type === "result") {
        result = {
          message: event.message ?? "Schedule sync complete",
          sourceId: event.sourceId!,
          eventsUpserted: event.eventsUpserted ?? 0,
          eventsDeleted: event.eventsDeleted ?? 0,
          unmatchedTails: event.unmatchedTails ?? [],
          emptyLegs: event.emptyLegs ?? {
            emptyLegsCreated: 0,
            emptyLegsUpdated: 0,
            emptyLegsHistoried: 0,
            placementsCreated: 0,
            warnings: [],
          },
        };
      } else if (event.type === "error") {
        streamError = event.error ?? "Sync failed";
      }
    }
  }

  if (streamError) throw new Error(streamError);
  if (!result) throw new Error("Sync ended without a result");
  return result;
}
