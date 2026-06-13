/**
 * Remove a user from Supabase Auth and Atlas so a fresh invite can be sent.
 *
 * Usage:
 *   npx tsx scripts/reset-invite-user.ts nicktan584@gmail.com
 */
import "../lib/load-env";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

async function findSupabaseUserId(
  supabase: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function main() {
  const [, , rawEmail] = process.argv;
  if (!rawEmail?.trim()) {
    console.error("Usage: npx tsx scripts/reset-invite-user.ts <email>");
    process.exit(1);
  }

  const email = rawEmail.trim().toLowerCase();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Resetting invite state for ${email}…`);

  const authUserId = await findSupabaseUserId(supabase, email);
  if (authUserId) {
    const { error } = await supabase.auth.admin.deleteUser(authUserId);
    if (error) throw error;
    console.log("  ✓ Deleted Supabase Auth user");
  } else {
    console.log("  · No Supabase Auth user found");
  }

  const deletedInvites = await prisma.userInvite.deleteMany({ where: { email } });
  console.log(`  ✓ Removed ${deletedInvites.count} user_invite row(s)`);

  const atlasUser = await prisma.user.findUnique({ where: { email } });
  if (atlasUser) {
    try {
      await prisma.user.delete({ where: { email } });
      console.log("  ✓ Deleted Atlas users row");
    } catch {
      await prisma.user.update({
        where: { email },
        data: { active: false },
      });
      console.log("  ✓ Deactivated Atlas users row (has linked records; delete manually if needed)");
    }
  } else {
    console.log("  · No Atlas users row found");
  }

  console.log("\nDone. Re-send the invite from Settings → Users.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
