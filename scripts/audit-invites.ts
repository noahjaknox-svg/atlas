import "../lib/load-env";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { getExternalAppUrl, getInviteRedirectUrl } from "../lib/app-url";

const prisma = new PrismaClient();

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const externalUrl = getExternalAppUrl();
  const inviteRedirect = getInviteRedirectUrl();

  console.log("=== Atlas invite audit ===\n");
  console.log("Env:");
  console.log("  NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "set" : "MISSING");
  console.log("  SUPABASE_SERVICE_ROLE_KEY:", serviceKey ? "set" : "MISSING");
  console.log("  NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL ?? "(default)");
  console.log("  NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL ?? "(unset)");
  console.log("  External links use:", externalUrl);

  try {
    const pending = await prisma.userInvite.count({ where: { status: "pending" } });
    const total = await prisma.userInvite.count();
    console.log("\nDB user_invites:");
    console.log("  table: OK");
    console.log("  total rows:", total);
    console.log("  pending:", pending);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("\nDB user_invites:");
    console.log("  table: ERROR");
    console.log("  message:", msg.slice(0, 400));
  }

  if (!supabaseUrl || !serviceKey) {
    console.log("\nSkipping Supabase audit (missing credentials).");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const atlasEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map((u) =>
      u.email.toLowerCase()
    )
  );

  let page = 1;
  let invitedAuthUsers = 0;
  let invitedWithoutDbRow = 0;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.log("\nSupabase listUsers error:", error.message);
      break;
    }

    for (const u of data.users) {
      const email = u.email?.toLowerCase();
      if (!email) continue;
      const isInvited =
        !u.email_confirmed_at &&
        (u.invited_at != null || u.confirmation_sent_at != null);
      if (!isInvited) continue;
      if (atlasEmails.has(email)) continue;

      invitedAuthUsers += 1;
      const dbInvite = await prisma.userInvite.findFirst({
        where: { email, status: "pending" },
      });
      if (!dbInvite) invitedWithoutDbRow += 1;
    }

    if (data.users.length < 200) break;
    page += 1;
  }

  console.log("\nSupabase invited users (not active Atlas users):");
  console.log("  count:", invitedAuthUsers);
  console.log("  missing pending user_invites row:", invitedWithoutDbRow);
  console.log("\nInvite redirect URL used by API:");
  console.log(`  ${inviteRedirect}`);

  const pendingRows = await prisma.userInvite.findMany({
    where: { status: "pending" },
    select: { email: true },
  });

  console.log("\nPending invite ↔ Supabase sync:");
  for (const inv of pendingRows) {
    const email = inv.email.toLowerCase();
    let scanPage = 1;
    let match: {
      email_confirmed_at?: string | null;
      invited_at?: string | null;
      confirmation_sent_at?: string | null;
    } | null = null;

    while (!match) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: scanPage,
        perPage: 200,
      });
      if (error) break;
      const u = data.users.find((x) => x.email?.toLowerCase() === email);
      if (u) {
        match = {
          email_confirmed_at: u.email_confirmed_at,
          invited_at: u.invited_at,
          confirmation_sent_at: u.confirmation_sent_at,
        };
        break;
      }
      if (data.users.length < 200) break;
      scanPage += 1;
    }

    const label = email.split("@")[0] + "@***";
    if (!match) {
      console.log(`  ${label}: no Supabase auth user (email likely never sent)`);
      continue;
    }
    console.log(
      `  ${label}: confirmed=${!!match.email_confirmed_at} invited_at=${!!match.invited_at} confirmation_sent=${!!match.confirmation_sent_at}`
    );
  }

  if (/localhost|127\.0\.0\.1/i.test(externalUrl)) {
    console.log(
      "\nWARNING: External URL is still localhost — invite links will not work for recipients."
    );
  }

  const atlasUsers = await prisma.user.findMany({ select: { email: true, active: true } });
  console.log("\nAtlas users:", atlasUsers.length);
  for (const inv of pendingRows) {
    const hasUser = atlasUsers.some((u) => u.email.toLowerCase() === inv.email.toLowerCase());
    const label = inv.email.split("@")[0] + "@***";
    console.log(`  ${label}: atlas_user=${hasUser}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
