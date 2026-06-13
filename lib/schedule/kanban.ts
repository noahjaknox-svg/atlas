import type { ScheduleEvent } from "@prisma/client";
import type {
  AvailabilityWindow,
  KanbanAvailableCard,
  KanbanCard,
  KanbanColumnId,
  KanbanEventCard,
} from "@/lib/schedule/types";
import { KANBAN_COLUMNS } from "@/lib/schedule/kanban-columns";

export { KANBAN_COLUMNS };

export function eventToKanbanCard(event: ScheduleEvent): KanbanEventCard {
  const column = availabilityToColumn(event.availabilityClass, event.isHold);
  return {
    id: event.id,
    kind: "event",
    column,
    tailNumber: event.tailNumber,
    depIcao: event.depIcao,
    arrIcao: event.arrIcao,
    locationIcao: event.locationIcao,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    clientLabel: event.clientLabel,
    paxCount: event.paxCount,
    picName: event.picName,
    sicName: event.sicName,
    crewShort: formatCrewShort(event.picName, event.sicName),
    rawEventType: event.rawEventType,
    availabilityClass: event.availabilityClass,
    isHold: event.isHold,
    isAdminBlock: event.isAdminBlock,
    externalUrl: event.externalUrl,
    externalTripCode: event.externalTripCode,
    badges: buildBadges(event),
  };
}

export function windowToKanbanCard(window: AvailabilityWindow): KanbanAvailableCard {
  return {
    id: window.id,
    kind: "available",
    column: "available",
    tailNumber: window.tailNumber,
    locationIcao: window.locationIcao,
    startsAt: window.startsAt.toISOString(),
    endsAt: window.endsAt.toISOString(),
    fleetAircraftId: window.fleetAircraftId,
  };
}

export function buildKanbanBoard(
  events: ScheduleEvent[],
  windows: AvailabilityWindow[]
): Record<KanbanColumnId, KanbanCard[]> {
  const board: Record<KanbanColumnId, KanbanCard[]> = {
    available: windows.map(windowToKanbanCard),
    repo_opportunity: [],
    soft_hold: [],
    hard_block: [],
  };

  for (const event of events) {
    const card = eventToKanbanCard(event);
    board[card.column].push(card);
  }

  for (const col of KANBAN_COLUMNS) {
    board[col.id].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
  }

  return board;
}

function availabilityToColumn(
  availabilityClass: ScheduleEvent["availabilityClass"],
  isHold: boolean
): KanbanColumnId {
  if (isHold || availabilityClass === "soft_hold") return "soft_hold";
  if (availabilityClass === "repo_opportunity") return "repo_opportunity";
  if (availabilityClass === "hard_block") return "hard_block";
  return "hard_block";
}

function formatCrewShort(pic: string | null, sic: string | null): string | null {
  const picLast = pic?.split(/\s+/).pop();
  const sicLast = sic?.split(/\s+/).pop();
  if (picLast && sicLast) return `${picLast}/${sicLast}`;
  if (picLast) return picLast;
  if (sicLast) return sicLast;
  return null;
}

function buildBadges(event: ScheduleEvent): string[] {
  const badges: string[] = [];
  if (event.isHold) badges.push("HOLD");
  if (event.isAdminBlock) badges.push("DONT QUOTE");
  switch (event.rawEventType) {
    case "charter":
      badges.push("Charter");
      break;
    case "owner":
      badges.push("Owner");
      break;
    case "maintenance":
      badges.push("MX");
      break;
    case "positioning":
      badges.push("Repo");
      break;
    case "ferry_mx":
      badges.push("Ferry");
      break;
    case "training":
      badges.push("Training");
      break;
    default:
      if (/\bNo Crew\b/i.test(event.summaryRaw)) badges.push("No Crew");
  }
  return badges;
}
