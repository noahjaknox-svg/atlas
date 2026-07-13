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

export async function GET() {
  try {
    await requireDepartmentAccess("charter");
    const configs = await prisma.emptyLegFleetTailConfig.findMany({
      orderBy: { tailNumber: "asc" },
    });

    if (configs.length > 0) {
      return jsonOk({
        configs: configs.map(serialize),
        suggestions: [],
      });
    }

    const crewFleet = await prisma.crewFleetAircraft.findMany({
      where: { status: "active" },
      include: { aircraftType: true },
      orderBy: { tailNumber: "asc" },
    });

    return jsonOk({
      configs: [],
      suggestions: crewFleet.map((f) => ({
        tailNumber: f.tailNumber,
        aircraftType: f.aircraftType.code,
        seatCount: f.aircraftType.maxPassengers,
      })),
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
    if (!body.aircraftType?.trim()) return jsonError("aircraftType is required", 400);

    const amenities = parseStringList(body.amenities);
    const photoUrls = parseStringList(body.photoUrls, "\n");

    const created = await prisma.emptyLegFleetTailConfig.create({
      data: {
        tailNumber: String(body.tailNumber).trim().toUpperCase(),
        aircraftType: String(body.aircraftType).trim(),
        publicDisplayType: body.publicDisplayType?.trim() || null,
        aircraftProfileId: body.aircraftProfileId || null,
        seatCount: body.seatCount != null ? Number(body.seatCount) : null,
        luggageNote: body.luggageNote ?? null,
        wifi: Boolean(body.wifi),
        amenitiesJson: amenities,
        description: body.description ?? null,
        primaryPhotoUrl: body.primaryPhotoUrl ?? null,
        photoUrlsJson: photoUrls,
        isActive: body.isActive !== false,
      },
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
