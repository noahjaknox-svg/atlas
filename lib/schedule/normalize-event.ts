import { classifyAvailability } from "@/lib/schedule/classify-availability";
import { parseDescription } from "@/lib/schedule/parse-description";
import { parseSummary } from "@/lib/schedule/parse-summary";
import type { NormalizedScheduleEvent, ParsedIcsEvent } from "@/lib/schedule/types";

export function normalizeScheduleEvent(icsEvent: ParsedIcsEvent): NormalizedScheduleEvent {
  const summary = parseSummary(icsEvent.summaryRaw);
  const description = parseDescription(icsEvent.descriptionRaw);

  const availabilityClass = classifyAvailability({
    isHold: summary.isHold,
    isAdminBlock: summary.isAdminBlock,
    rawEventType: summary.rawEventType,
    summaryRaw: summary.summaryRaw,
    paxCount: description.paxCount,
  });

  return {
    ...icsEvent,
    ...summary,
    ...description,
    depIcao: summary.depIcao ?? icsEvent.locationIcao,
    arrIcao: summary.arrIcao ?? summary.depIcao ?? icsEvent.locationIcao,
    availabilityClass,
  };
}
