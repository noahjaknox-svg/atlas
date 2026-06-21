import type { PipelineStage, ProposalStatus, DataConfidence, AircraftCategory } from "@prisma/client";
import { getMissingInfoCount } from "@/lib/required-fields";

export const PIPELINE_COLUMNS: {
  id: PipelineStage;
  label: string;
}[] = [
  { id: "lead_research", label: "Lead / Research" },
  { id: "building", label: "Building Proposal" },
  { id: "internal_review", label: "Internal Review" },
  { id: "client_review", label: "Client Review" },
  { id: "closed", label: "Closed" },
];

export const PIPELINE_STATUS_FILTERS: { value: ProposalStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "internal_review", label: "Needs Review" },
  { value: "published", label: "Published" },
  { value: "viewed", label: "Viewed" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export const PIPELINE_DATE_RANGES = [
  { value: "all", label: "All time", days: null },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
] as const;

export type PipelineBadgeId =
  | "missing_info"
  | "needs_review"
  | "published"
  | "viewed"
  | "won"
  | "lost"
  | "parked"
  | "archived";

export interface PipelineBadge {
  id: PipelineBadgeId;
  label: string;
}

export interface PipelineCardInput {
  status: ProposalStatus;
  pipelineStage: PipelineStage;
  isParked: boolean;
  archived?: boolean;
  assumptions: { assumptionName: string; value: string; confidence: DataConfidence }[];
  clientPortal: { active: boolean; viewCount: number } | null;
}

export function getCardSubtitle(prospect: {
  prospectName: string;
  companyName: string | null;
  aircraftInstance: {
    tailNumber?: string | null;
    warehouseAircraft: { manufacturer: string | null; model: string | null; aircraftCategory?: string | null } | null;
  } | null;
}): string | null {
  const master = prospect.aircraftInstance?.warehouseAircraft;
  const tail = prospect.aircraftInstance?.tailNumber;
  if (master) {
    const model = `${master.manufacturer} ${master.model}`;
    return tail ? `${model} · ${tail}` : model;
  }
  if (prospect.companyName?.trim()) {
    return prospect.companyName.trim();
  }
  return null;
}

export function getPipelineBadges(input: PipelineCardInput): PipelineBadge[] {
  const badges: PipelineBadge[] = [];
  const missingCount = getMissingInfoCount(input.assumptions);

  if (input.archived) {
    badges.push({ id: "archived", label: "Archived" });
  }
  if (input.isParked) {
    badges.push({ id: "parked", label: "Parked" });
  }
  if (missingCount > 0) {
    badges.push({
      id: "missing_info",
      label: `Missing Info (${missingCount})`,
    });
  }
  if (input.status === "internal_review") {
    badges.push({ id: "needs_review", label: "Needs Review" });
  }
  if (input.status === "published") {
    badges.push({ id: "published", label: "Published" });
  }
  if (input.status === "viewed" || (input.clientPortal?.viewCount ?? 0) > 0) {
    badges.push({ id: "viewed", label: "Viewed" });
  }
  if (input.status === "won") {
    badges.push({ id: "won", label: "Won" });
  }
  if (input.status === "lost") {
    badges.push({ id: "lost", label: "Lost" });
  }

  const priority: PipelineBadgeId[] = [
    "archived",
    "parked",
    "missing_info",
    "needs_review",
    "published",
    "viewed",
    "won",
    "lost",
  ];

  return badges
    .sort((a, b) => priority.indexOf(a.id) - priority.indexOf(b.id))
    .slice(0, 3);
}

export function statusOnStageChange(
  newStage: PipelineStage,
  currentStatus: ProposalStatus
): ProposalStatus | undefined {
  if (newStage === "internal_review" && currentStatus === "draft") {
    return "internal_review";
  }
  return undefined;
}

export const BADGE_STYLES: Record<PipelineBadgeId, string> = {
  missing_info: "bg-amber-900/40 text-amber-200",
  needs_review: "bg-blue-900/40 text-blue-200",
  published: "bg-atlas-accent/20 text-atlas-accent",
  viewed: "bg-purple-900/40 text-purple-200",
  won: "bg-atlas-success/20 text-atlas-success",
  lost: "bg-atlas-danger/20 text-atlas-danger",
  parked: "bg-atlas-border text-atlas-muted",
  archived: "bg-atlas-border/80 text-atlas-muted line-through decoration-atlas-muted/50",
};

export function filterCardsByDateRange<T extends { updatedAt: string }>(
  cards: T[],
  range: string
): T[] {
  const spec = PIPELINE_DATE_RANGES.find((r) => r.value === range);
  if (!spec?.days) return cards;
  const cutoff = Date.now() - spec.days * 24 * 60 * 60 * 1000;
  return cards.filter((c) => new Date(c.updatedAt).getTime() >= cutoff);
}

export function matchesAircraftCategory(
  category: AircraftCategory | null | undefined,
  filter: string
): boolean {
  if (!filter || filter === "all") return true;
  return category === filter;
}
