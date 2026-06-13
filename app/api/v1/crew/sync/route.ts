import { NextResponse } from "next/server";
import { jsonOk, handleApiError } from "@/lib/api";
import { requireCrewApiKey, handleCrewApiError } from "@/lib/crew/auth";
import { buildCrewSyncPayload } from "@/lib/crew/sync";

export async function GET(request: Request) {
  try {
    requireCrewApiKey(request);

    const url = new URL(request.url);
    const sinceRaw = url.searchParams.get("ifModifiedSince");
    let ifModifiedSince: Date | null = null;
    if (sinceRaw) {
      const d = new Date(sinceRaw);
      if (!Number.isNaN(d.getTime())) ifModifiedSince = d;
    }

    const payload = await buildCrewSyncPayload(ifModifiedSince);

    if (payload.unchanged) {
      return NextResponse.json(payload, { status: 200 });
    }

    return jsonOk(payload);
  } catch (e) {
    try {
      return handleCrewApiError(e);
    } catch {
      return handleApiError(e);
    }
  }
}
