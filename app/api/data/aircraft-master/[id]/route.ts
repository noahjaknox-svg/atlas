import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalDecimal, parseOptionalInt, parseOptionalString } from "@/lib/data-hub-parse";
import type { AircraftCategory, DataConfidence } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const row = await prisma.aircraftMaster.findUnique({
      where: { id },
      select: { id: true, manufacturer: true, model: true },
    });
    if (!row) return jsonError("Not found", 404);
    return jsonOk(row);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const row = await prisma.aircraftMaster.update({
      where: { id },
      data: {
        manufacturer: parseOptionalString(body.manufacturer),
        model: parseOptionalString(body.model),
        variant: parseOptionalString(body.variant),
        aircraftCategory: parseOptionalString(body.aircraftCategory) as AircraftCategory | undefined,
        typicalFuelBurnGph: parseOptionalDecimal(body.typicalFuelBurnGph),
        typicalCharterRate: parseOptionalDecimal(body.typicalCharterRate),
        maxRecommendedUtilization: parseOptionalInt(body.maxRecommendedUtilization),
        cabinSqft: parseOptionalInt(body.cabinSqft),
        typicalHullValue: parseOptionalDecimal(body.typicalHullValue),
        typicalCrewRequired: parseOptionalInt(body.typicalCrewRequired),
        typicalPassengerCapacity: parseOptionalInt(body.typicalPassengerCapacity),
        typicalRangeNm: parseOptionalInt(body.typicalRangeNm),
        typicalCruiseSpeedKtas: parseOptionalInt(body.typicalCruiseSpeedKtas),
        defaultEngineModel: parseOptionalString(body.defaultEngineModel),
        defaultApuModel: parseOptionalString(body.defaultApuModel),
        dataConfidence: parseOptionalString(body.dataConfidence) as DataConfidence | undefined,
        sourceNotes: parseOptionalString(body.sourceNotes),
      },
    });
    return jsonOk(row);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.aircraftMaster.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
