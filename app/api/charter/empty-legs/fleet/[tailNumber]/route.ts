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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tailNumber: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { tailNumber: rawTail } = await params;
    const tailNumber = decodeURIComponent(rawTail).trim().toUpperCase();
    const body = await request.json();

    const existing = await prisma.aircraftTail.findUnique({
      where: { tailNumber },
    });

    const amenities =
      body.amenities !== undefined ? parseStringList(body.amenities) : undefined;
    const photoUrls =
      body.photoUrls !== undefined ? parseStringList(body.photoUrls, "\n") : undefined;

    if (!existing) {
      if (!body.aircraftTypeId?.trim()) {
        return jsonError("aircraftTypeId is required when creating a fleet tail", 400);
      }
      const created = await prisma.aircraftTail.create({
        data: {
          tailNumber,
          aircraftTypeId: String(body.aircraftTypeId).trim(),
          publicDisplayType: body.publicDisplayType?.trim() || null,
          seatCount: body.seatCount != null ? Number(body.seatCount) : null,
          luggageNote: body.luggageNote ?? null,
          wifi: Boolean(body.wifi),
          amenitiesJson: amenities ?? [],
          description: body.description ?? null,
          primaryPhotoUrl: body.primaryPhotoUrl ?? null,
          photoUrlsJson: photoUrls ?? [],
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
    }

    const updated = await prisma.aircraftTail.update({
      where: { tailNumber },
      data: {
        ...(typeof body.aircraftTypeId === "string" && body.aircraftTypeId.trim()
          ? { aircraftTypeId: body.aircraftTypeId.trim() }
          : {}),
        ...(body.publicDisplayType !== undefined
          ? { publicDisplayType: body.publicDisplayType?.trim() || null }
          : {}),
        ...(body.seatCount === null
          ? { seatCount: null }
          : body.seatCount != null
            ? { seatCount: Number(body.seatCount) }
            : {}),
        ...(body.luggageNote !== undefined ? { luggageNote: body.luggageNote } : {}),
        ...(typeof body.wifi === "boolean" ? { wifi: body.wifi } : {}),
        ...(amenities !== undefined ? { amenitiesJson: amenities } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.primaryPhotoUrl !== undefined
          ? { primaryPhotoUrl: body.primaryPhotoUrl }
          : {}),
        ...(photoUrls !== undefined ? { photoUrlsJson: photoUrls } : {}),
        ...(typeof body.isPublicActive === "boolean"
          ? { isPublicActive: body.isPublicActive }
          : {}),
        ...(body.emptyLegHourlyRateOverride === null ||
        body.emptyLegHourlyRateOverride === ""
          ? { emptyLegHourlyRateOverride: null }
          : body.emptyLegHourlyRateOverride != null
            ? {
                emptyLegHourlyRateOverride: new Decimal(body.emptyLegHourlyRateOverride),
              }
            : {}),
      },
      include: { aircraftType: true },
    });

    return jsonOk(serialize(updated));
  } catch (e) {
    return handleApiError(e);
  }
}
