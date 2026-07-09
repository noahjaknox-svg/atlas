import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { EmptyLegRoutingProfileScope } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

function serialize(r: {
  id: string;
  name: string;
  scope: EmptyLegRoutingProfileScope;
  publicListId: string | null;
  depIcao: string;
  arrIcao: string;
  fixedPrice: Decimal;
  tailNumbers: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    name: r.name,
    scope: r.scope,
    publicListId: r.publicListId,
    depIcao: r.depIcao,
    arrIcao: r.arrIcao,
    fixedPrice: Number(r.fixedPrice),
    tailNumbers: r.tailNumbers,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    await requireDepartmentAccess("charter");
    const rows = await prisma.emptyLegRoutingProfile.findMany({
      orderBy: [{ scope: "asc" }, { name: "asc" }],
    });
    return jsonOk(rows.map(serialize));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("charter");
    const body = await request.json();
    if (!body.name?.trim()) return jsonError("name is required", 400);
    if (!body.depIcao?.trim() || !body.arrIcao?.trim()) {
      return jsonError("depIcao and arrIcao are required", 400);
    }
    if (body.fixedPrice == null || Number.isNaN(Number(body.fixedPrice))) {
      return jsonError("fixedPrice is required", 400);
    }

    const scope = (body.scope as EmptyLegRoutingProfileScope) ?? "global";
    if (scope === "public_list" && !body.publicListId) {
      return jsonError("publicListId is required for public_list scope", 400);
    }

    const tailNumbers = parseTailNumbers(body.tailNumbers);

    const created = await prisma.emptyLegRoutingProfile.create({
      data: {
        name: String(body.name).trim(),
        scope,
        publicListId: scope === "public_list" ? body.publicListId : null,
        depIcao: String(body.depIcao).trim().toUpperCase(),
        arrIcao: String(body.arrIcao).trim().toUpperCase(),
        fixedPrice: new Decimal(body.fixedPrice),
        tailNumbers,
        isActive: body.isActive !== false,
      },
    });

    return jsonOk(serialize(created), 201);
  } catch (e) {
    return handleApiError(e);
  }
}

function parseTailNumbers(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((t) => String(t).trim().toUpperCase()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
  }
  return [];
}
