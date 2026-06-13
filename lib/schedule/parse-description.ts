import type { ParsedDescription } from "@/lib/schedule/types";

/** Parse JetInsight DESCRIPTION: Pax, PIC, SIC, Cabin crew lines. */
export function parseDescription(descriptionRaw: string | null | undefined): ParsedDescription {
  if (!descriptionRaw) {
    return { paxCount: null, picName: null, sicName: null, cabinCrew: [] };
  }

  const text = descriptionRaw.replace(/\\n/g, "\n").replace(/\\,/g, ",");

  const paxMatch = text.match(/Pax:\s*(\d+)/i);
  const paxCount = paxMatch ? parseInt(paxMatch[1]!, 10) : null;

  const picMatch = text.match(/PIC:\s*([^\n]+?)(?:\n|SIC:|Cabin crew:|$)/i);
  const sicMatch = text.match(/SIC:\s*([^\n]+?)(?:\n|Cabin crew:|PIC:|$)/i);
  const cabinMatch = text.match(/Cabin\s*crew:\s*([^\n]+)/i);

  const picName = cleanCrewName(picMatch?.[1]);
  const sicName = cleanCrewName(sicMatch?.[1]);
  const cabinCrew = cabinMatch?.[1]
    ? cabinMatch[1]
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return { paxCount, picName, sicName, cabinCrew };
}

function cleanCrewName(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
