import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const airportIcao = parseOptionalString(body.airportIcao)?.toUpperCase();
    if (airportIcao) {
      const match = await prisma.airportReference.findFirst({
        where: { OR: [{ icao: airportIcao }, { ident: airportIcao }] },
        select: { id: true },
      });
      if (!match) return jsonError(`Unknown airport ICAO: ${airportIcao}`);
    }
    const row = await prisma.fbo.update({
      where: { id },
      data: {
        fboName: parseOptionalString(body.fboName),
        airportIcao,
        baseFuelRate: parseOptionalDecimal(body.baseFuelRate),
        hangarCostPerSqft:
          body.hangarCostPerSqft === "" || body.hangarCostPerSqft === null
            ? null
            : parseOptionalDecimal(body.hangarCostPerSqft),
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
    await prisma.fbo.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
