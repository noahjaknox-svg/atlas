/** Dev-only request timing helpers for diagnosing slow page loads. */
export function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function perfLog(label: string, startMs: number, detail?: string) {
  if (process.env.NODE_ENV !== "development") return;
  const elapsed = Math.round(perfNow() - startMs);
  const suffix = detail ? ` (${detail})` : "";
  console.log(`[perf] ${label}: ${elapsed}ms${suffix}`);
}

export async function perfTimed<T>(
  label: string,
  fn: () => Promise<T>,
  detail?: string
): Promise<T> {
  const start = perfNow();
  try {
    return await fn();
  } finally {
    perfLog(label, start, detail);
  }
}
