import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { aircraftTypeLabel } from "@/lib/charter/empty-legs/price-placement";

type TailWithType = {
  id: string;
  tailNumber: string;
  aircraftTypeId: string;
  publicDisplayType: string | null;
  seatCount: number | null;
  luggageNote: string | null;
  wifi: boolean;
  amenitiesJson: unknown;
  description: string | null;
  primaryPhotoUrl: string | null;
  photoUrlsJson: unknown;
  isPublicActive: boolean;
  emptyLegHourlyRateOverride: Decimal | null;
  createdAt: Date;
  updatedAt: Date;
  aircraftType: {
    manufacturer: string | null;
    model: string | null;
    displayName: string;
  } | null;
};

function serialize(r: TailWithType) {
  return {
    id: r.id,
    tailNumber: r.tailNumber,
    aircraftTypeId: r.aircraftTypeId,
    aircraftType: aircraftTypeLabel(r.aircraftType),
    publicDisplayType: r.publicDisplayType,
    seatCount: r.seatCount,
    luggageNote: r.luggageNote,
    wifi: r.wifi,
    amenities: Array.isArray(r.amenitiesJson) ? (r.amenitiesJson as string[]) : [],
    description: r.description,
    primaryPhotoUrl: r.primaryPhotoUrl,
    photoUrls: Array.isArray(r.photoUrlsJson) ? (r.photoUrlsJson as string[]) : [],
    isPublicActive: r.isPublicActive,
    emptyLegHourlyRateOverride:
      r.emptyLegHourlyRateOverride != null ? Number(r.emptyLegHourlyRateOverride) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    await requireDepartmentAccess("charter");
    const configs = await prisma.aircraftTail.findMany({
      include: { aircraftType: true },
      orderBy: { tailNumber: "asc" },
    });

    return jsonOk({
      configs: configs.map(serialize),
      suggestions: [],
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("charter");
    const body = await request.json();
    if (!body.tailNumber?.trim()) return jsonError("tailNumber is required", 400);
    if (!body.aircraftTypeId?.trim()) return jsonError("aircraftTypeId is required", 400);

    const amenities = parseStringList(body.amenities);
    const photoUrls = parseStringList(body.photoUrls, "\n");

    const created = await prisma.aircraftTail.create({
      data: {
        tailNumber: String(body.tailNumber).trim().toUpperCase(),
        aircraftTypeId: String(body.aircraftTypeId).trim(),
        publicDisplayType: body.publicDisplayType?.trim() || null,
        seatCount: body.seatCount != null ? Number(body.seatCount) : null,
        luggageNote: body.luggageNote ?? null,
        wifi: Boolean(body.wifi),
        amenitiesJson: amenities,
        description: body.description ?? null,
        primaryPhotoUrl: body.primaryPhotoUrl ?? null,
        photoUrlsJson: photoUrls,
        isPublicActive: body.isPublicActive !== false,
        emptyLegHourlyRateOverride:
          body.emptyLegHourlyRateOverride != null &&
          body.emptyLegHourlyRateOverride !== ""
            ? new Decimal(body.emptyLegHourlyRateOverride)
            : null,
      },
      include: { aircraftType: true },
    });

    return jsonOk(serialize(created), 201);
  } catch (e) {
    return handleApiError(e);
  }
}

function parseStringList(value: unknown, sep = ","): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(sep)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}
