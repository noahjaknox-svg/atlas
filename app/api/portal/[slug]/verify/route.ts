import { prisma } from "@/lib/db";
import {
  verifyPin,
  createPortalSession,
  checkPinRateLimit,
  recordPinFailure,
  clearPinAttempts,
} from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { pin } = await request.json();

    if (!pin) return jsonError("PIN required");

    const rateLimit = await checkPinRateLimit(slug);
    if (!rateLimit.allowed) {
      return jsonError("Too many attempts. Try again in 15 minutes.", 429);
    }

    const portal = await prisma.clientPortal.findUnique({
      where: { slug },
      include: { proposal: true },
    });

    if (!portal || !portal.active) {
      return jsonError("Portal not found or inactive", 404);
    }

    if (portal.expiresAt && portal.expiresAt < new Date()) {
      return jsonError("This proposal link has expired", 410);
    }

    const valid = await verifyPin(String(pin), portal.pinHash);
    if (!valid) {
      await recordPinFailure(slug);
      return jsonError("Invalid PIN", 401);
    }

    await clearPinAttempts(slug);
    await createPortalSession({
      portalId: portal.id,
      proposalId: portal.proposalId,
      slug,
    });

    return jsonOk({ success: true, redirect: `/${slug}/home` });
  } catch (e) {
    return handleApiError(e);
  }
}
