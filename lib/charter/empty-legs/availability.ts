import type {
  EmptyLegAvailabilityStatus,
  EmptyLegForceState,
  ScheduleEvent,
} from "@prisma/client";
import { blocksCharterScheduling } from "@/lib/schedule/blocks-charter";

export type HardBlockEvent = Pick<
  ScheduleEvent,
  | "id"
  | "tailNumber"
  | "startsAt"
  | "endsAt"
  | "deletedAt"
  | "availabilityClass"
  | "summaryRaw"
>;

export function resolveEmptyLegAvailability(input: {
  forceState: EmptyLegForceState | null;
  calendarBlocked: boolean;
}): EmptyLegAvailabilityStatus {
  if (input.forceState === "force_available") return "available";
  if (input.forceState === "force_unavailable") return "unavailable";
  return input.calendarBlocked ? "unavailable" : "available";
}

/** True when another hard-blocking event overlaps the empty-leg window on the same tail. */
export function hasHardBlockOverlap(input: {
  emptyLegEventId: string | null;
  tailNumber: string;
  startsAt: Date;
  endsAt: Date;
  /** Prefer passing only that tail’s events when available. */
  events: HardBlockEvent[];
}): boolean {
  const tail = input.tailNumber.toUpperCase();
  for (const event of input.events) {
    if (event.deletedAt) continue;
    if (event.tailNumber.toUpperCase() !== tail) continue;
    if (input.emptyLegEventId && event.id === input.emptyLegEventId) continue;
    if (!blocksCharterScheduling(event)) continue;
    if (event.startsAt < input.endsAt && event.endsAt > input.startsAt) {
      return true;
    }
  }
  return false;
}
