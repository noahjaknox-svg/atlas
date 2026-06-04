import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const PORTAL_COOKIE = "atlas_portal_session";
const PIN_ATTEMPT_COOKIE = "atlas_pin_attempts";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}

export async function getInternalUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  return prisma.user.findFirst({
    where: { email: user.email, active: true },
  });
}

export async function requireInternalUser() {
  const user = await getInternalUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

function portalSecret() {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("PORTAL_SESSION_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export interface PortalSession {
  portalId: string;
  proposalId: string;
  slug: string;
}

export async function createPortalSession(session: PortalSession) {
  const token = await new SignJWT({
    portalId: session.portalId,
    proposalId: session.proposalId,
    slug: session.slug,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(portalSecret());

  const cookieStore = await cookies();
  cookieStore.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, portalSecret());
    return {
      portalId: payload.portalId as string,
      proposalId: payload.proposalId as string,
      slug: payload.slug as string,
    };
  } catch {
    return null;
  }
}

export async function clearPortalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_COOKIE);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function checkPinRateLimit(slug: string): Promise<{
  allowed: boolean;
  remainingAttempts?: number;
}> {
  const cookieStore = await cookies();
  const key = `${PIN_ATTEMPT_COOKIE}_${slug}`;
  const raw = cookieStore.get(key)?.value;
  if (!raw) return { allowed: true, remainingAttempts: MAX_PIN_ATTEMPTS };

  try {
    const data = JSON.parse(raw) as { count: number; lockedUntil?: number };
    if (data.lockedUntil && Date.now() < data.lockedUntil) {
      return { allowed: false };
    }
    if (data.count >= MAX_PIN_ATTEMPTS) {
      return { allowed: false };
    }
    return { allowed: true, remainingAttempts: MAX_PIN_ATTEMPTS - data.count };
  } catch {
    return { allowed: true, remainingAttempts: MAX_PIN_ATTEMPTS };
  }
}

export async function recordPinFailure(slug: string) {
  const cookieStore = await cookies();
  const key = `${PIN_ATTEMPT_COOKIE}_${slug}`;
  const raw = cookieStore.get(key)?.value;
  let count = 1;
  if (raw) {
    try {
      const data = JSON.parse(raw) as { count: number };
      count = data.count + 1;
    } catch {
      count = 1;
    }
  }

  const value =
    count >= MAX_PIN_ATTEMPTS
      ? JSON.stringify({
          count,
          lockedUntil: Date.now() + LOCKOUT_MINUTES * 60 * 1000,
        })
      : JSON.stringify({ count });

  cookieStore.set(key, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LOCKOUT_MINUTES * 60,
  });
}

export async function clearPinAttempts(slug: string) {
  const cookieStore = await cookies();
  cookieStore.delete(`${PIN_ATTEMPT_COOKIE}_${slug}`);
}
