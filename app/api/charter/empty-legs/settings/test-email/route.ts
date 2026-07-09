import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import {
  DEFAULT_CUSTOMER_EMAIL_TEMPLATE,
  DEFAULT_INTERNAL_EMAIL_TEMPLATE,
} from "@/lib/charter/empty-legs/defaults";
import { previewLeadEmail } from "@/lib/charter/empty-legs/email";

const SAMPLE_VARS: Record<string, string> = {
  firstName: "Alex",
  lastName: "Rivera",
  fullName: "Alex Rivera",
  email: "alex@example.com",
  phone: "+1 555-0100",
  route: "KSDL → KASE",
  departure: new Date().toISOString(),
  aircraftType: "King Air 350",
  tailNumber: "N123AB",
  sourceList: "Broker Partners",
  price: "$12,500",
  notes: "Flexible on departure time",
  requestType: "direct empty leg",
  matchedEmptyLeg: "T-1001 · KSDL-KASE",
  requestedRoute: "KSDL → KASE",
  requestedDate: new Date().toISOString(),
  assignedRepresentative: "Jordan Lee",
  leadUrl: "https://example.com/charter/leads",
};

export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("charter");
    const body = await request.json();
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const template = body.template === "customer" ? "customer" : "internal";
    if (!to) return jsonError("to is required", 400);

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || "Atlas <onboarding@resend.dev>";
    if (!apiKey) return jsonError("RESEND_API_KEY is not configured", 500);

    const settings = await prisma.emptyLegSettings.findUnique({ where: { id: "default" } });
    const raw =
      template === "customer"
        ? settings?.customerConfirmationTemplate || DEFAULT_CUSTOMER_EMAIL_TEMPLATE
        : settings?.internalNotificationTemplate || DEFAULT_INTERNAL_EMAIL_TEMPLATE;

    const html = previewLeadEmail(raw, SAMPLE_VARS);
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to,
      subject:
        template === "customer"
          ? "[Test] Empty leg customer confirmation"
          : "[Test] Empty leg internal notification",
      html,
    });

    return jsonOk({ sent: true, to, template });
  } catch (e) {
    return handleApiError(e);
  }
}
