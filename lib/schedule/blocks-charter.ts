import type { ScheduleEvent } from "@prisma/client";
import { isNoCrewBlock } from "@/lib/schedule/parse-summary";

type BlockCheckEvent = Pick<ScheduleEvent, "availabilityClass" | "summaryRaw">;

/** Whether a schedule event actually blocks charter during its time window. */
export function blocksCharterScheduling(event: BlockCheckEvent): boolean {
  if (event.availabilityClass !== "hard_block") return false;

  if (/\baway from home base\b/i.test(event.summaryRaw)) return false;

  // Crew/admin ground blocks (SDL-SDL etc.) must still block charter.
  if (isNoCrewBlock(event.summaryRaw)) return true;
  if (/\bMinimal Crew\b/i.test(event.summaryRaw)) return true;
  if (/\bCrew cannot change\b/i.test(event.summaryRaw)) return true;
  if (/\bCREW NOT WITH PLANE\b/i.test(event.summaryRaw)) return true;
  if (/\bDON'?T QUOTE\b/i.test(event.summaryRaw)) return true;
  if (/\bNO CHARTER\b/i.test(event.summaryRaw)) return true;

  return true;
}
