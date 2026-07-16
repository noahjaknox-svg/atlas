"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AirportReferenceWire, AirportRunwayWire } from "@/lib/ourairports/types";
import type { CrewAirportRunwayWire } from "@/lib/ourairports/crew-wire";
import { cn, formatFormattedNumber } from "@/lib/utils";

type SearchHit = { id: string; icao: string; label: string };

type FboRow = {
  id: string;
  fboName: string;
  baseFuelRate: string;
  hangarCostPerSqft: string | null;
};

type TimezoneSource = "geo_tz" | "fallback_map" | "override" | "none";

type AirportAuditDetail = {
  icao: string;
  ident: string;
  airportName: string;
  city: string | null;
  country: string | null;
  iata: string | null;
  elevationFt: number | null;
  latitudeDeg: number | null;
  longitudeDeg: number | null;
  longestRunwayFt: number | null;
  timezone?: {
    iana: string | null;
    abbreviation: string | null;
    source: TimezoneSource;
    confidence: "high" | "medium" | "low" | "unknown";
  };
  fuelPrice: string | null;
  hangarMonthly: string | null;
  hasAtlasPricing: boolean;
  fbos: FboRow[];
  reference: AirportReferenceWire;
  crew: {
    terrain: boolean;
    multiRunway: boolean;
    gradientPct: number | null;
    gradientHighEndRunway: string | null;
    primaryRunwayId: string | null;
    runways: CrewAirportRunwayWire[];
  };
};

function timezoneSourceHint(source: TimezoneSource | undefined): string | undefined {
  switch (source) {
    case "geo_tz":
      return "Computed from airport coordinates";
    case "override":
      return "Staff override";
    case "fallback_map":
      return "Fallback map (not from coordinates)";
    default:
      return undefined;
  }
}

function timezoneDisplay(detail: AirportAuditDetail): string | null {
  const tz = detail.timezone;
  if (!tz?.iana) return null;
  if (tz.abbreviation && tz.abbreviation !== tz.iana) {
    return `${tz.iana} (${tz.abbreviation})`;
  }
  return tz.iana;
}

const FIELD_CONTROL = cn(
  "flex h-10 w-full rounded-md border border-atlas-border bg-atlas-surface px-3 py-2 text-sm text-atlas-text",
  "placeholder:text-atlas-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent"
);

function display(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return formatFormattedNumber(String(value));
  return String(value);
}

function AuditField({ label, value, hint }: { label: string; value: unknown; hint?: string }) {
  const text = display(value);
  const isLink = typeof value === "string" && /^https?:\/\//.test(value);

  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-atlas-muted">{label}</dt>
      <dd className="text-sm text-atlas-text">
        {isLink ? (
          <a href={value as string} target="_blank" rel="noreferrer" className="text-atlas-accent hover:underline">
            {text}
          </a>
        ) : (
          text
        )}
      </dd>
      {hint ? <p className="text-[11px] leading-snug text-atlas-muted">{hint}</p> : null}
    </div>
  );
}

function AuditSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-atlas-border/80 bg-atlas-surface/20 p-4 sm:p-5">
      <div className="mb-4 border-b border-atlas-border/50 pb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-atlas-muted">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-relaxed text-atlas-muted/90">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function runwayLabel(r: Pick<AirportRunwayWire, "leIdent" | "heIdent">): string {
  if (r.leIdent && r.heIdent) return `${r.leIdent}/${r.heIdent}`;
  return r.leIdent ?? r.heIdent ?? "—";
}

export function AirportAuditWorkbench() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [detail, setDetail] = useState<AirportAuditDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const searchAirports = useCallback(async (q: string) => {
    if (!q) {
      setHits([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/airports/search?q=${encodeURIComponent(q)}`);
      const json = await res.json().catch(() => []);
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Search failed");
        setHits([]);
        return;
      }
      setHits(
        (json as Array<{ id: string; icao: string; label: string }>).map((row) => ({
          id: row.icao ?? row.id,
          icao: row.icao ?? row.id,
          label: row.label,
        }))
      );
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    void searchAirports(debouncedQuery);
  }, [debouncedQuery, searchAirports]);

  const loadDetail = useCallback(async (icao: string) => {
    setSelectedIcao(icao);
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(`/api/airports/${encodeURIComponent(icao)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetail(null);
        setError(typeof json.error === "string" ? json.error : "Airport not found");
        return;
      }
      setDetail(json as AirportAuditDetail);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  function handleSubmitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (hits.length === 1) {
      void loadDetail(hits[0]!.icao);
      return;
    }
    void loadDetail(q.toUpperCase());
  }

  const reference = detail?.reference;

  const atlasNotes = useMemo(() => {
    if (!detail) return [];
    const notes: string[] = [];
    if (detail.hasAtlasPricing) {
      notes.push("FBO records exist in the warehouse — pro forma can use field fuel and hangar rates.");
    } else {
      notes.push("No FBO records — pro forma falls back to company US average fuel cost.");
    }
    notes.push("Hangar annual = FBO hangar $/sqft × aircraft square footage, or a per-aircraft override.");
    return notes;
  }, [detail]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="data-hub-sidebar flex min-h-0 w-72 shrink-0 flex-col border-r border-atlas-border bg-atlas-chrome/95 xl:w-80">
        <form className="shrink-0 space-y-2 border-b border-atlas-border px-3 py-3" onSubmit={handleSubmitSearch}>
          <input
            placeholder="ICAO, name, or city…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={FIELD_CONTROL}
            autoComplete="off"
          />
          <button
            type="submit"
            className="h-9 w-full rounded-md border border-atlas-border bg-atlas-surface/60 text-sm text-atlas-text transition-colors hover:bg-atlas-border/30"
          >
            Look up airport
          </button>
          <p className="text-[11px] leading-relaxed text-atlas-muted">
            Search OurAirports reference data. Press Enter to open an exact ICAO match.
          </p>
        </form>

        <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {searching ? (
            <p className="px-1 py-4 text-center text-sm text-atlas-muted">Searching…</p>
          ) : !debouncedQuery ? (
            <p className="px-1 py-6 text-center text-sm text-atlas-muted">
              Enter an ICAO code, airport name, or city to begin.
            </p>
          ) : hits.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-atlas-muted">No airports found.</p>
          ) : (
            <nav className="space-y-0.5" aria-label="Airport search results">
              {hits.map((hit) => {
                const active = hit.icao === selectedIcao;
                return (
                  <button
                    key={hit.icao}
                    type="button"
                    onClick={() => void loadDetail(hit.icao)}
                    className={cn(
                      "block w-full rounded px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-atlas-accent/15 font-medium text-atlas-accent"
                        : "text-atlas-text/75 hover:bg-atlas-border/30 hover:text-atlas-text"
                    )}
                  >
                    <span className="block truncate">{hit.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!selectedIcao ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-atlas-muted">
            Search for an airport to review the reference and Atlas pricing fields used across the app.
          </div>
        ) : loadingDetail ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-atlas-muted">Loading airport…</div>
        ) : !detail || !reference ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-atlas-danger">
            {error ?? "Airport not found."}
          </div>
        ) : (
          <>
            <header className="shrink-0 border-b border-atlas-border bg-atlas-surface/10 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-serif text-xl text-atlas-text">{detail.airportName}</h2>
                  <p className="mt-0.5 text-sm text-atlas-muted">
                    {[detail.icao, detail.city, detail.country].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {reference.isoCountry === "US" ? (
                    <span className="rounded-full bg-atlas-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-atlas-accent">
                      US
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      detail.hasAtlasPricing
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-atlas-border/40 text-atlas-muted"
                    )}
                  >
                    {detail.hasAtlasPricing ? "Atlas FBO data" : "Reference only"}
                  </span>
                </div>
              </div>
            </header>

            <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <div className="mx-auto flex max-w-5xl flex-col gap-5">
                <AuditSection
                  title="Atlas integration"
                  description="Values the pro forma and proposal workspace derive from warehouse FBO records at this field."
                >
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                    <AuditField
                      label="Lowest FBO fuel ($/gal)"
                      value={detail.fuelPrice ? `$${detail.fuelPrice}` : null}
                      hint="Minimum base fuel rate across FBOs at this airport."
                    />
                    <AuditField
                      label="FBO count"
                      value={detail.fbos.length}
                      hint="Manage FBOs on the FBOs tab in this warehouse."
                    />
                  </dl>
                  {detail.fbos.length > 0 ? (
                    <div className="mt-5 overflow-x-auto rounded-md border border-atlas-border/70">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-atlas-border bg-atlas-surface/40 text-xs uppercase tracking-wide text-atlas-muted">
                          <tr>
                            <th className="px-3 py-2 font-medium">FBO</th>
                            <th className="px-3 py-2 font-medium">Fuel ($/gal)</th>
                            <th className="px-3 py-2 font-medium">Hangar ($/sqft/yr)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.fbos.map((fbo) => (
                            <tr key={fbo.id} className="border-b border-atlas-border/50 last:border-0">
                              <td className="px-3 py-2 text-atlas-text">{fbo.fboName}</td>
                              <td className="px-3 py-2 text-atlas-text">${fbo.baseFuelRate}</td>
                              <td className="px-3 py-2 text-atlas-text">
                                {fbo.hangarCostPerSqft ? `$${fbo.hangarCostPerSqft}` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  <ul className="mt-4 list-disc space-y-1 pl-5 text-xs leading-relaxed text-atlas-muted">
                    {atlasNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </AuditSection>

                <AuditSection title="Identifiers">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                    <AuditField label="ICAO" value={reference.icao} />
                    <AuditField label="Ident" value={reference.ident} />
                    <AuditField label="IATA" value={reference.iata} />
                    <AuditField label="GPS code" value={reference.gpsCode} />
                    <AuditField label="Local / FAA LID" value={reference.localCode} />
                    <AuditField label="Airport type" value={reference.type} />
                  </dl>
                </AuditSection>

                <AuditSection title="Location & region">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                    <AuditField label="City" value={reference.municipality} />
                    <AuditField label="Region" value={reference.regionName ?? reference.isoRegion} />
                    <AuditField label="Country" value={reference.countryName ?? reference.isoCountry} />
                    <AuditField label="Continent" value={reference.continent} />
                    <AuditField
                      label="Timezone"
                      value={timezoneDisplay(detail)}
                      hint={timezoneSourceHint(detail.timezone?.source)}
                    />
                    <AuditField label="Latitude" value={reference.latitudeDeg} />
                    <AuditField label="Longitude" value={reference.longitudeDeg} />
                    <AuditField label="Elevation (ft)" value={reference.elevationFt} />
                  </dl>
                </AuditSection>

                <AuditSection title="Operations">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                    <AuditField label="Scheduled service" value={reference.scheduledService} />
                    <AuditField label="Longest runway (ft)" value={reference.longestRunwayFt} />
                    <AuditField label="Open runways" value={reference.runways.filter((r) => !r.closed).length} />
                    <AuditField label="Frequencies" value={reference.frequencies.length} />
                  </dl>
                </AuditSection>

                <AuditSection
                  title="PrismJet Crew"
                  description="Fields synced to the Crew app for performance calculations."
                >
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                    <AuditField label="Primary runway" value={detail.crew.primaryRunwayId} />
                    <AuditField label="Terrain airport" value={detail.crew.terrain} />
                    <AuditField label="Multi-runway" value={detail.crew.multiRunway} />
                    <AuditField label="Primary gradient (%)" value={detail.crew.gradientPct} />
                    <AuditField label="Gradient high end" value={detail.crew.gradientHighEndRunway} />
                  </dl>
                </AuditSection>

                {reference.runways.length > 0 ? (
                  <AuditSection title="Runways">
                    <div className="overflow-x-auto rounded-md border border-atlas-border/70">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-atlas-border bg-atlas-surface/40 text-xs uppercase tracking-wide text-atlas-muted">
                          <tr>
                            <th className="px-3 py-2 font-medium">Runway</th>
                            <th className="px-3 py-2 font-medium">Length</th>
                            <th className="px-3 py-2 font-medium">Width</th>
                            <th className="px-3 py-2 font-medium">Surface</th>
                            <th className="px-3 py-2 font-medium">Lighted</th>
                            <th className="px-3 py-2 font-medium">Closed</th>
                            <th className="px-3 py-2 font-medium">Grad verified</th>
                            <th className="px-3 py-2 font-medium">Grad est.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reference.runways.map((runway, i) => (
                            <tr key={`${runwayLabel(runway)}-${i}`} className="border-b border-atlas-border/50 last:border-0">
                              <td className="px-3 py-2 text-atlas-text">{runwayLabel(runway)}</td>
                              <td className="px-3 py-2 text-atlas-text">{display(runway.lengthFt)}</td>
                              <td className="px-3 py-2 text-atlas-text">{display(runway.widthFt)}</td>
                              <td className="px-3 py-2 text-atlas-text">{display(runway.surface)}</td>
                              <td className="px-3 py-2 text-atlas-text">{display(runway.lighted)}</td>
                              <td className="px-3 py-2 text-atlas-text">{display(runway.closed)}</td>
                              <td className="px-3 py-2 text-atlas-text">
                                {runway.gradientPctVerified != null
                                  ? `${runway.gradientPctVerified}% (${runway.gradientHighEndVerified ?? "?"})`
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-atlas-text">
                                {runway.gradientPctEstimated != null ? `${runway.gradientPctEstimated}%` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AuditSection>
                ) : null}

                {reference.frequencies.length > 0 ? (
                  <AuditSection title="Frequencies">
                    <div className="overflow-x-auto rounded-md border border-atlas-border/70">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-atlas-border bg-atlas-surface/40 text-xs uppercase tracking-wide text-atlas-muted">
                          <tr>
                            <th className="px-3 py-2 font-medium">Type</th>
                            <th className="px-3 py-2 font-medium">Description</th>
                            <th className="px-3 py-2 font-medium">MHz</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reference.frequencies.map((freq, i) => (
                            <tr key={`${freq.type}-${i}`} className="border-b border-atlas-border/50 last:border-0">
                              <td className="px-3 py-2 text-atlas-text">{freq.type}</td>
                              <td className="px-3 py-2 text-atlas-text">{display(freq.description)}</td>
                              <td className="px-3 py-2 text-atlas-text">{display(freq.frequencyMhz)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AuditSection>
                ) : null}

                <AuditSection title="Reference metadata">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                    <AuditField label="Keywords" value={reference.keywords} />
                    <AuditField label="Source version" value={reference.sourceVersion} />
                    <AuditField
                      label="Last updated"
                      value={reference.updatedAt ? new Date(reference.updatedAt).toLocaleString() : null}
                    />
                    <AuditField label="Wikipedia" value={reference.wikipediaLink} />
                    <AuditField label="Home page" value={reference.homeLink} />
                  </dl>
                </AuditSection>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
