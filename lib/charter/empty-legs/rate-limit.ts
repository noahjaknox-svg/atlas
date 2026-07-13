const hits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit = 8,
  windowMs = 60_000
): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfterMs: entry.resetAt - now };
  }
  entry.count += 1;
  return { ok: true };
}
