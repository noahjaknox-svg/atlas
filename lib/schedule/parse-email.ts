export interface ParsedEmailRequest {
  requestedDepIcao: string | null;
  requestedArrIcao: string | null;
  requestedDepartAt: Date | null;
  paxCount: number | null;
  clientName: string | null;
  notes: string | null;
  parseConfidence: number;
  rawExtraction: Record<string, unknown>;
}

const ICAO_PAIR =
  /\b([A-Z]{3,4})\s*(?:to|→|->|-)\s*([A-Z]{3,4})\b/i;
const PAX_PATTERN = /\b(\d+)\s*(?:pax|passengers?|ppl|people)\b/i;
const DATE_PATTERNS = [
  /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,
  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?\b/i,
];

/** Rule-based extraction of charter intent from forwarded email text. */
export function parseCharterEmail(subject: string, body: string): ParsedEmailRequest {
  const text = `${subject}\n${body}`.replace(/\r\n/g, "\n");
  const rawExtraction: Record<string, unknown> = { subject, bodyLength: body.length };

  let requestedDepIcao: string | null = null;
  let requestedArrIcao: string | null = null;

  const routeMatch = text.match(ICAO_PAIR);
  if (routeMatch) {
    requestedDepIcao = routeMatch[1]!.toUpperCase();
    requestedArrIcao = routeMatch[2]!.toUpperCase();
    rawExtraction.routeMatch = routeMatch[0];
  }

  const paxMatch = text.match(PAX_PATTERN);
  const paxCount = paxMatch ? parseInt(paxMatch[1]!, 10) : null;
  if (paxMatch) rawExtraction.paxMatch = paxMatch[0];

  let requestedDepartAt: Date | null = null;
  for (const pattern of DATE_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const parsed = new Date(m[0]!);
      if (!Number.isNaN(parsed.getTime())) {
        requestedDepartAt = parsed;
        rawExtraction.dateMatch = m[0];
        break;
      }
    }
  }

  const clientName = extractClientName(subject);
  if (clientName) rawExtraction.clientName = clientName;

  let confidence = 0.2;
  if (requestedDepIcao && requestedArrIcao) confidence += 0.4;
  if (requestedDepartAt) confidence += 0.2;
  if (paxCount !== null) confidence += 0.1;
  if (clientName) confidence += 0.1;

  return {
    requestedDepIcao,
    requestedArrIcao,
    requestedDepartAt,
    paxCount,
    clientName,
    notes: body.slice(0, 2000) || null,
    parseConfidence: Math.min(confidence, 1),
    rawExtraction,
  };
}

function extractClientName(subject: string): string | null {
  const cleaned = subject
    .replace(/^(?:re|fw|fwd):\s*/gi, "")
    .replace(/\b(?:charter|quote|request|trip)\b/gi, "")
    .trim();
  if (cleaned.length >= 2 && cleaned.length <= 80) return cleaned;
  return null;
}
