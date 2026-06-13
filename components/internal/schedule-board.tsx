"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import type { KanbanCard, KanbanColumnId } from "@/lib/schedule/types";
import { KANBAN_COLUMNS } from "@/lib/schedule/kanban-columns";
import { ScheduleColumn } from "@/components/internal/schedule-column";
import { Button } from "@/components/ui/button";

interface KanbanPayload {
  columns: { id: KanbanColumnId; label: string }[];
  rangeStart: string;
  rangeEnd: string;
  source: {
    id: string;
    name: string;
    lastSyncedAt: string | null;
    lastSyncStatus: string | null;
  } | null;
  fleet: { tailNumber: string; homeBase: string | null; typeCode: string }[];
  eventCount: number;
  board: Record<KanbanColumnId, KanbanCard[]>;
}

export function ScheduleBoard({
  initialData,
  isAdmin,
}: {
  initialData: KanbanPayload;
  isAdmin?: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [tailFilter, setTailFilter] = useState<string>("all");

  const refresh = useCallback(async (tails?: string) => {
    const params = new URLSearchParams();
    if (tails && tails !== "all") params.set("tails", tails);
    const res = await fetch(`/api/schedule/kanban?${params}`);
    if (res.ok) {
      const json = (await res.json()) as KanbanPayload;
      setData(json);
    }
  }, []);

  async function onTailFilterChange(value: string) {
    setTailFilter(value);
    await refresh(value);
  }

  async function syncNow() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/schedule/sync", { method: "POST" });
      const json = await res.json();
      setSyncMsg(json.message ?? (res.ok ? "Sync complete" : "Sync failed"));
      if (res.ok) await refresh(tailFilter);
    } finally {
      setSyncing(false);
    }
  }

  const columns = data.columns.length > 0 ? data.columns : KANBAN_COLUMNS;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={tailFilter}
          onChange={(e) => void onTailFilterChange(e.target.value)}
          className="rounded-md border border-atlas-border bg-atlas-surface px-3 py-1.5 text-sm text-atlas-text"
        >
          <option value="all">All tails</option>
          {data.fleet.map((f) => (
            <option key={f.tailNumber} value={f.tailNumber}>
              {f.tailNumber} ({f.typeCode})
            </option>
          ))}
        </select>

        <span className="text-sm text-atlas-muted">
          {format(new Date(data.rangeStart), "MMM d")} –{" "}
          {format(new Date(data.rangeEnd), "MMM d, yyyy")}
          <span className="ml-2 text-atlas-muted/70">· {data.eventCount} events</span>
        </span>

        {data.source?.lastSyncedAt && (
          <span className="text-xs text-atlas-muted/70">
            Last sync {format(new Date(data.source.lastSyncedAt), "MMM d HH:mm")}
            {data.source.lastSyncStatus ? ` (${data.source.lastSyncStatus})` : ""}
          </span>
        )}

        {isAdmin && (
          <Button type="button" size="sm" disabled={syncing} onClick={() => void syncNow()}>
            {syncing ? "Syncing…" : "Sync JetInsight"}
          </Button>
        )}
        {syncMsg && <span className="text-xs text-atlas-muted">{syncMsg}</span>}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <ScheduleColumn
            key={col.id}
            columnId={col.id}
            label={col.label}
            cards={data.board[col.id] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
