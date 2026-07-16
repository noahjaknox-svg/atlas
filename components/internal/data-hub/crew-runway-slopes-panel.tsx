"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RunwayRow = {
  id: string;
  runwayId: string | null;
  leIdent: string | null;
  heIdent: string | null;
  lengthFt: number | null;
  gradientPctVerified: number | null;
  gradientHighEndVerified: string | null;
  gradientPctEstimated: number | null;
  gradientHighEndEstimated: string | null;
};

type AirportInfo = {
  id: string;
  icao: string;
  name: string;
  municipality: string | null;
};

export function CrewRunwaySlopesPanel({
  icao: lockedIcao,
  hideHeading = false,
}: {
  /** When set, loads this ICAO and hides the search field. */
  icao?: string;
  hideHeading?: boolean;
} = {}) {
  const [icao, setIcao] = useState(lockedIcao?.toUpperCase() ?? "");
  const [airport, setAirport] = useState<AirportInfo | null>(null);
  const [runways, setRunways] = useState<RunwayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setAirport(null);
      setRunways([]);
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/data/crew-airport-runways?icao=${encodeURIComponent(trimmed)}`
      );
      const json = (await res.json()) as {
        airport: AirportInfo | null;
        runways: RunwayRow[];
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Load failed");
        return;
      }
      setAirport(json.airport);
      setRunways(json.runways);
      if (!json.airport) {
        setMessage(`No airport found for ${trimmed}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!lockedIcao) return;
    const next = lockedIcao.trim().toUpperCase();
    setIcao(next);
    void load(next);
  }, [lockedIcao, load]);

  function updateRunway(id: string, patch: Partial<RunwayRow>) {
    setRunways((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRunway(row: RunwayRow) {
    setSavingId(row.id);
    setMessage("");
    try {
      const res = await fetch(`/api/data/crew-airport-runways/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradientPctVerified: row.gradientPctVerified,
          gradientHighEndVerified: row.gradientHighEndVerified,
        }),
      });
      const json = (await res.json()) as RunwayRow & { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "Save failed");
        return;
      }
      updateRunway(row.id, {
        gradientPctVerified: json.gradientPctVerified,
        gradientHighEndVerified: json.gradientHighEndVerified,
        gradientPctEstimated: json.gradientPctEstimated,
      });
      setMessage(`Saved ${row.runwayId ?? "runway"}`);
    } finally {
      setSavingId(null);
    }
  }

  async function clearVerified(row: RunwayRow) {
    updateRunway(row.id, {
      gradientPctVerified: null,
      gradientHighEndVerified: null,
    });
    await saveRunway({
      ...row,
      gradientPctVerified: null,
      gradientHighEndVerified: null,
    });
  }

  async function promoteEstimate(row: RunwayRow) {
    if (row.gradientPctEstimated == null) return;
    const end = row.gradientHighEndEstimated;
    if (!end) return;
    const updated = {
      ...row,
      gradientPctVerified: row.gradientPctEstimated,
      gradientHighEndVerified: end,
    };
    updateRunway(row.id, {
      gradientPctVerified: updated.gradientPctVerified,
      gradientHighEndVerified: updated.gradientHighEndVerified,
    });
    await saveRunway(updated);
  }

  return (
    <div>
      {!hideHeading ? (
        <>
          <h2 className="mb-1 font-serif text-xl">Runway slopes (Crew)</h2>
          <p className="mb-3 text-sm text-atlas-muted">
            Verified slopes are served to the Crew app; unverified runways export as{" "}
            <code className="text-atlas-accent">null</code> (level). OurAirports estimates are
            read-only context for ops review.
          </p>
        </>
      ) : (
        <p className="mb-3 text-sm text-atlas-muted">
          Verified slopes ship to Crew; unverified runways export as{" "}
          <code className="text-atlas-accent">null</code> (level).
        </p>
      )}

      {!lockedIcao ? (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="runway-slope-icao">ICAO</Label>
            <Input
              id="runway-slope-icao"
              value={icao}
              onChange={(e) => setIcao(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(icao);
              }}
              placeholder="KSEZ"
              className="mt-1 w-32 font-mono"
            />
          </div>
          <Button type="button" onClick={() => void load(icao)} disabled={loading}>
            {loading ? "Loading…" : "Load"}
          </Button>
        </div>
      ) : loading ? (
        <p className="text-sm text-atlas-muted">Loading runways…</p>
      ) : null}

      {!lockedIcao && airport ? (
        <p className="mt-3 text-sm text-atlas-text">
          {airport.icao} — {airport.name}
          {airport.municipality ? ` (${airport.municipality})` : ""}
        </p>
      ) : null}

      {message ? <p className="mt-2 text-sm text-atlas-muted">{message}</p> : null}


      {runways.length > 0 ? (
        <div className="mt-4 atlas-scroll overflow-x-auto rounded-lg border border-atlas-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-atlas-border bg-atlas-surface/50 text-atlas-muted">
              <tr>
                <th className="px-3 py-2">Runway</th>
                <th className="px-3 py-2">Length</th>
                <th className="px-3 py-2">Verified %</th>
                <th className="px-3 py-2">High end</th>
                <th className="px-3 py-2">Est. % (OurAirports)</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {runways.map((row) => (
                <tr key={row.id} className="border-b border-atlas-border/60">
                  <td className="px-3 py-2 font-mono">{row.runwayId ?? "—"}</td>
                  <td className="px-3 py-2 font-mono">{row.lengthFt?.toLocaleString() ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 w-24 font-mono text-sm"
                      value={row.gradientPctVerified ?? ""}
                      onChange={(e) =>
                        updateRunway(row.id, {
                          gradientPctVerified:
                            e.target.value === "" ? null : parseFloat(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8 w-20 font-mono text-sm"
                      value={row.gradientHighEndVerified ?? ""}
                      onChange={(e) =>
                        updateRunway(row.id, {
                          gradientHighEndVerified: e.target.value || null,
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-atlas-muted">
                    {row.gradientPctEstimated != null ? `${row.gradientPctEstimated}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      className="text-xs"
                      disabled={savingId === row.id}
                      onClick={() => void saveRunway(row)}
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-xs"
                      disabled={savingId === row.id || row.gradientPctEstimated == null}
                      onClick={() => void promoteEstimate(row)}
                    >
                      Use estimate
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-xs text-atlas-danger"
                      disabled={savingId === row.id}
                      onClick={() => void clearVerified(row)}
                    >
                      Clear
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
