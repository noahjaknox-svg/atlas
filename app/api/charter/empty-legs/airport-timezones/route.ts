import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { airportCodeKey, toIcaoDisplay } from "@/lib/airports/code-match";

const COMMON_IANA_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Honolulu",
  "America/Boise",
  "America/Detroit",
  "America/Indiana/Indianapolis",
  "Pacific/Honolulu",
  "UTC",
] as const;

function normalizeIcao(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  return toIcaoDisplay(raw.trim().toUpperCase());
}

function isLikelyIana(tz: string): boolean {
  if (tz === "UTC") return true;
  if (!tz.includes("/")) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    await requireDepartmentAccess("charter");
    const icaoParam = new URL(request.url).searchParams.get("icao");
    if (icaoParam) {
      const icao = normalizeIcao(icaoParam);
      if (!icao) return jsonError("Invalid icao", 400);
      const keys = [icao, airportCodeKey(icao)];
      const row = await prisma.airportTimezoneOverride.findFirst({
        where: { icao: { in: keys } },
      });
      return jsonOk({
        override: row,
        commonZones: COMMON_IANA_ZONES,
      });
    }

    const rows = await prisma.airportTimezoneOverride.findMany({
      orderBy: { icao: "asc" },
      take: 500,
    });
    return jsonOk({ overrides: rows, commonZones: COMMON_IANA_ZONES });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireDepartmentAccess("charter");
    const body = await request.json();
    const icao = normalizeIcao(body.icao);
    const ianaTimezone =
      typeof body.ianaTimezone === "string" ? body.ianaTimezone.trim() : "";
    const note =
      typeof body.note === "string"
        ? body.note.trim() || null
        : body.note === null
          ? null
          : undefined;

    if (!icao) return jsonError("icao is required", 400);
    if (!ianaTimezone || !isLikelyIana(ianaTimezone)) {
      return jsonError("Valid ianaTimezone is required", 400);
    }
    if (ianaTimezone === "UTC") {
      return jsonError(
        "UTC is not a departure-airport local zone. Use a real IANA zone or delete the override.",
        400
      );
    }

    const storedIcao = airportCodeKey(icao).length === 3 ? airportCodeKey(icao) : icao;

    const row = await prisma.airportTimezoneOverride.upsert({
      where: { icao: storedIcao },
      create: {
        icao: storedIcao,
        ianaTimezone,
        note: note ?? null,
        updatedById: user.id,
      },
      update: {
        ianaTimezone,
        ...(note !== undefined ? { note } : {}),
        updatedById: user.id,
      },
    });

    return jsonOk(row);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireDepartmentAccess("charter");
    const icao = normalizeIcao(new URL(request.url).searchParams.get("icao"));
    if (!icao) return jsonError("icao is required", 400);
    const keys = Array.from(new Set([icao, airportCodeKey(icao)]));
    await prisma.airportTimezoneOverride.deleteMany({
      where: { icao: { in: keys } },
    });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
