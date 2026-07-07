import type { AppDepartment, User } from "@prisma/client";
import { ROUTES } from "@/lib/routes";

export type DepartmentId = AppDepartment;

export type DepartmentDefinition = {
  id: DepartmentId;
  label: string;
  prefix: string;
  homeHref: string;
};

export const DEPARTMENTS: readonly DepartmentDefinition[] = [
  {
    id: "aircraft_management",
    label: "Aircraft Management",
    prefix: "/aircraft-management",
    homeHref: ROUTES.home,
  },
  {
    id: "charter",
    label: "Charter",
    prefix: "/charter",
    homeHref: ROUTES.charter.find,
  },
  {
    id: "data_warehouse",
    label: "Data Warehouse",
    prefix: "/data-warehouse",
    homeHref: ROUTES.dataWarehouse.data,
  },
] as const;

export const ALL_DEPARTMENT_IDS: readonly DepartmentId[] = DEPARTMENTS.map((d) => d.id);

export function getDepartmentById(id: DepartmentId): DepartmentDefinition {
  const department = DEPARTMENTS.find((d) => d.id === id);
  if (!department) throw new Error(`Unknown department: ${id}`);
  return department;
}

export function getDepartmentForPathname(pathname: string): DepartmentDefinition {
  const match = DEPARTMENTS.find((department) => pathname.startsWith(department.prefix));
  return match ?? getDepartmentById("aircraft_management");
}

export function getUserDepartments(user: Pick<User, "role" | "departments">): DepartmentId[] {
  if (user.role === "admin") return [...ALL_DEPARTMENT_IDS];
  return user.departments;
}

export function hasDepartmentAccess(
  user: Pick<User, "role" | "departments">,
  departmentId: DepartmentId
): boolean {
  return getUserDepartments(user).includes(departmentId);
}

export function getDefaultHomeRoute(user: Pick<User, "role" | "departments">): string {
  const allowed = getUserDepartments(user);
  if (allowed.length === 0) return "/settings";
  return getDepartmentById(allowed[0]).homeHref;
}

export function formatDepartmentLabels(departments: DepartmentId[]): string {
  if (departments.length === 0) return "None";
  return departments.map((id) => getDepartmentById(id).label).join(", ");
}

export function getInternalShellProps(user: Pick<User, "name" | "role" | "departments">) {
  return {
    userName: user.name,
    isAdmin: user.role === "admin",
    allowedDepartments: getUserDepartments(user),
  };
}

export function parseDepartmentIds(value: unknown): DepartmentId[] | null {
  if (!Array.isArray(value)) return null;
  const valid = new Set(ALL_DEPARTMENT_IDS);
  const parsed = value.filter((item): item is DepartmentId => typeof item === "string" && valid.has(item as DepartmentId));
  if (parsed.length !== value.length) return null;
  return Array.from(new Set(parsed));
}
