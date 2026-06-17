"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { CharterRequestStatus } from "@prisma/client";
import {
  MatchResultsPanel,
  type StoredMatch,
} from "@/components/internal/charter/match-results-panel";
import type { MultiLegMatchReasoning } from "@/lib/charter/types";

interface TripRow {
  id: string;
  status: CharterRequestStatus;
  tripType: string;
  source: string;
  routeSummary: string;
  paxCount: number | null;
  requestedDepartAt: string | null;
  clientName: string | null;
  createdAt: string;
  createdByName: string | null;
  recommendedTail: string | null;
  recommendedScore: number | null;
}

interface TripDetail {
  id: string;
  status: CharterRequestStatus;
  tripType: string;
  source: string;
  paxCount: number | null;
  clientName: string | null;
  notes: string | null;
  createdAt: string;
  legs: {
    legIndex: number;
    depIcao: string;
    arrIcao: string;
    departAt: string | null;
    timeTbd: boolean;
  }[];
  matches: {
    id: string;
    tailNumber: string;
    score: string | number;
    rank: number;
    recommended: boolean;
    reasoning: MultiLegMatchReasoning;
    fleetAircraft: {
      aircraftType: { manufacturer: string; model: string; maxPassengers: number | null };
    } | null;
  }[];
  inboundMessage: { subject: string; fromAddress: string } | null;
  createdBy: { name: string } | null;
}

const STATUS_FILTERS: { value: CharterRequestStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "parsed", label: "Parsed" },
  { value: "matched", label: "Matched" },
  { value: "quoted", label: "Quoted" },
  { value: "sent_to_jetinsight", label: "Sent to JetInsight" },
];

export function TripsDashboard() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [statusFilter, setStatusFilter] = useState<CharterRequestStatus | "">("");
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [detail, setDetail] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/charter/requests${q}`);
    const json = await res.json();
    setLoading(false);
    if (res.ok) setTrips(json);
  }, [statusFilter]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    const res = await fetch(`/api/charter/requests/${id}`);
    const json = await res.json();
    setDetailLoading(false);
    if (res.ok) setDetail(json);
  }, []);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  async function rematch() {
    if (!selectedId) return;
    setActionLoading(true);
    await fetch(`/api/charter/requests/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rematch" }),
    });
    await loadDetail(selectedId);
    await loadTrips();
    setActionLoading(false);
  }

  async function markQuoted() {
    if (!selectedId) return;
    setActionLoading(true);
    await fetch(`/api/charter/requests/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "quoted" }),
    });
    await loadDetail(selectedId);
    await loadTrips();
    setActionLoading(false);
  }

  const detailMatches: StoredMatch[] =
    detail?.matches.map((m) => ({
      id: m.id,
      tailNumber: m.tailNumber,
      fleetAircraftId: null,
      aircraftType: m.fleetAircraft
        ? `${m.fleetAircraft.aircraftType.manufacturer} ${m.fleetAircraft.aircraftType.model}`
        : null,
      maxPassengers: m.fleetAircraft?.aircraftType.maxPassengers ?? null,
      score: Number(m.score),
      rank: m.rank,
      recommended: m.recommended,
      reasoning: m.reasoning,
    })) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                statusFilter === f.value
                  ? "border-atlas-accent bg-atlas-accent/15 text-atlas-accent"
                  : "border-atlas-border text-atlas-muted hover:text-atlas-text"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-atlas-border">
          <table className="w-full text-sm">
            <thead className="border-b border-atlas-border bg-atlas-surface/80 text-left text-xs text-atlas-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Route</th>
                <th className="px-3 py-2 font-medium">Depart</th>
                <th className="px-3 py-2 font-medium">Pax</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Best tail</th>
                <th className="px-3 py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-atlas-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && trips.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-atlas-muted">
                    No trips yet.{" "}
                    <a href="/charter/find" className="text-atlas-accent hover:underline">
                      Find aircraft
                    </a>
                  </td>
                </tr>
              )}
              {trips.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "cursor-pointer border-b border-atlas-border/50 hover:bg-atlas-surface/50",
                    selectedId === t.id && "bg-atlas-accent/5"
                  )}
                >
                  <td className="px-3 py-2.5 font-mono text-xs">{t.routeSummary}</td>
                  <td className="px-3 py-2.5 text-atlas-muted">
                    {t.requestedDepartAt
                      ? new Date(t.requestedDepartAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5">{t.paxCount ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {t.recommendedTail ?? "—"}
                    {t.recommendedScore != null && (
                      <span className="ml-1 text-atlas-muted">({t.recommendedScore})</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs capitalize text-atlas-muted">{t.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="space-y-4">
        {!selectedId && (
          <p className="text-sm text-atlas-muted">Select a trip to view details</p>
        )}
        {selectedId && detailLoading && (
          <p className="text-sm text-atlas-muted">Loading trip…</p>
        )}
        {detail && (
          <div className="space-y-4 rounded-lg border border-atlas-border bg-atlas-surface p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif text-lg">Trip detail</h2>
                <StatusBadge status={detail.status} />
              </div>
              <p className="mt-1 text-xs text-atlas-muted">
                {detail.tripType.replace("_", " ")} · {detail.source}
                {detail.createdBy && ` · ${detail.createdBy.name}`}
              </p>
            </div>

            {detail.inboundMessage && (
              <div className="rounded border border-atlas-border/60 p-2 text-xs">
                <p className="font-medium">{detail.inboundMessage.subject}</p>
                <p className="text-atlas-muted">{detail.inboundMessage.fromAddress}</p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide text-atlas-muted">
                Itinerary
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {detail.legs.map((leg) => (
                  <li key={leg.legIndex} className="font-mono">
                    {leg.depIcao} → {leg.arrIcao}
                    {leg.departAt && (
                      <span className="ml-2 font-sans text-atlas-muted">
                        {new Date(leg.departAt).toLocaleString()}
                        {leg.timeTbd && " (TBD)"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void rematch()}
                className="rounded border border-atlas-border px-3 py-1.5 text-xs hover:border-atlas-accent hover:text-atlas-accent disabled:opacity-50"
              >
                Re-run match
              </button>
              {detail.status === "matched" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void markQuoted()}
                  className="rounded bg-atlas-accent px-3 py-1.5 text-xs text-white hover:bg-atlas-accent/90 disabled:opacity-50"
                >
                  Mark quoted
                </button>
              )}
            </div>

            {detail.matches.length > 0 && (
              <MatchResultsPanel
                matches={detailMatches}
                requestId={detail.id}
              />
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function StatusBadge({ status }: { status: CharterRequestStatus }) {
  const colors: Record<CharterRequestStatus, string> = {
    new: "bg-slate-500/20 text-slate-300",
    parsed: "bg-blue-500/20 text-blue-300",
    matched: "bg-emerald-500/20 text-emerald-300",
    quoted: "bg-amber-500/20 text-amber-300",
    sent_to_jetinsight: "bg-purple-500/20 text-purple-300",
  };
  return (
    <span className={cn("rounded px-2 py-0.5 text-xs capitalize", colors[status])}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
