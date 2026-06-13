export function decimalToNumber(
  value: { toString(): string } | null | undefined
): number | null {
  if (value == null) return null;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}
