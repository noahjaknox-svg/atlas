import "server-only";

import { jsonError } from "@/lib/api";

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export function requireCrewApiKey(request: Request): void {
  const key = process.env.CREW_API_KEY?.trim();
  if (!key) {
    throw new Error("CREW_API_KEY_NOT_CONFIGURED");
  }
  const token = extractBearerToken(request);
  if (!token || token !== key) {
    throw new Error("UNAUTHORIZED");
  }
}

export function handleCrewApiError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "CREW_API_KEY_NOT_CONFIGURED") {
      return jsonError("Crew API not configured", 503);
    }
    if (error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }
  }
  throw error;
}
