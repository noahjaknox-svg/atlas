/**
 * aviationweather.gov (AWC) Data API — airport info.
 * https://aviationweather.gov/data/api/  (`/api/data/airport`)
 *
 * Server-side only: AWC disables CORS, allows 100 requests/min and up to 400 results per
 * response, and asks clients to send a custom User-Agent.
 *
 * Units, as returned by AWC (verified against known airports):
 * - `elev` is METERS (KSDL → 460 = 1,510 ft), converted to feet here.
 * - runway `dimension` is "LENGTHxWIDTH" in feet; `alignment` is the TRUE heading of the
 *   first end (KSDL 03/21 → 44° = 032° magnetic + 12°E).
 * - `magdec` is "12E" / "08W", or a bare 0.
 * - `freqs` is "TYPE,MHZ;TYPE,MHZ" or "-" when none.
 */

export const AWC_AIRPORT_ENDPOINT = "https://aviationweather.gov/api/data/airport";
/** Identifies us to AWC without sending any personal data. */
export const AWC_USER_AGENT = "Atlas-PrismJet/1.0 (+https://www.prismjet.space)";
/** AWC caps a response at 400 entries; stay well under it. */
export const AWC_MAX_IDS_PER_REQUEST = 100;

const METERS_TO_FEET = 3.28084;

/** Raw airport object from AWC (only the fields we use). */
export type AwcAirportRaw = {
  icaoId?: string | null;
  iataId?: string | null;
  faaId?: string | null;
  name?: string | null;
  state?: string | null;
  country?: string | null;
  source?: string | null;
  lat?: number | null;
  lon?: number | null;
  elev?: number | null;
  magdec?: string | number | null;
  tower?: string | null;
  beacon?: string | null;
  freqs?: string | null;
  runways?: Array<{
    id?: string | null;
    dimension?: string | null;
    surface?: string | null;
    alignment?: number | null;
  }> | null;
};

export type AwcRunway = {
  /** e.g. "03/21", or "H1" for a helipad. */
  id: string;
  leIdent: string | null;
  heIdent: string | null;
  lengthFt: number | null;
  widthFt: number | null;
  /** AWC surface code, e.g. "A". */
  surfaceCode: string | null;
  /** Human label for known codes, else the code. */
  surface: string | null;
  /** True heading of the first (le) end; the other end is +180°. */
  leHeadingDegT: number | null;
  heHeadingDegT: number | null;
  isHelipad: boolean;
};

export type AwcFrequency = { type: string; frequencyMhz: number | null };

export type AwcAirportNav = {
  icao: string;
  faaId: string | null;
  iataId: string | null;
  name: string | null;
  state: string | null;
  country: string | null;
  /** AWC's own source tag: "FAA" for US data, "Intl" otherwise. */
  dataSource: string | null;
  latitudeDeg: number | null;
  longitudeDeg: number | null;
  elevationFt: number | null;
  /** Degrees; east positive, west negative (0 when AWC reports none). */
  magneticVariationDeg: number | null;
  hasTower: boolean;
  hasBeacon: boolean;
  frequencies: AwcFrequency[];
  runways: AwcRunway[];
};

// Only codes observed in real AWC responses; anything else is shown as the raw code
// rather than guessed.
const SURFACE_LABELS: Record<string, string> = {
  A: "Asphalt",
  C: "Concrete",
  H: "Hard surface",
};

function numOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function parseMagneticVariation(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*([EW])?$/i);
  if (!m) return null;
  const deg = parseFloat(m[1]!);
  return m[2]?.toUpperCase() === "W" ? -Math.abs(deg) : deg;
}

export function parseFrequencies(raw: string | null | undefined): AwcFrequency[] {
  if (!raw || raw.trim() === "-") return [];
  return raw
    .split(";")
    .map((part) => part.split(","))
    .filter((p) => p[0]?.trim())
    .map(([type, mhz]) => ({ type: type!.trim(), frequencyMhz: numOrNull(mhz?.trim()) }));
}

export function parseRunway(r: NonNullable<AwcAirportRaw["runways"]>[number]): AwcRunway | null {
  const id = r.id?.trim();
  if (!id) return null;
  const [le, he] = id.split("/");
  const dim = r.dimension?.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)$/i);
  const heading = numOrNull(r.alignment);
  const code = r.surface?.trim().toUpperCase() || null;
  return {
    id,
    leIdent: le?.trim() || null,
    heIdent: he?.trim() || null,
    lengthFt: dim ? Math.round(parseFloat(dim[1]!)) : null,
    widthFt: dim ? Math.round(parseFloat(dim[2]!)) : null,
    surfaceCode: code,
    surface: code ? SURFACE_LABELS[code] ?? code : null,
    leHeadingDegT: heading,
    heHeadingDegT: heading == null ? null : (heading + 180) % 360,
    isHelipad: /^H\d*$/i.test(id),
  };
}

/** Normalize one AWC airport object. Returns null when it has no ICAO id. */
export function parseAwcAirport(raw: AwcAirportRaw): AwcAirportNav | null {
  const icao = raw.icaoId?.trim().toUpperCase();
  if (!icao) return null;
  const elevM = numOrNull(raw.elev);
  return {
    icao,
    faaId: raw.faaId?.trim() || null,
    iataId: raw.iataId?.trim() || null,
    name: raw.name?.trim() || null,
    state: raw.state?.trim() || null,
    country: raw.country?.trim() || null,
    dataSource: raw.source?.trim() || null,
    latitudeDeg: numOrNull(raw.lat),
    longitudeDeg: numOrNull(raw.lon),
    elevationFt: elevM == null ? null : Math.round(elevM * METERS_TO_FEET),
    magneticVariationDeg: parseMagneticVariation(raw.magdec),
    hasTower: raw.tower?.trim().toUpperCase() === "T",
    hasBeacon: raw.beacon?.trim().toUpperCase() === "B",
    frequencies: parseFrequencies(raw.freqs),
    runways: (raw.runways ?? []).map(parseRunway).filter((r): r is AwcRunway => r != null),
  };
}

export class AwcRequestError extends Error {
  constructor(message: string, readonly status?: number, readonly retriable = false) {
    super(message);
    this.name = "AwcRequestError";
  }
}

/**
 * Fetch airport info for the given ICAO codes (batched). Airports AWC doesn't know are
 * simply absent from the result. Throws AwcRequestError on transport/HTTP failure.
 */
export async function fetchAwcAirports(
  icaos: string[],
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<Map<string, AwcAirportNav>> {
  const ids = Array.from(new Set(icaos.map((c) => c.trim().toUpperCase()).filter(Boolean)));
  const out = new Map<string, AwcAirportNav>();
  const doFetch = opts.fetchImpl ?? fetch;

  for (let i = 0; i < ids.length; i += AWC_MAX_IDS_PER_REQUEST) {
    const batch = ids.slice(i, i + AWC_MAX_IDS_PER_REQUEST);
    const url = `${AWC_AIRPORT_ENDPOINT}?ids=${encodeURIComponent(batch.join(","))}&format=json`;
    let res: Response;
    try {
      res = await doFetch(url, {
        headers: { "User-Agent": AWC_USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
        cache: "no-store",
      });
    } catch (e) {
      throw new AwcRequestError(`AWC request failed: ${(e as Error).message}`, undefined, true);
    }
    if (res.status === 204) continue; // valid request, no data
    if (!res.ok) {
      throw new AwcRequestError(
        `AWC responded ${res.status}`,
        res.status,
        res.status === 429 || res.status >= 500
      );
    }
    const body = (await res.json().catch(() => [])) as unknown;
    if (!Array.isArray(body)) continue;
    for (const raw of body as AwcAirportRaw[]) {
      const nav = parseAwcAirport(raw);
      if (nav) out.set(nav.icao, nav);
    }
  }
  return out;
}
