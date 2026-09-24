export type OurAirportsAirportRow = {
  id: string;
  ident: string;
  type: string;
  name: string;
  latitude_deg: string;
  longitude_deg: string;
  elevation_ft: string;
  continent: string;
  iso_country: string;
  iso_region: string;
  municipality: string;
  scheduled_service: string;
  icao_code: string;
  iata_code: string;
  gps_code: string;
  local_code: string;
  home_link: string;
  wikipedia_link: string;
  keywords: string;
};

export type AirportReferenceWire = {
  icao: string;
  ident: string;
  iata: string | null;
  name: string;
  type: string;
  latitudeDeg: number | null;
  longitudeDeg: number | null;
  elevationFt: number | null;
  continent: string | null;
  isoCountry: string;
  isoRegion: string | null;
  municipality: string | null;
  scheduledService: boolean;
  gpsCode: string | null;
  localCode: string | null;
  homeLink: string | null;
  wikipediaLink: string | null;
  keywords: string | null;
  longestRunwayFt: number | null;
  countryName: string | null;
  regionName: string | null;
  sourceVersion: string | null;
  runways: AirportRunwayWire[];
  frequencies: AirportFrequencyWire[];
  updatedAt: string;
  /** Present when aviationweather.gov nav data was merged in (lib/awc/overlay.ts). */
  nav?: AirportNavMeta | null;
};

export type AirportNavMeta = {
  provider: "aviationweather.gov";
  /** AWC's source tag: "FAA" (US) or "Intl". */
  dataSource: string | null;
  fetchedAt: string;
  /** Served from an out-of-date cache because AWC was unreachable. */
  stale: boolean;
  faaId: string | null;
  magneticVariationDeg: number | null;
  hasTower: boolean;
  hasBeacon: boolean;
};

export type AirportRunwayWire = {
  lengthFt: number | null;
  widthFt: number | null;
  surface: string | null;
  lighted: boolean;
  closed: boolean;
  leIdent: string | null;
  heIdent: string | null;
  leHeadingDegT: number | null;
  heHeadingDegT: number | null;
  gradientPctVerified: number | null;
  gradientHighEndVerified: string | null;
  gradientPctEstimated: number | null;
  /** Where the runway's dimensions/surface/heading came from. */
  source?: "aviationweather.gov" | "ourairports";
};

export type AirportFrequencyWire = {
  type: string;
  description: string | null;
  frequencyMhz: number | null;
};

export type AirportSearchHit = {
  icao: string;
  ident: string;
  iata: string | null;
  name: string;
  municipality: string | null;
  isoCountry: string;
  type: string;
  /** IANA timezone when known; omit when unknown. */
  timeZone?: string;
};
