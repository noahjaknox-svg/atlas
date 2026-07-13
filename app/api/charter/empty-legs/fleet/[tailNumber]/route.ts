import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

function serialize(r: {
  id: string;
  tailNumber: string;
  aircraftType: string;
  publicDisplayType: string | null;
  aircraftProfileId: string | null;
  seatCount: number | null;
  luggageNote: string | null;
  wifi: boolean;
  amenitiesJson: unknown;
  description: string | null;
  primaryPhotoUrl: string | null;
  photoUrlsJson: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    tailNumber: r.tailNumber,
    aircraftType: r.aircraftType,
    publicDisplayType: r.publicDisplayType,
    aircraftProfileId: r.aircraftProfileId,
    seatCount: r.seatCount,
    luggageNote: r.luggageNote,
    wifi: r.wifi,
    amenities: Array.isArray(r.amenitiesJson) ? (r.amenitiesJson as string[]) : [],
    description: r.description,
    primaryPhotoUrl: r.primaryPhotoUrl,
    photoUrls: Array.isArray(r.photoUrlsJson) ? (r.photoUrlsJson as string[]) : [],
    isActive: r.isActive,
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

    const existing = await prisma.emptyLegFleetTailConfig.findUnique({
      where: { tailNumber },
    });

    const amenities =
      body.amenities !== undefined ? parseStringList(body.amenities) : undefined;
    const photoUrls =
      body.photoUrls !== undefined ? parseStringList(body.photoUrls, "\n") : undefined;

    if (!existing) {
      if (!body.aircraftType?.trim()) {
        return jsonError("aircraftType is required when creating a fleet config", 400);
      }
      const created = await prisma.emptyLegFleetTailConfig.create({
        data: {
          tailNumber,
          aircraftType: String(body.aircraftType).trim(),
          publicDisplayType: body.publicDisplayType?.trim() || null,
          aircraftProfileId: body.aircraftProfileId || null,
          seatCount: body.seatCount != null ? Number(body.seatCount) : null,
          luggageNote: body.luggageNote ?? null,
          wifi: Boolean(body.wifi),
          amenitiesJson: amenities ?? [],
          description: body.description ?? null,
          primaryPhotoUrl: body.primaryPhotoUrl ?? null,
          photoUrlsJson: photoUrls ?? [],
          isActive: body.isActive !== false,
        },
      });
      return jsonOk(serialize(created), 201);
    }

    const updated = await prisma.emptyLegFleetTailConfig.update({
      where: { tailNumber },
      data: {
        ...(typeof body.aircraftType === "string"
          ? { aircraftType: body.aircraftType.trim() }
          : {}),
        ...(body.publicDisplayType !== undefined
          ? { publicDisplayType: body.publicDisplayType?.trim() || null }
          : {}),
        ...(body.aircraftProfileId !== undefined
          ? { aircraftProfileId: body.aircraftProfileId || null }
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
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
      },
    });

    return jsonOk(serialize(updated));
  } catch (e) {
    return handleApiError(e);
  }
}
