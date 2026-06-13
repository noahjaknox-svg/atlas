import "server-only";
import { createClient, type SupabaseClient, type User as SupabaseAuthUser } from "@supabase/supabase-js";
import { getInviteRedirectUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";

function requireSupabaseAdmin(): {
  supabase: SupabaseClient;
  anonKey: string;
  supabaseUrl: string;
} {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!serviceKey || !supabaseUrl) {
    throw new Error(
      "Cannot send invite emails: configure SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL on the server."
    );
  }
  if (!anonKey) {
    throw new Error(
      "Cannot resend invite emails: configure NEXT_PUBLIC_SUPABASE_ANON_KEY on the server."
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { supabase, anonKey, supabaseUrl };
}

async function resendSignupEmail(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  redirectTo: string
) {
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return anon.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: redirectTo },
  });
}

/** Send (or resend) a Supabase invite email. */
export async function sendSupabaseInviteEmail(email: string, name: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const redirectTo = getInviteRedirectUrl();
  const { supabase, anonKey, supabaseUrl } = requireSupabaseAdmin();

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      data: { name: name.trim() },
      redirectTo,
    }
  );

  if (!inviteError) {
    return { email: normalizedEmail, method: "invite" as const };
  }

  const alreadyRegistered = inviteError.message
    .toLowerCase()
    .includes("already been registered");

  if (!alreadyRegistered) {
    throw new Error(inviteError.message);
  }

  const { error: resendError } = await resendSignupEmail(
    supabaseUrl,
    anonKey,
    normalizedEmail,
    redirectTo
  );

  if (resendError) {
    throw new Error(
      `Could not resend invite: ${resendError.message}. Revoke the invite and try again, or reset the user with scripts/reset-invite-user.ts.`
    );
  }

  return { email: normalizedEmail, method: "resend" as const };
}

export async function upsertPendingInvite(input: {
  email: string;
  role: UserRole;
  invitedBy: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.userInvite.findFirst({
    where: { email, status: "pending" },
  });

  if (existing) {
    return prisma.userInvite.update({
      where: { id: existing.id },
      data: {
        role: input.role,
        invitedBy: input.invitedBy,
        invitedAt: new Date(),
      },
    });
  }

  return prisma.userInvite.create({
    data: {
      email,
      role: input.role,
      invitedBy: input.invitedBy,
      status: "pending",
    },
  });
}

async function listAllSupabaseUsers(supabase: SupabaseClient) {
  const users: SupabaseAuthUser[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < 200) break;
    page += 1;
  }

  return users;
}

/**
 * Reconcile pending invites with Supabase Auth and Atlas users.
 * - Marks accepted when an active Atlas user exists
 * - Backfills pending rows for invited Supabase users missing from user_invites
 */
export async function syncPendingInvites(adminId: string) {
  const pending = await prisma.userInvite.findMany({
    where: { status: "pending" },
  });

  for (const invite of pending) {
    const atlasUser = await prisma.user.findFirst({
      where: { email: invite.email, active: true },
    });
    if (atlasUser) {
      await prisma.userInvite.update({
        where: { id: invite.id },
        data: { status: "accepted", acceptedAt: new Date() },
      });
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const atlasEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map((u) =>
      u.email.toLowerCase()
    )
  );

  const authUsers = await listAllSupabaseUsers(supabase);

  for (const authUser of authUsers) {
    const email = authUser.email?.trim().toLowerCase();
    if (!email || atlasEmails.has(email)) continue;

    const isPendingInvite =
      !authUser.email_confirmed_at &&
      (authUser.invited_at != null || authUser.confirmation_sent_at != null);

    if (!isPendingInvite) continue;

    const existing = await prisma.userInvite.findFirst({
      where: { email, status: "pending" },
    });
    if (existing) continue;

    await prisma.userInvite.create({
      data: {
        email,
        role: "sales",
        invitedBy: adminId,
        status: "pending",
      },
    });
  }
}
