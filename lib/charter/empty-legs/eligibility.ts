import type { ScheduleEvent } from "@prisma/client";

export function buildRouteKey(depIcao: string, arrIcao: string): string {
  return `${depIcao.toUpperCase()}-${arrIcao.toUpperCase()}`;
}

export function isEligibleEmptyLegEvent(
  event: Pick<
    ScheduleEvent,
    "rawEventType" | "paxCount" | "externalUrl" | "externalTripCode" | "depIcao" | "arrIcao" | "deletedAt"
  >
): boolean {
  if (event.deletedAt) return false;
  if (event.rawEventType !== "positioning") return false;
  if (event.paxCount !== 0) return false;
  if (!event.externalUrl?.trim()) return false;
  if (!event.externalTripCode?.trim()) return false;
  if (!event.depIcao?.trim() || !event.arrIcao?.trim()) return false;
  return true;
}

export function durationMinutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

export function jetInsightTripUrl(tripNumber: string): string {
  return `https://portal.jetinsight.com/trips/${tripNumber}`;
}

export function emptyLegPublicExpiryAt(leg: {
  scheduledDepartureAt: Date;
  slidingWindowEndAt: Date | null;
}): Date {
  return leg.slidingWindowEndAt ?? leg.scheduledDepartureAt;
}

export function isEmptyLegPast(
  leg: { scheduledDepartureAt: Date; slidingWindowEndAt: Date | null },
  now = new Date()
): boolean {
  return emptyLegPublicExpiryAt(leg).getTime() < now.getTime();
}
