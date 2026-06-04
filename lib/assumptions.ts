import type { ProposalAssumption } from "@prisma/client";
import { toNumber } from "./utils";

export type AssumptionMap = Record<string, string>;

export function assumptionsToMap(assumptions: ProposalAssumption[]): AssumptionMap {
  const map: AssumptionMap = {};
  for (const a of assumptions) {
    map[a.assumptionName] = a.value;
  }
  return map;
}

export function mapToNumericAssumptions(map: AssumptionMap): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    out[k] = toNumber(v);
  }
  return out;
}

export const WIZARD_STEPS = [
  { id: 1, key: "prospect", label: "Prospect" },
  { id: 2, key: "aircraft", label: "Aircraft" },
  { id: 3, key: "base", label: "Base Location" },
  { id: 4, key: "operating", label: "Operating Model" },
  { id: 5, key: "crew", label: "Crew Configuration" },
  { id: 6, key: "costs", label: "Costs & Programs" },
  { id: 7, key: "features", label: "Feature Options" },
  { id: 8, key: "charter", label: "Charter Revenue" },
  { id: 9, key: "sections", label: "Proposal Sections" },
  { id: 10, key: "review", label: "Review & Publish" },
] as const;

export const DEFAULT_SECTIONS = [
  { sectionType: "cover", title: "Cover", sortOrder: 1 },
  { sectionType: "executive_summary", title: "Executive Summary", sortOrder: 2 },
  { sectionType: "aircraft_overview", title: "Aircraft Overview", sortOrder: 3 },
  { sectionType: "management_approach", title: "Management Approach", sortOrder: 4 },
  { sectionType: "operating_assumptions", title: "Operating Assumptions", sortOrder: 5 },
  { sectionType: "charter_strategy", title: "Charter Revenue Strategy", sortOrder: 6 },
  { sectionType: "pro_forma", title: "Financial Pro Forma", sortOrder: 7 },
  { sectionType: "cost_breakdown", title: "Cost Breakdown", sortOrder: 8 },
  { sectionType: "transition_plan", title: "Transition Plan", sortOrder: 9 },
  { sectionType: "team", title: "PrismJet Team", sortOrder: 10 },
  { sectionType: "next_steps", title: "Next Steps", sortOrder: 11 },
  { sectionType: "disclaimer", title: "Disclaimer", sortOrder: 12 },
] as const;

export const SECTION_COPY: Record<string, string> = {
  cover:
    "This proposal provides a personalized view of your aircraft's estimated ownership costs, management structure, charter potential, and operating strategy.",
  executive_summary:
    "PrismJet's aircraft management approach is designed to give owners a clear, professional, and transparent path to operating their aircraft with confidence. This proposal outlines estimated ownership costs, operating assumptions, and potential charter revenue offsets based on the aircraft, base location, crew configuration, and utilization profile selected for this analysis.",
  management_approach:
    "PrismJet provides aircraft owners with a management structure focused on operational control, transparent cost oversight, crew coordination, maintenance support, and charter revenue opportunities where applicable.",
  pro_forma:
    "The pro forma below is designed to provide a practical estimate of annual and monthly aircraft ownership economics. These figures are based on the selected aircraft, proposed base, expected owner usage, charter assumptions, and PrismJet-controlled operating inputs.",
  disclaimer:
    "This proposal is an estimate for discussion purposes only. Final costs may vary based on aircraft records review, insurance underwriting, hangar availability, crew placement, maintenance program status, vendor quotes, fuel pricing, charter demand, and operational requirements. This proposal does not constitute a binding agreement.",
};
