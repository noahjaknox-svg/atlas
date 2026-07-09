import type {
  EmptyLeg,
  EmptyLegAvailabilityStatus,
  EmptyLegForceState,
  EmptyLegLifecycleStatus,
  EmptyLegPlacementStatus,
  Prisma,
} from "@prisma/client";

export const emptyLegListInclude = {
  placements: {
    include: {
      publicList: {
        select: { id: true, name: true, slug: true, isActive: true },
      },
    },
  },
  forceAppliedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.EmptyLegInclude;

export type EmptyLegListItem = Prisma.EmptyLegGetPayload<{
  include: typeof emptyLegListInclude;
}>;

export function serializeEmptyLeg(leg: EmptyLegListItem) {
  return {
    id: leg.id,
    tripNumber: leg.tripNumber,
    routeKey: leg.routeKey,
    depIcao: leg.depIcao,
    arrIcao: leg.arrIcao,
    tailNumber: leg.tailNumber,
    aircraftType: leg.aircraftType,
    sourceScheduleEventId: leg.sourceScheduleEventId,
    sourceIcalUid: leg.sourceIcalUid,
    sourceJetInsightUrl: leg.sourceJetInsightUrl,
    scheduledDepartureAt: leg.scheduledDepartureAt.toISOString(),
    scheduledArrivalAt: leg.scheduledArrivalAt.toISOString(),
    durationMinutes: leg.durationMinutes,
    lastSyncedAt: leg.lastSyncedAt?.toISOString() ?? null,
    availabilityStatus: leg.availabilityStatus,
    forceState: leg.forceState,
    forceAppliedBy: leg.forceAppliedBy,
    forceAppliedAt: leg.forceAppliedAt?.toISOString() ?? null,
    isFeatured: leg.isFeatured,
    slidingWindowStartAt: leg.slidingWindowStartAt?.toISOString() ?? null,
    slidingWindowEndAt: leg.slidingWindowEndAt?.toISOString() ?? null,
    internalNotes: leg.internalNotes,
    lifecycleStatus: leg.lifecycleStatus,
    historyReason: leg.historyReason,
    viewCount: leg.viewCount,
    detailOpenCount: leg.detailOpenCount,
    submissionCount: leg.submissionCount,
    createdAt: leg.createdAt.toISOString(),
    updatedAt: leg.updatedAt.toISOString(),
    placements: leg.placements.map((p) => ({
      id: p.id,
      publicListId: p.publicListId,
      publicListName: p.publicList.name,
      publicListSlug: p.publicList.slug,
      publicListActive: p.publicList.isActive,
      status: p.status,
      pricingMode: p.pricingMode,
      customPrice: p.customPrice != null ? Number(p.customPrice) : null,
      displayDiscountMode: p.displayDiscountMode,
      pricingResultJson: p.pricingResultJson,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };
}

export type EmptyLegFilters = {
  lifecycleStatus?: EmptyLegLifecycleStatus;
  availabilityStatus?: EmptyLegAvailabilityStatus;
  forceState?: EmptyLegForceState | "none";
  isFeatured?: boolean;
  tailNumber?: string;
  route?: string;
  publicListId?: string;
  placementStatus?: EmptyLegPlacementStatus;
  dateFrom?: string;
  dateTo?: string;
  includePast?: boolean;
  q?: string;
};

export function buildEmptyLegWhere(filters: EmptyLegFilters): Prisma.EmptyLegWhereInput {
  const where: Prisma.EmptyLegWhereInput = {
    lifecycleStatus: filters.lifecycleStatus ?? "active",
  };

  if (filters.availabilityStatus) where.availabilityStatus = filters.availabilityStatus;
  if (filters.isFeatured != null) where.isFeatured = filters.isFeatured;
  if (filters.tailNumber) {
    where.tailNumber = { contains: filters.tailNumber.toUpperCase(), mode: "insensitive" };
  }
  if (filters.route) {
    where.OR = [
      { routeKey: { contains: filters.route.toUpperCase(), mode: "insensitive" } },
      { depIcao: { contains: filters.route.toUpperCase(), mode: "insensitive" } },
      { arrIcao: { contains: filters.route.toUpperCase(), mode: "insensitive" } },
    ];
  }
  if (filters.forceState === "none") {
    where.forceState = null;
  } else if (filters.forceState) {
    where.forceState = filters.forceState;
  }
  if (filters.publicListId || filters.placementStatus) {
    where.placements = {
      some: {
        ...(filters.publicListId ? { publicListId: filters.publicListId } : {}),
        ...(filters.placementStatus ? { status: filters.placementStatus } : {}),
      },
    };
  }
  if (filters.dateFrom || filters.dateTo) {
    where.scheduledDepartureAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }
  if (!filters.includePast && !filters.dateFrom && !filters.dateTo) {
    where.OR = [
      ...(Array.isArray(where.OR) ? where.OR : where.OR ? [where.OR] : []),
      { slidingWindowEndAt: { gte: new Date() } },
      {
        AND: [{ slidingWindowEndAt: null }, { scheduledDepartureAt: { gte: new Date() } }],
      },
    ];
  }
  if (filters.q) {
    const q = filters.q.trim();
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { tripNumber: { contains: q, mode: "insensitive" } },
          { tailNumber: { contains: q, mode: "insensitive" } },
          { routeKey: { contains: q, mode: "insensitive" } },
          { aircraftType: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  return where;
}

export function summarizePlacements(
  placements: { status: EmptyLegPlacementStatus; publicListName?: string }[]
): string {
  if (placements.length === 0) return "—";
  const approved = placements.filter((p) => p.status === "approved").length;
  return `${approved}/${placements.length} approved`;
}

export type EmptyLegRow = ReturnType<typeof serializeEmptyLeg>;

export function isEmptyLeg(value: unknown): value is EmptyLeg {
  return !!value && typeof value === "object" && "tripNumber" in value;
}
