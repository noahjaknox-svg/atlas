import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getPublicListByToken } from "@/lib/charter/empty-legs/public-payload";
import { sendLeadEmails } from "@/lib/charter/empty-legs/email";
import { checkRateLimit } from "@/lib/charter/empty-legs/rate-limit";
import { mergeVisibleFields } from "@/lib/charter/empty-legs/defaults";
import type { CharterLeadRequestType } from "@prisma/client";
import { headers } from "next/headers";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const list = await getPublicListByToken(prisma, token);
    if (!list || list.tokenRevokedAt || !list.isActive) {
      return jsonError("This empty leg list is no longer available.", 410);
    }

    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      "unknown";
    const limited = checkRateLimit(`empty-leg-submit:${token}:${ip}`);
    if (!limited.ok) {
      return jsonError("Too many requests. Please try again shortly.", 429);
    }

    const body = await request.json();

    // Honeypot
    if (typeof body.companyWebsite === "string" && body.companyWebsite.trim()) {
      return jsonOk({ ok: true });
    }

    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phoneRaw = String(body.phone ?? "").trim();
    const phone = phoneRaw.replace(/[^\d+]/g, "");
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;
    const consentAccepted = body.consentAccepted === true;
    const requestType = body.requestType as CharterLeadRequestType;

    if (!firstName || !lastName) return jsonError("First and last name are required", 400);
    if (!EMAIL_RE.test(email)) return jsonError("Valid email is required", 400);
    if (!/^\+?\d{7,15}$/.test(phone)) {
      return jsonError("Phone must be 7–15 digits", 400);
    }
    if (!consentAccepted) return jsonError("Consent is required", 400);
    if (
      requestType !== "direct_empty_leg" &&
      requestType !== "off_routing_empty_leg" &&
      requestType !== "custom_quote"
    ) {
      return jsonError("Invalid request type", 400);
    }

    let placementId: string | null = body.placementId ?? null;
    let emptyLegId: string | null = body.emptyLegId ?? null;

    if (emptyLegId) {
      const placement = await prisma.emptyLegPlacement.findFirst({
        where: {
          publicListId: list.id,
          emptyLegId,
          status: "approved",
          emptyLeg: { lifecycleStatus: "active", availabilityStatus: "available" },
        },
      });
      if (!placement && requestType !== "custom_quote") {
        return jsonError("Empty leg is not available on this list", 400);
      }
      placementId = placement?.id ?? placementId;
    }

    const lead = await prisma.charterLead.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        notes,
        consentAccepted,
        requestType,
        requestedDep: body.requestedDep ? String(body.requestedDep).toUpperCase() : null,
        requestedArr: body.requestedArr ? String(body.requestedArr).toUpperCase() : null,
        requestedDate: body.requestedDate ? new Date(body.requestedDate) : null,
        requestedSearchJson: body.requestedSearchJson ?? {},
        emptyLegId,
        sourcePublicListId: list.id,
        sourcePlacementId: placementId,
        emailStatus: "pending",
      },
    });

    if (emptyLegId) {
      await prisma.emptyLeg.update({
        where: { id: emptyLegId },
        data: { submissionCount: { increment: 1 } },
      });
    }

    const [settings, emptyLeg] = await Promise.all([
      prisma.emptyLegSettings.findUnique({ where: { id: "default" } }),
      emptyLegId
        ? prisma.emptyLeg.findUnique({ where: { id: emptyLegId } })
        : Promise.resolve(null),
    ]);

    const visible = mergeVisibleFields({
      ...((settings?.defaultVisibleFieldsJson as object) ?? {}),
      ...((list.visibleFieldsJson as object) ?? {}),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
    const emailResult = await sendLeadEmails({
      lead,
      list,
      settings,
      emptyLeg,
      assigned: null,
      showTailNumber: visible.tailNumber,
      leadUrl: appUrl ? `${appUrl}/charter/leads` : "/charter/leads",
    });

    await prisma.charterLead.update({
      where: { id: lead.id },
      data: {
        emailStatus: emailResult.status === "sent" ? "sent" : "failed",
        emailError: emailResult.error,
      },
    });

    return jsonOk({
      ok: true,
      leadId: lead.id,
      emailStatus: emailResult.status === "sent" ? "sent" : "failed",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
