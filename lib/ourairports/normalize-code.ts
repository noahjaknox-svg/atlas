/** Normalize lookup code to uppercase ident / ICAO. */
export function normalizeAirportCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Prefer official ICAO; fall back to ident for airports without icao_code. */
export function resolveIcaoFromRow(row: Record<string, string>): string | null {
  const icao = row.icao_code?.trim().toUpperCase();
  if (icao && icao.length === 4) return icao;
  const ident = row.ident?.trim().toUpperCase();
  if (ident && /^[A-Z0-9]{4}$/.test(ident)) return ident;
  return null;
}
