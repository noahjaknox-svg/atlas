/**
 * Sync a Supabase Auth user into the Atlas users table.
 * Usage: npx tsx scripts/sync-user.ts email@prismjet.com "Jane Admin" admin
 */
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , email, name, role] = process.argv;
  if (!email || !name || !role) {
    console.error("Usage: npx tsx scripts/sync-user.ts <email> <name> <admin|sales|reviewer>");
    process.exit(1);
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      role: role as UserRole,
      active: true,
    },
    update: { name, role: role as UserRole, active: true },
  });

  console.log("Synced user:", user.id, user.email, user.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
