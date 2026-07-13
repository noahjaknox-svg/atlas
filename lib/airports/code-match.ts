/**
 * Normalize airport identifiers for comparison.
 * JetInsight uses 3-letter FAA codes (SDL); Atlas search uses 4-letter ICAO (KSDL).
 */
export function airportCodeKey(code: string): string {
  const c = code.trim().toUpperCase();
  if (!c) return c;
  // US ICAO: K + 3-letter FAA LID → compare on the 3-letter form.
  if (c.length === 4 && c.startsWith("K") && /^K[A-Z0-9]{3}$/.test(c)) {
    return c.slice(1);
  }
  return c;
}

export function airportCodesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const au = a.trim().toUpperCase();
  const bu = b.trim().toUpperCase();
  if (au === bu) return true;
  return airportCodeKey(au) === airportCodeKey(bu);
}

/** Prefer 4-letter ICAO for display when the code is a US FAA LID. */
export function toIcaoDisplay(code: string): string {
  const c = code.trim().toUpperCase();
  if (c.length === 3 && /^[A-Z0-9]{3}$/.test(c)) return `K${c}`;
  return c;
}

/** Format a route as ICAO codes, e.g. SDL-COE → KSDL-KCOE. */
export function toIcaoRouteKey(depIcao: string, arrIcao: string): string {
  return `${toIcaoDisplay(depIcao)}-${toIcaoDisplay(arrIcao)}`;
}

/** Format a route arrow label in ICAO, e.g. SDL → COE becomes KSDL → KCOE. */
export function toIcaoRouteLabel(depIcao: string, arrIcao: string, sep = " → "): string {
  return `${toIcaoDisplay(depIcao)}${sep}${toIcaoDisplay(arrIcao)}`;
}
