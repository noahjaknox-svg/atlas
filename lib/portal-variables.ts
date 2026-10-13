import type { ProposalSnapshotPayload } from "./snapshot";
import { normalizeAircraftList } from "./portal-aircraft-types";
import { buildClubClientView, type ClubClientView } from "./club-client-view";
import { formatClubVariables } from "./club-variables";

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
  /** Charter block (taxi-to-taxi) and flight hours for the primary aircraft; feed the
   * "Block vs flight time" block. Not offered as text placeholders. */
  charterBlockHours?: string | null;
  charterFlightHours?: string | null;
  /** Membership-club view (Silverleaf proposals only). Feeds `clubEconomics` blocks. */
  club?: ClubClientView | null;
  /** Formatted club figures for {{club...}} placeholders (Silverleaf proposals only). */
  clubVariables?: Record<string, string>;
};

/** Text-valued context keys (excludes the structured club data). */
export type PortalTextVariableKey = Exclude<keyof PortalVariableContext, "club" | "clubVariables">;

export const PORTAL_VARIABLES: Array<{ key: PortalTextVariableKey; label: string }> = [
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
  contactName?: string,
  options: { designer?: boolean } = {}
): PortalVariableContext {
  const aircraftLabel =
    [payload.aircraft.manufacturer, payload.aircraft.model].filter(Boolean).join(" ") ||
    payload.aircraft.model;
  // Same source the built-in Charter page used (primary aircraft's frozen assumptions).
  const calc = normalizeAircraftList(payload)[0]?.calculationAssumptions ?? {};

  const club = buildClubClientView(payload, { forcePrismjet: options.designer });

  return {
    ...(club ? { club, clubVariables: formatClubVariables(club) } : {}),
    charterBlockHours: calc.charter_block_hours ?? null,
    charterFlightHours: calc.charter_flight_hours ?? null,
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
  if (vars.clubVariables) {
    for (const [key, value] of Object.entries(vars.clubVariables)) {
      out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
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
    const key = match[1] as PortalTextVariableKey;
    const value = key.startsWith("club") ? vars.clubVariables?.[key] : vars[key];
    if (value == null || value === "") {
      missing.add(key);
    }
  }
  return Array.from(missing);
}
