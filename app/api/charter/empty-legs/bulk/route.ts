import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  hasHardBlockOverlap,
  resolveEmptyLegAvailability,
} from "@/lib/charter/empty-legs/availability";
import type {
  EmptyLegForceState,
  EmptyLegPlacementStatus,
  EmptyLegPricingMode,
} from "@prisma/client";

type BulkBody = {
  ids: string[];
  action:
    | "force_available"
    | "force_unavailable"
    | "remove_force"
    | "promote"
    | "unpromote"
    | "set_placement_status"
    | "apply_custom_price"
    | "clear_custom_price"
    | "assign_lists"
    | "remove_from_lists";
  placementStatus?: EmptyLegPlacementStatus;
  publicListIds?: string[];
  customPrice?: number;
  pricingMode?: EmptyLegPricingMode;
};

export async function POST(request: Request) {
  try {
    const user = await requireDepartmentAccess("charter");
    const body = (await request.json()) as BulkBody;
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return jsonError("ids are required", 400);
    }

    const legs = await prisma.emptyLeg.findMany({ where: { id: { in: body.ids } } });
    let updated = 0;

    if (
      body.action === "force_available" ||
      body.action === "force_unavailable" ||
      body.action === "remove_force"
    ) {
      const forceState: EmptyLegForceState | null =
        body.action === "force_available"
          ? "force_available"
          : body.action === "force_unavailable"
            ? "force_unavailable"
            : null;

      for (const leg of legs) {
        const events = await prisma.scheduleEvent.findMany({
          where: { deletedAt: null, tailNumber: leg.tailNumber },
        });
        const calendarBlocked = hasHardBlockOverlap({
          emptyLegEventId: leg.sourceScheduleEventId,
          tailNumber: leg.tailNumber,
          startsAt: leg.scheduledDepartureAt,
          endsAt: leg.scheduledArrivalAt,
          events,
        });
        await prisma.emptyLeg.update({
          where: { id: leg.id },
          data: {
            forceState,
            forceAppliedByUserId: forceState ? user.id : null,
            forceAppliedAt: forceState ? new Date() : null,
            availabilityStatus: resolveEmptyLegAvailability({ forceState, calendarBlocked }),
          },
        });
        updated++;
      }
    } else if (body.action === "promote" || body.action === "unpromote") {
      const result = await prisma.emptyLeg.updateMany({
        where: { id: { in: body.ids } },
        data: { isFeatured: body.action === "promote" },
      });
      updated = result.count;
    } else if (body.action === "set_placement_status") {
      if (!body.placementStatus) return jsonError("placementStatus required", 400);
      const result = await prisma.emptyLegPlacement.updateMany({
        where: {
          emptyLegId: { in: body.ids },
          ...(body.publicListIds?.length ? { publicListId: { in: body.publicListIds } } : {}),
        },
        data: { status: body.placementStatus },
      });
      updated = result.count;
    } else if (body.action === "apply_custom_price") {
      if (body.customPrice == null) return jsonError("customPrice required", 400);
      const result = await prisma.emptyLegPlacement.updateMany({
        where: {
          emptyLegId: { in: body.ids },
          ...(body.publicListIds?.length ? { publicListId: { in: body.publicListIds } } : {}),
        },
        data: {
          pricingMode: "custom",
          customPrice: body.customPrice,
        },
      });
      updated = result.count;
    } else if (body.action === "clear_custom_price") {
      const result = await prisma.emptyLegPlacement.updateMany({
        where: {
          emptyLegId: { in: body.ids },
          ...(body.publicListIds?.length ? { publicListId: { in: body.publicListIds } } : {}),
        },
        data: {
          pricingMode: body.pricingMode ?? "calculated",
          customPrice: null,
        },
      });
      updated = result.count;
    } else if (body.action === "assign_lists") {
      if (!body.publicListIds?.length) return jsonError("publicListIds required", 400);
      const lists = await prisma.emptyLegPublicList.findMany({
        where: { id: { in: body.publicListIds } },
      });
      for (const leg of legs) {
        for (const list of lists) {
          await prisma.emptyLegPlacement.upsert({
            where: {
              emptyLegId_publicListId: { emptyLegId: leg.id, publicListId: list.id },
            },
            create: {
              emptyLegId: leg.id,
              publicListId: list.id,
              status: list.defaultPlacementStatus,
              pricingMode: list.defaultPricingMode,
              displayDiscountMode: list.discountDisplayMode,
            },
            update: {},
          });
          updated++;
        }
      }
    } else if (body.action === "remove_from_lists") {
      if (!body.publicListIds?.length) return jsonError("publicListIds required", 400);
      const result = await prisma.emptyLegPlacement.deleteMany({
        where: {
          emptyLegId: { in: body.ids },
          publicListId: { in: body.publicListIds },
        },
      });
      updated = result.count;
    } else {
      return jsonError("Unknown action", 400);
    }

    return jsonOk({ updated });
  } catch (e) {
    return handleApiError(e);
  }
}
