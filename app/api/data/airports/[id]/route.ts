import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalInt, parseOptionalString } from "@/lib/data-hub-parse";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const row = await prisma.airport.findUnique({
      where: { id },
      select: { id: true, icao: true, airportName: true },
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
    const airport = await prisma.airport.update({
      where: { id },
      data: {
        icao: parseOptionalString(body.icao)?.toUpperCase(),
        airportName: parseOptionalString(body.airportName),
        city: parseOptionalString(body.city),
        state: parseOptionalString(body.state),
        country: parseOptionalString(body.country),
        iata: parseOptionalString(body.iata),
        timezone: parseOptionalString(body.timezone),
        runwayLengthFt: parseOptionalInt(body.runwayLengthFt),
        notes: parseOptionalString(body.notes),
      },
    });
    return jsonOk(airport);
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
    await prisma.airport.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
