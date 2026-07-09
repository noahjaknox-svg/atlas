import { Resend } from "resend";
import type { CharterLead, EmptyLeg, EmptyLegPublicList, EmptyLegSettings, User } from "@prisma/client";
import {
  DEFAULT_CUSTOMER_EMAIL_TEMPLATE,
  DEFAULT_INTERNAL_EMAIL_TEMPLATE,
} from "@/lib/charter/empty-legs/defaults";

export type LeadEmailContext = {
  lead: CharterLead;
  list: EmptyLegPublicList;
  settings: EmptyLegSettings | null;
  emptyLeg: EmptyLeg | null;
  assigned: Pick<User, "name" | "email"> | null;
  showTailNumber: boolean;
  leadUrl: string;
  priceLabel?: string | null;
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function buildLeadTemplateVars(ctx: LeadEmailContext): Record<string, string> {
  const fullName = `${ctx.lead.firstName} ${ctx.lead.lastName}`.trim();
  const route = ctx.emptyLeg
    ? `${ctx.emptyLeg.depIcao} → ${ctx.emptyLeg.arrIcao}`
    : ctx.lead.requestedDep && ctx.lead.requestedArr
      ? `${ctx.lead.requestedDep} → ${ctx.lead.requestedArr}`
      : "";
  return {
    firstName: ctx.lead.firstName,
    lastName: ctx.lead.lastName,
    fullName,
    email: ctx.lead.email,
    phone: ctx.lead.phone,
    route,
    departure: ctx.emptyLeg?.scheduledDepartureAt.toISOString() ?? "",
    aircraftType: ctx.emptyLeg?.aircraftType ?? "",
    tailNumber: ctx.showTailNumber ? ctx.emptyLeg?.tailNumber ?? "" : "",
    sourceList: ctx.list.name,
    price: ctx.priceLabel ?? "",
    notes: ctx.lead.notes ?? "",
    requestType: ctx.lead.requestType.replace(/_/g, " "),
    matchedEmptyLeg: ctx.emptyLeg
      ? `${ctx.emptyLeg.tripNumber} · ${ctx.emptyLeg.routeKey}`
      : "—",
    requestedRoute:
      ctx.lead.requestedDep && ctx.lead.requestedArr
        ? `${ctx.lead.requestedDep} → ${ctx.lead.requestedArr}`
        : "—",
    requestedDate: ctx.lead.requestedDate?.toISOString() ?? "—",
    assignedRepresentative: ctx.assigned?.name ?? "Unassigned",
    leadUrl: ctx.leadUrl,
  };
}

export function renderLeadEmails(ctx: LeadEmailContext) {
  const vars = buildLeadTemplateVars(ctx);
  const internalTemplate =
    ctx.list.internalNotificationTemplateOverride ||
    ctx.settings?.internalNotificationTemplate ||
    DEFAULT_INTERNAL_EMAIL_TEMPLATE;
  const customerTemplate =
    ctx.list.confirmationTemplateOverride ||
    ctx.settings?.customerConfirmationTemplate ||
    DEFAULT_CUSTOMER_EMAIL_TEMPLATE;

  return {
    vars,
    internalHtml: fillTemplate(internalTemplate, vars),
    customerHtml: fillTemplate(customerTemplate, vars),
    recipient:
      ctx.list.recipientEmailOverride ||
      ctx.settings?.defaultLeadRecipientEmail ||
      null,
    sendCustomer: ctx.settings?.sendCustomerConfirmation !== false,
  };
}

export async function sendLeadEmails(ctx: LeadEmailContext): Promise<{
  status: "sent" | "failed" | "pending";
  error: string | null;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Atlas <onboarding@resend.dev>";
  const rendered = renderLeadEmails(ctx);

  if (!apiKey) {
    return { status: "failed", error: "RESEND_API_KEY is not configured" };
  }
  if (!rendered.recipient) {
    return {
      status: "failed",
      error: "No lead recipient email configured (list override or global default)",
    };
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: rendered.recipient,
      subject: `Empty leg lead: ${ctx.lead.firstName} ${ctx.lead.lastName}`,
      html: rendered.internalHtml,
    });

    if (rendered.sendCustomer) {
      await resend.emails.send({
        from,
        to: ctx.lead.email,
        subject: "We received your empty leg request",
        html: rendered.customerHtml,
      });
    }

    return { status: "sent", error: null };
  } catch (e) {
    return {
      status: "failed",
      error: e instanceof Error ? e.message : "Email send failed",
    };
  }
}

export function previewLeadEmail(
  template: string,
  sample: Record<string, string>
): string {
  return fillTemplate(template, sample);
}
