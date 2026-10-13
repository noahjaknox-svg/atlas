const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** $1,234,567 / -$1,234 */
export function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const v = Math.round(n);
  return v < 0 ? `-${USD.format(-v)}` : USD.format(v);
}

/** $1.45M / $727.8K / $950 */
export function fmtUsdCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs)}`;
}

export function fmtInt(n: number): string {
  return Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "—";
}

export function fmtPct(n: number, digits = 0): string {
  return Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : "—";
}
