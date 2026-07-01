import type { ProposalSnapshotPayload } from "./snapshot";

export type PortalVariableContext = {
  contactName?: string;
  companyName?: string | null;
  aircraftType?: string | null;
  homeBase?: string | null;
  proposalDate?: string | null;
  managementFee?: string | null;
  estimatedAnnualBudget?: string | null;
  charterRevenue?: string | null;
  ownerHours?: string | null;
  charterHours?: string | null;
  aircraftValue?: string | null;
  aircraftName?: string | null;
};

export const PORTAL_VARIABLES: Array<{ key: keyof PortalVariableContext; label: string }> = [
  { key: "contactName", label: "Contact name" },
  { key: "companyName", label: "Company name" },
  { key: "aircraftType", label: "Aircraft type" },
  { key: "aircraftName", label: "Aircraft name" },
  { key: "homeBase", label: "Home base" },
  { key: "proposalDate", label: "Proposal date" },
  { key: "managementFee", label: "Management fee" },
  { key: "estimatedAnnualBudget", label: "Estimated annual budget" },
  { key: "charterRevenue", label: "Charter revenue" },
  { key: "ownerHours", label: "Owner hours" },
  { key: "charterHours", label: "Charter hours" },
  { key: "aircraftValue", label: "Aircraft value" },
];

export function buildPortalVariableContext(
  payload: ProposalSnapshotPayload,
  contactName?: string
): PortalVariableContext {
  const aircraftLabel =
    [payload.aircraft.manufacturer, payload.aircraft.model].filter(Boolean).join(" ") ||
    payload.aircraft.model;

  return {
    contactName: contactName ?? payload.prospect.contactName,
    companyName: payload.prospect.companyName,
    aircraftType: aircraftLabel || null,
    aircraftName: aircraftLabel || null,
    homeBase: payload.aircraft.proposedHomeBase,
    proposalDate: payload.proposal.preparedDate,
    managementFee: payload.assumptions.management_fee?.value ?? null,
    estimatedAnnualBudget: String(payload.metrics.netAnnualCost ?? ""),
    charterRevenue: String(payload.metrics.charterRevenueOffset ?? ""),
    ownerHours: String(payload.metrics.ownerHours ?? ""),
    charterHours: payload.assumptions.charter_annual_hours?.value ?? null,
    aircraftValue: String(payload.metrics.aircraftValue ?? ""),
  };
}

/** Resolve {{variableName}} and legacy {contactName} placeholders. */
export function resolvePortalVariables(
  text: string | null | undefined,
  vars: PortalVariableContext
): string {
  if (!text) return "";

  let out = text;
  for (const { key } of PORTAL_VARIABLES) {
    const value = vars[key];
    if (value == null || value === "") continue;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, "g"), value);
    if (key === "contactName" || key === "aircraftName") {
      out = out.replace(new RegExp(`\\{${escaped}\\}`, "g"), value);
    }
  }
  return out;
}

export function findMissingPortalVariables(
  text: string | null | undefined,
  vars: PortalVariableContext
): string[] {
  if (!text) return [];
  const missing = new Set<string>();
  const pattern = /\{\{(\w+)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const key = match[1] as keyof PortalVariableContext;
    const value = vars[key];
    if (value == null || value === "") {
      missing.add(key);
    }
  }
  return Array.from(missing);
}
