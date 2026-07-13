import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toIcaoDisplay } from "@/lib/airports/code-match";
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
    depIcao: toIcaoDisplay(r.depIcao),
    arrIcao: toIcaoDisplay(r.arrIcao),
    fixedPrice: Number(r.fixedPrice),
    tailNumbers: r.tailNumbers,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.emptyLegRoutingProfile.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);

    const scope =
      body.scope != null
        ? (body.scope as EmptyLegRoutingProfileScope)
        : existing.scope;
    const publicListId =
      scope === "public_list"
        ? body.publicListId !== undefined
          ? body.publicListId
          : existing.publicListId
        : null;

    if (scope === "public_list" && !publicListId) {
      return jsonError("publicListId is required for public_list scope", 400);
    }

    const updated = await prisma.emptyLegRoutingProfile.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
        ...(body.scope != null ? { scope } : {}),
        publicListId,
        ...(typeof body.depIcao === "string"
          ? { depIcao: toIcaoDisplay(body.depIcao) }
          : {}),
        ...(typeof body.arrIcao === "string"
          ? { arrIcao: toIcaoDisplay(body.arrIcao) }
          : {}),
        ...(body.fixedPrice != null ? { fixedPrice: new Decimal(body.fixedPrice) } : {}),
        ...(body.tailNumbers !== undefined
          ? { tailNumbers: parseTailNumbers(body.tailNumbers) }
          : {}),
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
      },
    });

    return jsonOk(serialize(updated));
  } catch (e) {
    return handleApiError(e);
  }
}
