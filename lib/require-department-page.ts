import { redirect } from "next/navigation";
import type { AppDepartment, User } from "@prisma/client";
import { getDefaultHomeRoute, hasDepartmentAccess } from "@/lib/departments";

export function requireDepartmentPageAccess(
  user: Pick<User, "role" | "departments">,
  department: AppDepartment
) {
  if (!hasDepartmentAccess(user, department)) {
    redirect(getDefaultHomeRoute(user));
  }
}
