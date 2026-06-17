"use client";

import type { MultiLegMatchReasoning } from "@/lib/charter/types";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

export interface StoredMatch {
  id: string;
  tailNumber: string;
  fleetAircraftId: string | null;
  aircraftType: string | null;
  maxPassengers: number | null;
  score: number;
  rank: number;
  recommended: boolean;
  reasoning: MultiLegMatchReasoning;
}

export function MatchResultsPanel({
  matches,
  requestId,
  loading,
  error,
}: {
  matches: StoredMatch[];
  requestId: string | null;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-atlas-border bg-atlas-surface p-6">
        <p className="text-sm text-atlas-muted">Finding available aircraft…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!requestId) return null;

  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-atlas-border bg-atlas-surface p-6">
        <h2 className="font-serif text-lg">No available aircraft</h2>
        <p className="mt-1 text-sm text-atlas-muted">
          No tails matched this routing against the current schedule. Try different dates or
          check the{" "}
          <a href={ROUTES.charter.schedule} className="text-atlas-accent hover:underline">
            schedule board
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg">Aircraft matches</h2>
          <p className="text-sm text-atlas-muted">
            Ranked by schedule fit — request saved as{" "}
            <span className="font-mono text-xs">{requestId.slice(0, 8)}</span>
          </p>
        </div>
        <a
          href={`/charter/trips?id=${requestId}`}
          className="text-sm text-atlas-accent hover:underline"
        >
          View in trips →
        </a>
      </div>

      <ul className="space-y-3">
        {matches.map((m) => (
          <li
            key={m.id}
            className={cn(
              "rounded-lg border bg-atlas-surface p-4",
              m.recommended
                ? "border-atlas-accent/50 ring-1 ring-atlas-accent/20"
                : "border-atlas-border"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-medium">{m.tailNumber}</span>
                  {m.recommended && (
                    <span className="rounded bg-atlas-accent/15 px-2 py-0.5 text-xs font-medium text-atlas-accent">
                      Recommended
                    </span>
                  )}
                  <span className="text-xs text-atlas-muted">#{m.rank}</span>
                </div>
                {m.aircraftType && (
                  <p className="mt-0.5 text-sm text-atlas-muted">{m.aircraftType}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-mono text-xl text-atlas-accent">{m.score}</p>
                <p className="text-xs text-atlas-muted">match score</p>
              </div>
            </div>

            <MatchReasoningDetails reasoning={m.reasoning} maxPassengers={m.maxPassengers} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatchReasoningDetails({
  reasoning,
  maxPassengers,
}: {
  reasoning: MultiLegMatchReasoning;
  maxPassengers: number | null;
}) {
  return (
    <div className="mt-3 space-y-2 border-t border-atlas-border/60 pt-3">
      {maxPassengers != null && (
        <p className="text-xs text-atlas-muted">
          Capacity: {maxPassengers} pax
          {!reasoning.capacityFit && (
            <span className="ml-2 text-amber-400">— over capacity</span>
          )}
        </p>
      )}
      {reasoning.legs.map((leg) => (
        <div key={leg.legIndex} className="text-xs text-atlas-muted">
          <span className="font-medium text-atlas-text">
            Leg {leg.legIndex + 1}: {leg.depIcao} → {leg.arrIcao}
          </span>
          <ul className="mt-1 list-inside list-disc space-y-0.5 pl-1">
            {leg.locationFit ? (
              <li className="text-emerald-400/90">At departure airport</li>
            ) : leg.repositionRequired ? (
              <li className="text-amber-400">
                Reposition required: {leg.repositionFrom ?? leg.tailLocation} → {leg.depIcao}
              </li>
            ) : (
              <li>
                Tail at {leg.tailLocation ?? "unknown"} (needs {leg.depIcao})
              </li>
            )}
            {leg.hardBlockOverlap && (
              <li className="text-red-400">Hard block overlaps window</li>
            )}
            {leg.softHoldOverlap && (
              <li className="text-amber-400">Soft hold — confirm with scheduling</li>
            )}
            {leg.repoBoost && <li className="text-emerald-400/90">Repo leg aligns</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}
