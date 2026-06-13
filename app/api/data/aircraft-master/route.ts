import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { dec } from "@/lib/data-hub-serialize";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalDecimal, parseOptionalInt, parseOptionalString } from "@/lib/data-hub-parse";
import type { AircraftCategory } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const result = await fetchDataHubList(
      request,
      "aircraft-master",
      (where, { skip, take }) =>
        prisma.aircraftMaster.findMany({
          where,
          skip,
          take,
          orderBy: [{ manufacturer: "asc" }, { model: "asc" }],
        }),
      () => prisma.aircraftMaster.count(),
      (rows) =>
        rows.map((a) => ({
          id: a.id,
          manufacturer: a.manufacturer,
          model: a.model,
          variant: a.variant,
          aircraftCategory: a.aircraftCategory,
          typicalFuelBurnGph: dec(a.typicalFuelBurnGph),
          typicalCharterRate: dec(a.typicalCharterRate),
          maxRecommendedUtilization: a.maxRecommendedUtilization,
          cabinSqft: a.cabinSqft,
          typicalHullValue: dec(a.typicalHullValue),
          dataConfidence: a.dataConfidence,
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
    const manufacturer = parseOptionalString(body.manufacturer);
    const model = parseOptionalString(body.model);
    const aircraftCategory = parseOptionalString(body.aircraftCategory) as AircraftCategory | undefined;
    if (!manufacturer || !model || !aircraftCategory) {
      return jsonError("manufacturer, model, and aircraftCategory required");
    }

    const row = await prisma.aircraftMaster.create({
      data: {
        manufacturer,
        model,
        aircraftCategory,
        variant: parseOptionalString(body.variant),
        typicalFuelBurnGph: parseOptionalDecimal(body.typicalFuelBurnGph),
        typicalCharterRate: parseOptionalDecimal(body.typicalCharterRate),
        maxRecommendedUtilization: parseOptionalInt(body.maxRecommendedUtilization),
        cabinSqft: parseOptionalInt(body.cabinSqft),
        typicalHullValue: parseOptionalDecimal(body.typicalHullValue),
        typicalCrewRequired: parseOptionalInt(body.typicalCrewRequired),
        typicalPassengerCapacity: parseOptionalInt(body.typicalPassengerCapacity),
        typicalRangeNm: parseOptionalInt(body.typicalRangeNm),
        typicalCruiseSpeedKtas: parseOptionalInt(body.typicalCruiseSpeedKtas),
        dataConfidence: (parseOptionalString(body.dataConfidence) as "low" | "medium" | "high") ?? "medium",
      },
    });
    return jsonOk(row, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
