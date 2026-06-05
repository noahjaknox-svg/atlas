import type { Decimal } from "@prisma/client/runtime/library";

export function dec(v: Decimal | null | undefined): string | null {
  return v != null ? v.toString() : null;
}

export function decNum(v: Decimal | null | undefined): number | null {
  return v != null ? Number(v) : null;
}

export function dateStr(v: Date | null | undefined): string | null {
  return v ? v.toISOString().slice(0, 10) : null;
}
