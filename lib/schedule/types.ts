import type {
  ScheduleAvailabilityClass,
  ScheduleRawEventType,
} from "@prisma/client";

export interface ParsedSummary {
  isHold: boolean;
  tailNumber: string | null;
  clientLabel: string | null;
  depIcao: string | null;
  arrIcao: string | null;
  rawEventTypeLabel: string | null;
  rawEventType: ScheduleRawEventType;
  isAdminBlock: boolean;
  summaryRaw: string;
}

export interface ParsedDescription {
  paxCount: number | null;
  picName: string | null;
  sicName: string | null;
  cabinCrew: string[];
}

export interface ParsedIcsEvent {
  externalUid: string;
  startsAt: Date;
  endsAt: Date;
  lastModifiedAt: Date | null;
  locationIcao: string | null;
  summaryRaw: string;
  descriptionRaw: string | null;
  externalUrl: string | null;
  externalTripCode: string | null;
  rawIcs: Record<string, unknown>;
}

export interface NormalizedScheduleEvent extends ParsedSummary, ParsedDescription {
  externalUid: string;
  startsAt: Date;
  endsAt: Date;
  lastModifiedAt: Date | null;
  locationIcao: string | null;
  depIcao: string | null;
  arrIcao: string | null;
  descriptionRaw: string | null;
  externalUrl: string | null;
  externalTripCode: string | null;
  availabilityClass: ScheduleAvailabilityClass;
  rawIcs: Record<string, unknown>;
}

export type KanbanColumnId =
  | "available"
  | "repo_opportunity"
  | "soft_hold"
  | "hard_block";

export interface AvailabilityWindow {
  id: string;
  tailNumber: string;
  locationIcao: string;
  startsAt: Date;
  endsAt: Date;
  fleetAircraftId: string | null;
}

export interface KanbanEventCard {
  id: string;
  kind: "event";
  column: KanbanColumnId;
  tailNumber: string;
  depIcao: string | null;
  arrIcao: string | null;
  locationIcao: string | null;
  startsAt: string;
  endsAt: string;
  clientLabel: string | null;
  paxCount: number | null;
  picName: string | null;
  sicName: string | null;
  crewShort: string | null;
  rawEventType: ScheduleRawEventType;
  availabilityClass: ScheduleAvailabilityClass;
  isHold: boolean;
  isAdminBlock: boolean;
  externalUrl: string | null;
  externalTripCode: string | null;
  badges: string[];
}

export interface KanbanAvailableCard {
  id: string;
  kind: "available";
  column: "available";
  tailNumber: string;
  locationIcao: string;
  startsAt: string;
  endsAt: string;
  fleetAircraftId: string | null;
}

export type KanbanCard = KanbanEventCard | KanbanAvailableCard;

export interface MatchReasoning {
  locationFit: boolean;
  tailLocation: string | null;
  repositionRequired: boolean;
  repositionFrom: string | null;
  hardBlockOverlap: boolean;
  softHoldOverlap: boolean;
  repoBoost: boolean;
  repoLegId: string | null;
  notes: string[];
}
