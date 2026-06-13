import type { ScheduleAvailabilityClass, ScheduleRawEventType } from "@prisma/client";
import { isNoCrewBlock } from "@/lib/schedule/parse-summary";

export interface ClassificationInput {
  isHold: boolean;
  isAdminBlock: boolean;
  rawEventType: ScheduleRawEventType;
  summaryRaw: string;
  paxCount: number | null;
}

/** Map JetInsight event semantics to Atlas availability columns. */
export function classifyAvailability(input: ClassificationInput): ScheduleAvailabilityClass {
  if (input.isHold) {
    return "soft_hold";
  }

  if (input.isAdminBlock || isNoCrewBlock(input.summaryRaw)) {
    return "hard_block";
  }

  switch (input.rawEventType) {
    case "charter":
    case "owner":
    case "maintenance":
    case "training":
      return "hard_block";
    case "positioning":
    case "ferry_mx":
      return input.paxCount === 0 || input.paxCount === null ? "repo_opportunity" : "hard_block";
    case "other":
      if (/\bStandby Crew\b/i.test(input.summaryRaw)) {
        return "info_only";
      }
      if (/\bScheduled MX\b/i.test(input.summaryRaw) || /\bCharts Due\b/i.test(input.summaryRaw)) {
        return "hard_block";
      }
      return "hard_block";
    default:
      return "hard_block";
  }
}
