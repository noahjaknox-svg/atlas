import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { dec } from "@/lib/data-hub-serialize";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const result = await fetchDataHubList(
      request,
      "fbos",
      (where, { skip, take }) =>
        prisma.fboLocation.findMany({
          where,
          skip,
          take,
          orderBy: { fboName: "asc" },
          include: { airport: { select: { icao: true, airportName: true } } },
        }),
      () => prisma.fboLocation.count(),
      (rows) =>
        rows.map((r) => ({
          id: r.id,
          airportId: r.airportId,
          airportIcao: r.airport.icao,
          fboName: r.fboName,
          jetARetailPrice: dec(r.jetARetailPrice),
          jetAContractPrice: dec(r.jetAContractPrice),
          phone: r.phone,
          website: r.website,
          manualOverride: r.manualOverride,
        }))
    );
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const airportId = parseOptionalString(body.airportId);
    const fboName = parseOptionalString(body.fboName);
    if (!airportId || !fboName) return jsonError("airportId and fboName required");

    const fbo = await prisma.fboLocation.create({
      data: {
        airportId,
        fboName,
        phone: parseOptionalString(body.phone),
        website: parseOptionalString(body.website),
        jetARetailPrice: parseOptionalDecimal(body.jetARetailPrice),
        jetAContractPrice: parseOptionalDecimal(body.jetAContractPrice),
        source: parseOptionalString(body.source) ?? "manual",
      },
    });
    return jsonOk(fbo, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
