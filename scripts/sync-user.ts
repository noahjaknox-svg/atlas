/**
 * Sync a Supabase Auth user into the Atlas users table.
 * Usage: npx tsx scripts/sync-user.ts email@prismjet.com "Jane Admin" admin
 * Usage: npx tsx scripts/sync-user.ts email@prismjet.com "Jane Staff" staff aircraft_management,charter
 */
import "../lib/load-env";
import { PrismaClient, type AppDepartment, type UserRole } from "@prisma/client";
import { parseDepartmentIds } from "../lib/departments";

const prisma = new PrismaClient();

async function main() {
  const [, , email, name, role, departmentsArg] = process.argv;
  if (!email || !name || !role) {
    console.error(
      "Usage: npx tsx scripts/sync-user.ts <email> <name> <admin|staff> [departments_csv]"
    );
    process.exit(1);
  }

  if (role !== "admin" && role !== "staff") {
    console.error("Role must be admin or staff");
    process.exit(1);
  }

  let departments: AppDepartment[] = [];
  if (role === "staff") {
    const parsed = parseDepartmentIds(
      departmentsArg ? departmentsArg.split(",").map((part) => part.trim()) : ["aircraft_management"]
    );
    if (!parsed || parsed.length === 0) {
      console.error("Staff users need at least one department");
      process.exit(1);
    }
    departments = parsed;
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      role: role as UserRole,
      departments,
      active: true,
    },
    update: { name, role: role as UserRole, departments, active: true },
  });

  console.log("Synced user:", user.id, user.email, user.role, user.departments.join(","));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
