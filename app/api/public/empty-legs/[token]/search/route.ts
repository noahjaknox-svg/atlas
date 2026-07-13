import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loadPublicListPayload } from "@/lib/charter/empty-legs/public-payload";
import { estimateOffRoutingHours } from "@/lib/charter/empty-legs/pricing";
import { airportCodesMatch } from "@/lib/airports/code-match";

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3440.065;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function resolveAirports(query: string, radiusNm: number) {
  const q = query.trim();
  if (!q) return [] as { icao: string; name: string; municipality: string | null }[];

  const upper = q.toUpperCase();
  const exact = await prisma.airportReference.findMany({
    where: {
      OR: [
        { icao: { equals: upper, mode: "insensitive" } },
        { iata: { equals: upper, mode: "insensitive" } },
        { ident: { equals: upper, mode: "insensitive" } },
      ],
    },
    take: 10,
    select: {
      icao: true,
      ident: true,
      name: true,
      municipality: true,
      latitudeDeg: true,
      longitudeDeg: true,
    },
  });
  if (exact.length > 0) {
    return exact.map((a) => ({
      icao: (a.icao || a.ident).toUpperCase(),
      name: a.name,
      municipality: a.municipality,
    }));
  }

  const cityMatches = await prisma.airportReference.findMany({
    where: {
      OR: [
        { municipality: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
      latitudeDeg: { not: null },
      longitudeDeg: { not: null },
    },
    take: 40,
    select: {
      icao: true,
      ident: true,
      name: true,
      municipality: true,
      latitudeDeg: true,
      longitudeDeg: true,
    },
  });

  if (cityMatches.length === 0) return [];

  const anchor = cityMatches[0]!;
  return cityMatches
    .filter((a) => {
      if (a.latitudeDeg == null || a.longitudeDeg == null) return false;
      return (
        haversineNm(
          Number(anchor.latitudeDeg),
          Number(anchor.longitudeDeg),
          Number(a.latitudeDeg),
          Number(a.longitudeDeg)
        ) <= radiusNm
      );
    })
    .map((a) => ({
      icao: (a.icao || a.ident).toUpperCase(),
      name: a.name,
      municipality: a.municipality,
    }));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const payload = await loadPublicListPayload(prisma, token);
    if (payload.status === "not_found") return jsonError("Not found", 404);
    if (payload.status === "revoked") {
      return jsonOk({
        revoked: true,
        message: "This empty leg list is no longer available.",
      });
    }

    const searchParams = new URL(request.url).searchParams;
    const depQ = searchParams.get("dep")?.trim() ?? "";
    const arrQ = searchParams.get("arr")?.trim() ?? "";
    const dateQ = searchParams.get("date")?.trim() ?? "";

    if (!depQ && !arrQ && !dateQ) {
      return jsonOk({
        mode: "browse",
        matches: payload.items,
        offRoutingCandidates: [],
        promptCustomQuote: false,
      });
    }

    const depAirports = depQ
      ? await resolveAirports(depQ, payload.citySearchRadiusNm)
      : [];
    const arrAirports = arrQ
      ? await resolveAirports(arrQ, payload.citySearchRadiusNm)
      : [];
    const depCodes = new Set(depAirports.map((a) => a.icao.toUpperCase()));
    const arrCodes = new Set(arrAirports.map((a) => a.icao.toUpperCase()));

    const dateStart = dateQ ? new Date(`${dateQ}T00:00:00.000Z`) : null;
    const dateEnd = dateQ ? new Date(`${dateQ}T23:59:59.999Z`) : null;

    const depCodeList = Array.from(depCodes);
    const arrCodeList = Array.from(arrCodes);

    const exact = payload.items.filter((item) => {
      const depOk =
        depCodeList.length === 0 ||
        depCodeList.some((c) => airportCodesMatch(c, item.depIcao));
      const arrOk =
        arrCodeList.length === 0 ||
        arrCodeList.some((c) => airportCodesMatch(c, item.arrIcao));
      const dateOk =
        !dateStart ||
        !dateEnd ||
        (new Date(item.scheduledDepartureAt) >= dateStart &&
          new Date(item.scheduledDepartureAt) <= dateEnd) ||
        (item.slidingWindowStartAt != null &&
          item.slidingWindowEndAt != null &&
          new Date(item.slidingWindowStartAt) <= dateEnd &&
          new Date(item.slidingWindowEndAt) >= dateStart);
      return depOk && arrOk && dateOk;
    });

    if (exact.length > 0) {
      return jsonOk({
        mode: "exact",
        matches: exact,
        offRoutingCandidates: [],
        promptCustomQuote: false,
        resolvedDep: depAirports,
        resolvedArr: arrAirports,
      });
    }

    const requestedDep = depAirports[0]?.icao ?? depQ.toUpperCase();
    const requestedArr = arrAirports[0]?.icao ?? arrQ.toUpperCase();

    const offRoutingCandidates = payload.items.filter((item) => {
      if (!requestedDep || !requestedArr) return false;
      const estimate = estimateOffRoutingHours({
        emptyLegDep: item.depIcao,
        emptyLegArr: item.arrIcao,
        requestedDep,
        requestedArr,
      });
      if (estimate == null) {
        return (
          airportCodesMatch(item.depIcao, requestedDep) ||
          airportCodesMatch(item.arrIcao, requestedArr)
        );
      }
      return (
        item.offRoutingAllowanceHours != null &&
        estimate <= item.offRoutingAllowanceHours
      );
    });

    return jsonOk({
      mode: offRoutingCandidates.length > 0 ? "off_routing" : "custom_quote",
      matches: [],
      offRoutingCandidates,
      promptCustomQuote: offRoutingCandidates.length === 0,
      promptOffRouting: offRoutingCandidates.length > 0,
      resolvedDep: depAirports,
      resolvedArr: arrAirports,
      requestedDep,
      requestedArr,
      requestedDate: dateQ || null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
