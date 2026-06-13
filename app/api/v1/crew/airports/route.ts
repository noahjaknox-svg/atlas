import { NextResponse } from "next/server";
import { jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireCrewApiKey, handleCrewApiError } from "@/lib/crew/auth";
import { buildCrewAirportsPayloadFromDb } from "@/lib/ourairports/airports-payload";

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

    const payload = await buildCrewAirportsPayloadFromDb(prisma, ifModifiedSince);

    if (payload.unchanged) {
      return NextResponse.json(payload, { status: 200 });
    }

    return jsonOk(payload);
  } catch (e) {
    try {
      return handleCrewApiError(e);
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
}
