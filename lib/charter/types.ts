import type { CharterTripType } from "@prisma/client";
import type { MatchReasoning } from "@/lib/schedule/types";

export interface TripLegInput {
  depIcao: string;
  arrIcao: string;
  departAt: string | null;
  timeTbd: boolean;
  departPref: string;
}

export interface TripMatchInput {
  tripType: CharterTripType;
  flightCategory: string;
  paxCount: number;
  legs: TripLegInput[];
  clientName?: string;
  notes?: string;
}

export interface LegMatchReasoning extends MatchReasoning {
  legIndex: number;
  depIcao: string;
  arrIcao: string;
}

export interface MultiLegMatchReasoning {
  legs: LegMatchReasoning[];
  capacityFit: boolean;
  maxPassengers: number | null;
  notes: string[];
}

export interface CharterMatchResult {
  tailNumber: string;
  fleetAircraftId: string | null;
  aircraftType: string | null;
  maxPassengers: number | null;
  score: number;
  rank: number;
  recommended: boolean;
  reasoning: MultiLegMatchReasoning;
}
