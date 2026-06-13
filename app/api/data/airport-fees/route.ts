import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { dec, dateStr } from "@/lib/data-hub-serialize";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const result = await fetchDataHubList(
      request,
      "airport-fees",
      (where, { skip, take }) =>
        prisma.airportFeeSchedule.findMany({
          where,
          skip,
          take,
          include: { airport: { select: { icao: true, airportName: true } } },
          orderBy: { effectiveDate: "desc" },
        }),
      () => prisma.airportFeeSchedule.count(),
      (rows) =>
        rows.map((r) => ({
          id: r.id,
          airportId: r.airportId,
          airportIcao: r.airport.icao,
          annualFee: dec(r.annualFee),
          source: r.source,
          effectiveDate: dateStr(r.effectiveDate),
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
    const annualFee = parseOptionalDecimal(body.annualFee);
    if (!airportId || annualFee == null) return jsonError("airportId and annualFee required");

    const row = await prisma.airportFeeSchedule.create({
      data: {
        airportId,
        annualFee,
        source: parseOptionalString(body.source),
        effectiveDate: parseOptionalDate(body.effectiveDate),
      },
    });
    return jsonOk(row, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
