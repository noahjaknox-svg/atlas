"use client";

import { useCallback, useState } from "react";
import type { CharterTripType } from "@prisma/client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import {
  MatchResultsPanel,
  type StoredMatch,
} from "@/components/internal/charter/match-results-panel";
import { CharterDateField } from "@/components/internal/charter/charter-date-field";
import { DEFAULT_CHARTER_DEPARTURE } from "@/lib/ourairports/search-rank";
import type { TripLegInput } from "@/lib/charter/types";

type SegmentState = {
  depIcao: string;
  depLabel: string;
  arrIcao: string;
  arrLabel: string;
  departPref: string;
  date: string;
  time: string;
  timeTbd: boolean;
};

const EMPTY_SEGMENT = (): SegmentState => ({
  depIcao: "",
  depLabel: "",
  arrIcao: "",
  arrLabel: "",
  departPref: "depart_at",
  date: "",
  time: "09:00",
  timeTbd: false,
});

const DEFAULT_SEGMENT = (): SegmentState => ({
  ...EMPTY_SEGMENT(),
  depIcao: DEFAULT_CHARTER_DEPARTURE.icao,
  depLabel: DEFAULT_CHARTER_DEPARTURE.label,
});

function resolveDeparture(seg: SegmentState): SegmentState {
  if (seg.depIcao.trim()) return seg;
  return {
    ...seg,
    depIcao: DEFAULT_CHARTER_DEPARTURE.icao,
    depLabel: DEFAULT_CHARTER_DEPARTURE.label,
  };
}

const TRIP_TYPES: { id: CharterTripType; label: string }[] = [
  { id: "one_way", label: "One way" },
  { id: "round_trip", label: "Round trip" },
  { id: "multi_city", label: "Multi city" },
];

const PAX_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);

function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  const t = time || "09:00";
  return new Date(`${date}T${t}:00`).toISOString();
}

function segmentToLeg(seg: SegmentState): TripLegInput {
  return {
    depIcao: seg.depIcao,
    arrIcao: seg.arrIcao,
    departAt: seg.timeTbd ? null : combineDateTime(seg.date, seg.time),
    timeTbd: seg.timeTbd,
    departPref: seg.departPref,
  };
}

export function TripFinderForm() {
  const [tripType, setTripType] = useState<CharterTripType>("one_way");
  const [flightCategory, setFlightCategory] = useState("Charter flight");
  const [paxCount, setPaxCount] = useState(8);

  const [outbound, setOutbound] = useState<SegmentState>(DEFAULT_SEGMENT());
  const [inbound, setInbound] = useState<SegmentState>(EMPTY_SEGMENT());
  const [multiSegments, setMultiSegments] = useState<SegmentState[]>([
    DEFAULT_SEGMENT(),
    EMPTY_SEGMENT(),
    EMPTY_SEGMENT(),
  ]);

  const [airportOptions, setAirportOptions] = useState<{ id: string; label: string }[]>([]);
  const [airportLoading, setAirportLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [matches, setMatches] = useState<StoredMatch[]>([]);

  const searchAirports = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setAirportOptions([
        {
          id: DEFAULT_CHARTER_DEPARTURE.icao,
          label: DEFAULT_CHARTER_DEPARTURE.label,
        },
      ]);
      return;
    }

    setAirportLoading(true);
    const res = await fetch(`/api/airports/search?q=${encodeURIComponent(trimmed)}`);
    const json = await res.json();
    setAirportLoading(false);
    if (res.ok) {
      setAirportOptions(
        json.map((a: { icao: string; airportName: string; city: string | null }) => ({
          id: a.icao,
          label: `${a.icao} — ${a.airportName}${a.city ? `, ${a.city}` : ""}`,
        }))
      );
    }
  }, []);

  async function findClosest(
    setter: (icao: string, label: string) => void,
    field: "dep" | "arr"
  ) {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await fetch(
          `/api/airports/nearest?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&limit=1`
        );
        const json = await res.json();
        if (res.ok && json[0]) {
          const a = json[0];
          const label = `${a.icao} — ${a.airportName}${a.city ? `, ${a.city}` : ""}`;
          setter(a.icao, label);
        } else {
          setError(`Could not find nearest airport for ${field}`);
        }
      },
      () => setError("Location permission denied")
    );
  }

  function buildLegs(): TripLegInput[] {
    if (tripType === "one_way") {
      return [segmentToLeg(resolveDeparture(outbound))];
    }
    if (tripType === "round_trip") {
      const dep = resolveDeparture(outbound);
      const returnLeg = segmentToLeg(inbound);
      return [
        segmentToLeg(dep),
        {
          ...returnLeg,
          depIcao: dep.arrIcao,
          arrIcao: dep.depIcao,
        },
      ];
    }
    return multiSegments
      .map((s) => resolveDeparture(s))
      .filter((s) => s.depIcao && s.arrIcao)
      .map(segmentToLeg);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setRequestId(null);
    setMatches([]);

    try {
      const legs = buildLegs();
      const res = await fetch("/api/charter/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripType,
          flightCategory,
          paxCount,
          legs,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to match aircraft");
        return;
      }
      setRequestId(json.requestId);
      setMatches(json.matches ?? []);
    } catch {
      setError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex rounded-lg border border-atlas-border p-0.5">
            {TRIP_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTripType(t.id)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm transition-colors",
                  tripType === t.id
                    ? "bg-atlas-accent text-white"
                    : "text-atlas-muted hover:text-atlas-text"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-atlas-muted">Category</label>
            <select
              value={flightCategory}
              onChange={(e) => setFlightCategory(e.target.value)}
              className="atlas-input h-9 min-w-[160px]"
            >
              <option>Charter flight</option>
              <option>Owner flight</option>
              <option>Positioning</option>
            </select>
          </div>
        </div>

        {tripType === "one_way" && (
          <RoutePairSection
            outbound={outbound}
            setOutbound={setOutbound}
            airportOptions={airportOptions}
            airportLoading={airportLoading}
            onSearch={searchAirports}
            onFindClosest={findClosest}
          />
        )}

        {tripType === "round_trip" && (
          <>
            <RoutePairSection
              outbound={outbound}
              setOutbound={setOutbound}
              airportOptions={airportOptions}
              airportLoading={airportLoading}
              onSearch={searchAirports}
              onFindClosest={findClosest}
            />
            <TimingRow
              label="Return"
              required
              segment={inbound}
              onChange={setInbound}
            />
          </>
        )}

        {tripType === "multi_city" && (
          <div className="space-y-3">
            {multiSegments.map((seg, i) => (
              <MultiCityRow
                key={i}
                index={i}
                segment={seg}
                airportOptions={airportOptions}
                airportLoading={airportLoading}
                onSearch={searchAirports}
                onChange={(next) => {
                  setMultiSegments((prev) => {
                    const copy = [...prev];
                    copy[i] = next;
                    return copy;
                  });
                }}
                onRemove={() =>
                  setMultiSegments((prev) => prev.filter((_, j) => j !== i))
                }
                canRemove={multiSegments.length > 1}
              />
            ))}
            <button
              type="button"
              onClick={() => setMultiSegments((prev) => [...prev, EMPTY_SEGMENT()])}
              className="text-sm text-atlas-accent hover:underline"
            >
              + Add a segment
            </button>
          </div>
        )}

        {(tripType === "one_way" || tripType === "round_trip") && (
          <TimingRow
            label="Outbound"
            required
            segment={outbound}
            onChange={setOutbound}
          />
        )}

        <div className="max-w-xs">
          <label className="atlas-kicker mb-1 block">
            Passengers <span className="text-red-400">*</span>
          </label>
          <select
            value={paxCount}
            onChange={(e) => setPaxCount(Number(e.target.value))}
            className="atlas-input w-full"
            required
          >
            {PAX_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} passenger{n !== 1 ? "s" : ""}
              </option>
            ))}
            <option value={31}>31+ passengers</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-atlas-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-atlas-accent/90 disabled:opacity-50"
        >
          {submitting ? "Finding aircraft…" : "Find aircraft"}
        </button>
      </form>

      <MatchResultsPanel
        matches={matches}
        requestId={requestId}
        loading={submitting}
        error={error}
      />
    </div>
  );
}

function RoutePairSection({
  outbound,
  setOutbound,
  airportOptions,
  airportLoading,
  onSearch,
  onFindClosest,
}: {
  outbound: SegmentState;
  setOutbound: (s: SegmentState) => void;
  airportOptions: { id: string; label: string }[];
  airportLoading: boolean;
  onSearch: (q: string) => void;
  onFindClosest: (setter: (icao: string, label: string) => void, field: "dep" | "arr") => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AirportField
        label="From"
        required
        value={outbound.depIcao}
        displayValue={outbound.depLabel}
        options={airportOptions}
        loading={airportLoading}
        onSearch={onSearch}
        onSelect={(opt) =>
          setOutbound({
            ...outbound,
            depIcao: opt?.id ?? "",
            depLabel: opt?.label ?? "",
          })
        }
        onFindClosest={() =>
          onFindClosest((icao, label) => {
            setOutbound({ ...outbound, depIcao: icao, depLabel: label });
          }, "dep")
        }
      />
      <AirportField
        label="To"
        required
        value={outbound.arrIcao}
        displayValue={outbound.arrLabel}
        options={airportOptions}
        loading={airportLoading}
        onSearch={onSearch}
        onSelect={(opt) =>
          setOutbound({
            ...outbound,
            arrIcao: opt?.id ?? "",
            arrLabel: opt?.label ?? "",
          })
        }
        onFindClosest={() =>
          onFindClosest((icao, label) => {
            setOutbound({ ...outbound, arrIcao: icao, arrLabel: label });
          }, "arr")
        }
      />
    </div>
  );
}

function AirportField({
  label,
  required,
  value,
  displayValue,
  options,
  loading,
  onSearch,
  onSelect,
  onFindClosest,
}: {
  label: string;
  required?: boolean;
  value: string;
  displayValue: string;
  options: { id: string; label: string }[];
  loading: boolean;
  onSearch: (q: string) => void;
  onSelect: (opt: { id: string; label: string } | null) => void;
  onFindClosest: () => void;
}) {
  return (
    <div className="flex gap-2">
      <div className="min-w-0 flex-1">
        <SearchableSelect
          label={`${label}${required ? " *" : ""}`}
          placeholder={label}
          value={value}
          displayValue={displayValue || value}
          options={options}
          loading={loading}
          onSearch={onSearch}
          onSelect={onSelect}
        />
      </div>
      <button
        type="button"
        onClick={onFindClosest}
        className="mt-6 shrink-0 rounded border border-atlas-border px-2 py-1 text-xs text-atlas-muted hover:border-atlas-accent hover:text-atlas-accent"
        title="Find closest airport"
      >
        Find closest
      </button>
    </div>
  );
}

function TimingRow({
  label,
  required,
  segment,
  onChange,
}: {
  label: string;
  required?: boolean;
  segment: SegmentState;
  onChange: (s: SegmentState) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <span className="w-20 shrink-0 text-sm font-medium text-atlas-text">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      <select
        value={segment.departPref}
        onChange={(e) => onChange({ ...segment, departPref: e.target.value })}
        className="atlas-input h-9 w-28"
      >
        <option value="depart_at">Depart at</option>
        <option value="arrive_by">Arrive by</option>
      </select>
      <CharterDateField
        value={segment.date}
        onChange={(date) => onChange({ ...segment, date })}
        required={required && !segment.timeTbd}
        disabled={segment.timeTbd}
      />
      <input
        type="time"
        value={segment.time}
        onChange={(e) => onChange({ ...segment, time: e.target.value })}
        className="atlas-input h-9 w-28"
        disabled={segment.timeTbd}
      />
      <label className="flex items-center gap-2 text-sm text-atlas-muted">
        <input
          type="checkbox"
          checked={segment.timeTbd}
          onChange={(e) => onChange({ ...segment, timeTbd: e.target.checked })}
        />
        Time TBD
      </label>
    </div>
  );
}

function MultiCityRow({
  index,
  segment,
  airportOptions,
  airportLoading,
  onSearch,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  segment: SegmentState;
  airportOptions: { id: string; label: string }[];
  airportLoading: boolean;
  onSearch: (q: string) => void;
  onChange: (s: SegmentState) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-atlas-border bg-atlas-surface/50 p-3">
      <span className="w-6 text-xs text-atlas-muted">{index + 1}</span>
      <div className="w-36 min-w-0">
        <SearchableSelect
          label="From *"
          placeholder="From"
          value={segment.depIcao}
          displayValue={segment.depLabel || segment.depIcao}
          options={airportOptions}
          loading={airportLoading}
          onSearch={onSearch}
          onSelect={(opt) =>
            onChange({
              ...segment,
              depIcao: opt?.id ?? "",
              depLabel: opt?.label ?? "",
            })
          }
          compact
        />
      </div>
      <div className="w-36 min-w-0">
        <SearchableSelect
          label="To *"
          placeholder="To"
          value={segment.arrIcao}
          displayValue={segment.arrLabel || segment.arrIcao}
          options={airportOptions}
          loading={airportLoading}
          onSearch={onSearch}
          onSelect={(opt) =>
            onChange({
              ...segment,
              arrIcao: opt?.id ?? "",
              arrLabel: opt?.label ?? "",
            })
          }
          compact
        />
      </div>
      <select
        value={segment.departPref}
        onChange={(e) => onChange({ ...segment, departPref: e.target.value })}
        className="atlas-input h-9 w-28"
      >
        <option value="depart_at">Depart at</option>
        <option value="arrive_by">Arrive by</option>
      </select>
      <CharterDateField
        value={segment.date}
        onChange={(date) => onChange({ ...segment, date })}
        disabled={segment.timeTbd}
      />
      <input
        type="time"
        value={segment.time}
        onChange={(e) => onChange({ ...segment, time: e.target.value })}
        className="atlas-input h-9 w-28"
        disabled={segment.timeTbd}
      />
      <label className="flex items-center gap-1 text-xs text-atlas-muted">
        <input
          type="checkbox"
          checked={segment.timeTbd}
          onChange={(e) => onChange({ ...segment, timeTbd: e.target.checked })}
        />
        TBD
      </label>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto rounded border border-atlas-border px-2 py-1 text-xs text-atlas-muted hover:text-red-400"
          aria-label="Remove segment"
        >
          ✕
        </button>
      )}
    </div>
  );
}
