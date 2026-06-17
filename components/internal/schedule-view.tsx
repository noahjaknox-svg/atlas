"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import type { ScheduleTimelineData } from "@/lib/schedule/timeline-types";
import {
  SCHEDULE_VIEW_DAYS,
  scheduleRangeEnd,
  shiftScheduleRange,
  startOfUtcDay,
} from "@/lib/schedule/view-range";
import {
  getBrowserTimezone,
  type ScheduleTimeMode,
} from "@/lib/schedule/airport-timezones";
import { ScheduleTimeline } from "@/components/internal/schedule-timeline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScheduleSource {
  id: string;
  name: string;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
}

interface FleetTail {
  tailNumber: string;
  homeBase: string | null;
  typeCode: string;
}

export function ScheduleView({
  initialTimeline,
  initialSource,
  initialFleet,
  isAdmin,
}: {
  initialTimeline: ScheduleTimelineData;
  initialSource: ScheduleSource | null;
  initialFleet: FleetTail[];
  isAdmin?: boolean;
}) {
  const [timeline, setTimeline] = useState(initialTimeline);
  const [source, setSource] = useState<ScheduleSource | null>(initialSource);
  const [fleet, setFleet] = useState<FleetTail[]>(initialFleet);
  const [rangeStart, setRangeStart] = useState(() =>
    startOfUtcDay(new Date(initialTimeline.rangeStart))
  );
  const [syncing, setSyncing] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [tailFilter, setTailFilter] = useState("all");
  const [timeMode, setTimeMode] = useState<ScheduleTimeMode>("aircraft");
  const userTimezone = useMemo(() => getBrowserTimezone(), []);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const rangeEnd = scheduleRangeEnd(rangeStart);

  const fetchRange = useCallback(async (start: Date, tails: string) => {
    const end = scheduleRangeEnd(start);
    const params = new URLSearchParams();
    if (tails !== "all") params.set("tails", tails);
    params.set("start", start.toISOString());
    params.set("end", end.toISOString());
    params.set("days", String(SCHEDULE_VIEW_DAYS));

    const res = await fetch(`/api/schedule/timeline?${params}`);
    if (res.ok) {
      const json = await res.json();
      setTimeline(json.timeline as ScheduleTimelineData);
      if (json.source !== undefined) setSource(json.source as ScheduleSource | null);
      if (Array.isArray(json.fleet)) setFleet(json.fleet as FleetTail[]);
    }
  }, []);

  async function navigateTo(start: Date, tails = tailFilter) {
    setNavigating(true);
    setRangeStart(start);
    try {
      await fetchRange(start, tails);
    } finally {
      setNavigating(false);
    }
  }

  async function onTailFilterChange(value: string) {
    setTailFilter(value);
    setNavigating(true);
    try {
      await fetchRange(rangeStart, value);
    } finally {
      setNavigating(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/schedule/sync", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      setSyncMsg(
        res.ok
          ? json.message ?? "Sync complete"
          : `Sync failed: ${json.error ?? json.message ?? res.statusText}`
      );
      if (res.ok) await fetchRange(rangeStart, tailFilter);
    } finally {
      setSyncing(false);
    }
  }

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
  }

  const rangeLabel = `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`;

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            className="h-8 w-8 shrink-0 p-0"
            disabled={navigating}
            aria-label={`Previous ${SCHEDULE_VIEW_DAYS} days`}
            onClick={() => void navigateTo(shiftScheduleRange(rangeStart, -SCHEDULE_VIEW_DAYS))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8"
            disabled={navigating}
            onClick={() => void navigateTo(startOfUtcDay(new Date()))}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8 w-8 shrink-0 p-0"
            disabled={navigating}
            aria-label="Jump to date"
            onClick={openDatePicker}
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <input
            ref={dateInputRef}
            type="date"
            className="sr-only"
            value={format(rangeStart, "yyyy-MM-dd")}
            onChange={(e) => {
              if (e.target.value) {
                void navigateTo(startOfUtcDay(new Date(`${e.target.value}T12:00:00`)));
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className="h-8 w-8 shrink-0 p-0"
            disabled={navigating}
            aria-label={`Next ${SCHEDULE_VIEW_DAYS} days`}
            onClick={() => void navigateTo(shiftScheduleRange(rangeStart, SCHEDULE_VIEW_DAYS))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm font-medium text-atlas-text">{rangeLabel}</span>
        {navigating && <span className="text-xs text-atlas-muted">Loading…</span>}

        <select
          value={tailFilter}
          onChange={(e) => void onTailFilterChange(e.target.value)}
          className="rounded-md border border-atlas-border bg-atlas-surface px-3 py-1.5 text-sm text-atlas-text"
          disabled={navigating}
        >
          <option value="all">All tails</option>
          {fleet.map((f) => (
            <option key={f.tailNumber} value={f.tailNumber}>
              {f.tailNumber} ({f.typeCode})
            </option>
          ))}
        </select>

        <div className="flex rounded-md border border-atlas-border p-0.5">
          {(
            [
              { id: "aircraft" as const, label: "Aircraft local" },
              { id: "user" as const, label: "Your time" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTimeMode(opt.id)}
              className={cn(
                "rounded px-2.5 py-1 text-xs transition-colors",
                timeMode === opt.id
                  ? "bg-atlas-accent/15 text-atlas-accent"
                  : "text-atlas-muted hover:text-atlas-text"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {source?.lastSyncedAt && (
          <span className="text-xs text-atlas-muted/70">
            Last sync {format(new Date(source.lastSyncedAt), "MMM d HH:mm")}
          </span>
        )}

        {isAdmin && (
          <Button type="button" size="sm" disabled={syncing || navigating} onClick={() => void syncNow()}>
            {syncing ? "Syncing…" : "Sync JetInsight"}
          </Button>
        )}
        {syncMsg && <span className="text-xs text-atlas-muted">{syncMsg}</span>}
      </div>

      <div className={cn("min-h-0 flex-1", navigating && "pointer-events-none opacity-60")}>
        <ScheduleTimeline
          timeline={timeline}
          timeMode={timeMode}
          userTimezone={userTimezone}
        />
      </div>
    </div>
  );
}
