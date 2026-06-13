import type { ScheduleRawEventType } from "@prisma/client";
import type { ParsedSummary } from "@/lib/schedule/types";

const ADMIN_BLOCK_PATTERNS = [
  /\bDONT QUOTE\b/i,
  /\bNO CHARTER\b/i,
  /\bNO ADDITIONAL CHARTERS\b/i,
  /\bUNAVAILABLE\b/i,
];

const EVENT_TYPE_MAP: Record<string, ScheduleRawEventType> = {
  "charter flight": "charter",
  "owner flight": "owner",
  "positioning flight": "positioning",
  "maintenance": "maintenance",
  "ferry/mx flight": "ferry_mx",
  "training flight": "training",
  "other": "other",
};

/** JetInsight SUMMARY: `[HOLD: ] [NTAIL] Client (DEP - ARR) - EventType` */
export function parseSummary(summaryRaw: string): ParsedSummary {
  const normalized = summaryRaw.replace(/\\,/g, ",").replace(/\s+/g, " ").trim();
  const isHold = /^HOLD:\s*/i.test(normalized);
  const withoutHold = normalized.replace(/^HOLD:\s*/i, "");

  const isAdminBlock = ADMIN_BLOCK_PATTERNS.some((p) => p.test(withoutHold));

  const tailMatch = withoutHold.match(/\[([N][A-Z0-9]+)\]/);
  const tailNumber = tailMatch?.[1] ?? null;

  const routeMatch = withoutHold.match(/\(([A-Z0-9]{3,4})\s*-\s*([A-Z0-9]{3,4})\)/);
  const depIcao = routeMatch?.[1] ?? null;
  const arrIcao = routeMatch?.[2] ?? null;

  const typeMatch = withoutHold.match(/\s-\s([^]+)$/);
  const rawEventTypeLabel = typeMatch?.[1]?.trim() ?? null;
  const rawEventType = mapEventType(rawEventTypeLabel, withoutHold);

  let clientLabel: string | null = null;
  if (tailMatch) {
    const afterTail = withoutHold.slice(withoutHold.indexOf(tailMatch[0]!) + tailMatch[0]!.length).trim();
    const clientMatch = afterTail.match(/^(.+?)\s*\([A-Z0-9]{3,4}\s*-\s*[A-Z0-9]{3,4}\)/);
    clientLabel = clientMatch?.[1]?.trim() ?? null;
  }

  return {
    isHold,
    tailNumber,
    clientLabel,
    depIcao,
    arrIcao,
    rawEventTypeLabel,
    rawEventType,
    isAdminBlock,
    summaryRaw: normalized,
  };
}

function mapEventType(label: string | null, fullSummary: string): ScheduleRawEventType {
  if (!label) {
    if (/\bNo Crew\b/i.test(fullSummary)) return "other";
    if (/\bScheduled MX\b/i.test(fullSummary) || /\bSchedule Mx\b/i.test(fullSummary)) {
      return "maintenance";
    }
    return "other";
  }

  const key = label.toLowerCase();
  if (EVENT_TYPE_MAP[key]) return EVENT_TYPE_MAP[key]!;

  if (key.includes("charter")) return "charter";
  if (key.includes("owner")) return "owner";
  if (key.includes("positioning")) return "positioning";
  if (key.includes("maintenance") || key.includes(" mx")) return "maintenance";
  if (key.includes("ferry")) return "ferry_mx";
  if (key.includes("training")) return "training";

  return "other";
}

export function isNoCrewBlock(summaryRaw: string): boolean {
  return /\bNo Crew\b/i.test(summaryRaw);
}
