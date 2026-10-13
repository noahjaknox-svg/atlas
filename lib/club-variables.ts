import type { ClubClientView } from "@/lib/club-client-view";
import { membersPerAircraft } from "@/lib/club-proforma";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * Text placeholders for Silverleaf pages, e.g. "{{clubInitiationFee}}". Only resolved when the
 * proposal has a club model, so other proposals never see these keys.
 */
export const CLUB_VARIABLE_KEYS = [
  "clubInitiationFee",
  "clubMonthlyDues",
  "clubAnnualDues",
  "clubBlockRate",
  "clubAllocationHours",
  "clubMembersPerAircraft",
  "clubAnnualMemberCost",
  "clubAcquisitionTrigger",
  "clubAircraftCost",
  "clubDownPayment",
  "clubOverageMarkup",
  "clubConformityMonths",
  "clubOperatingShare",
] as const;

export function formatClubVariables(club: ClubClientView): Record<string, string> {
  const i = club.inputs;
  const annualDues = i.monthlyDues * 12;
  return {
    clubInitiationFee: usd(i.initiationFee),
    clubMonthlyDues: usd(i.monthlyDues),
    clubAnnualDues: usd(annualDues),
    clubBlockRate: usd(i.blockHourRate),
    clubAllocationHours: String(i.allocationHours),
    clubMembersPerAircraft: String(membersPerAircraft(i)),
    clubAnnualMemberCost: usd(annualDues + i.allocationHours * i.blockHourRate),
    clubAcquisitionTrigger: String(club.owner.acquisitionTrigger),
    clubAircraftCost: usd(i.assetCost),
    clubDownPayment: usd(i.assetCost * i.downPaymentPct),
    clubOverageMarkup: pct(i.overageMarkup),
    clubConformityMonths: String(i.conformityMonths),
    clubOperatingShare: pct(i.operatingSharePct),
  };
}
