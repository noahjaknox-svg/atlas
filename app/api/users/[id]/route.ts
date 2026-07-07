import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { parseDepartmentIds } from "@/lib/departments";
import { prisma } from "@/lib/db";
import type { AppDepartment, UserRole } from "@prisma/client";

function normalizeUserUpdate(body: {
  role?: unknown;
  departments?: unknown;
  active?: unknown;
  name?: unknown;
}) {
  const role =
    body.role === "admin" || body.role === "staff" ? (body.role as UserRole) : undefined;

  let departments: AppDepartment[] | undefined;
  if (body.departments !== undefined) {
    const parsed = parseDepartmentIds(body.departments);
    if (!parsed) throw new Error("VALIDATION");
    departments = parsed;
  }

  if (role === "admin") {
    departments = [];
  } else if (role === "staff" && departments === undefined) {
    departments = undefined;
  }

  return {
    role,
    departments,
    active: typeof body.active === "boolean" ? body.active : undefined,
    name: typeof body.name === "string" ? body.name : undefined,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const data = normalizeUserUpdate(body);

    if (data.active === false && id === admin.id) {
      throw new Error("You cannot deactivate your own account.");
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    return jsonOk(user);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    if (id === admin.id) {
      throw new Error("You cannot deactivate your own account.");
    }

    const user = await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    return jsonOk(user);
  } catch (e) {
    return handleApiError(e);
  }
}
