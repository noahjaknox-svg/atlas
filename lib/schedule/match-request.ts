import type { ScheduleEvent } from "@prisma/client";
import type { MatchReasoning } from "@/lib/schedule/types";
import type { LegMatchReasoning, MultiLegMatchReasoning } from "@/lib/charter/types";
import { airportCodesMatch } from "@/lib/airports/code-match";
import { blocksCharterScheduling } from "@/lib/schedule/blocks-charter";
import { inferLocationAt } from "@/lib/schedule/location";

export interface CharterRequestInput {
  requestedDepIcao: string;
  requestedArrIcao: string;
  requestedDepartAt: Date;
  paxCount?: number | null;
}

export interface CharterLegInput {
  depIcao: string;
  arrIcao: string;
  requestedDepartAt: Date;
}

export interface FleetAircraftInput {
  tailNumber: string;
  id: string | null;
  homeBase: string | null;
  maxPassengers?: number | null;
  aircraftTypeLabel?: string | null;
}

export interface MatchCandidate {
  tailNumber: string;
  fleetAircraftId: string | null;
  aircraftType: string | null;
  maxPassengers: number | null;
  score: number;
  rank: number;
  recommended: boolean;
  reasoning: MultiLegMatchReasoning;
}

const TURN_BUFFER_MS = 2 * 60 * 60 * 1000;
const REPO_LOOKBACK_MS = 6 * 60 * 60 * 1000;
const BASE_SCORE = 100;
const SOFT_HOLD_PENALTY = 25;
const REPO_BOOST = 30;
const LOCATION_MISMATCH_PENALTY = 50;
const CAPACITY_MISMATCH_PENALTY = 40;
const LEG_DURATION_MS = 4 * 60 * 60 * 1000;

export function matchCharterRequest(
  request: CharterRequestInput,
  events: ScheduleEvent[],
  fleet: FleetAircraftInput[]
): MatchCandidate[] {
  return matchCharterLegs(
    [
      {
        depIcao: request.requestedDepIcao,
        arrIcao: request.requestedArrIcao,
        requestedDepartAt: request.requestedDepartAt,
      },
    ],
    events,
    fleet,
    request.paxCount
  );
}

export function matchCharterLegs(
  legs: CharterLegInput[],
  events: ScheduleEvent[],
  fleet: FleetAircraftInput[],
  paxCount?: number | null
): MatchCandidate[] {
  const candidates: MatchCandidate[] = [];

  for (const ac of fleet) {
    const tailEvents = events.filter(
      (e) => e.tailNumber === ac.tailNumber && !e.deletedAt
    );

    const legReasonings: LegMatchReasoning[] = legs.map((leg, legIndex) => {
      const dep = leg.depIcao.toUpperCase();
      const reqEnd = new Date(leg.requestedDepartAt.getTime() + LEG_DURATION_MS);
      const reasoning = buildReasoning(
        leg.requestedDepartAt,
        dep,
        reqEnd,
        tailEvents,
        ac
      );
      return {
        legIndex,
        depIcao: dep,
        arrIcao: leg.arrIcao.toUpperCase(),
        ...reasoning,
      };
    });

    const notes: string[] = [];
    let score: number;
    const legScores = legReasonings.map((leg) => scoreLeg(leg));
    if (legs.length > 1) {
      score = Math.min(...legScores);
      if (score <= 0) {
        notes.push("One or more legs has a hard schedule conflict");
      }
    } else {
      score = legScores[0] ?? 0;
    }

    const capacityFit =
      paxCount == null ||
      ac.maxPassengers == null ||
      paxCount <= ac.maxPassengers;

    if (!capacityFit) {
      score = Math.max(0, score - CAPACITY_MISMATCH_PENALTY);
      notes.push(
        `Passenger count ${paxCount} exceeds capacity ${ac.maxPassengers}`
      );
    }

    if (score > 0) {
      candidates.push({
        tailNumber: ac.tailNumber,
        fleetAircraftId: ac.id,
        aircraftType: ac.aircraftTypeLabel ?? null,
        maxPassengers: ac.maxPassengers ?? null,
        score,
        rank: 0,
        recommended: false,
        reasoning: {
          legs: legReasonings,
          capacityFit,
          maxPassengers: ac.maxPassengers ?? null,
          notes: [...notes, ...legReasonings.flatMap((l) => l.notes)],
        },
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.map((c, i) => ({
    ...c,
    rank: i + 1,
    recommended: i === 0 && c.score > 0,
  }));
}

function scoreLeg(leg: LegMatchReasoning): number {
  let score = BASE_SCORE;
  if (!leg.locationFit) score -= LOCATION_MISMATCH_PENALTY;
  if (leg.hardBlockOverlap) return 0;
  if (leg.softHoldOverlap) score -= SOFT_HOLD_PENALTY;
  if (leg.repoBoost) score += REPO_BOOST;
  return score;
}

function buildReasoning(
  atDeparture: Date,
  dep: string,
  reqEnd: Date,
  events: ScheduleEvent[],
  ac: { tailNumber: string; homeBase: string | null }
): MatchReasoning {
  const notes: string[] = [];

  const tailLocation = inferLocationAt(events, atDeparture, ac.homeBase);
  const locationFit = airportCodesMatch(tailLocation, dep);
  const repositionRequired = !locationFit && !!tailLocation;
  if (repositionRequired) {
    notes.push(`Reposition required: ${tailLocation} → ${dep}`);
  } else if (!locationFit) {
    notes.push(`Could not determine tail location at departure`);
  }

  const hardBlockOverlap = events.some(
    (e) =>
      blocksCharterScheduling(e) &&
      rangesOverlap(
        new Date(atDeparture.getTime() - TURN_BUFFER_MS),
        new Date(reqEnd.getTime() + TURN_BUFFER_MS),
        e.startsAt,
        e.endsAt
      )
  );
  if (hardBlockOverlap) notes.push("Hard block overlaps request window");

  const softHoldOverlap = events.some(
    (e) =>
      (e.isHold || e.availabilityClass === "soft_hold") &&
      rangesOverlap(atDeparture, reqEnd, e.startsAt, e.endsAt)
  );
  if (softHoldOverlap) notes.push("Soft hold overlaps — confirm with scheduling");

  const repoWindowStart = new Date(atDeparture.getTime() - REPO_LOOKBACK_MS);
  const repoLeg = events.find(
    (e) =>
      e.availabilityClass === "repo_opportunity" &&
      e.endsAt <= atDeparture &&
      e.endsAt >= repoWindowStart &&
      (airportCodesMatch(e.arrIcao, dep) || airportCodesMatch(e.depIcao, dep))
  );
  const repoBoost = !!repoLeg;
  if (repoBoost) notes.push(`Repo leg aligns: ${repoLeg!.depIcao} → ${repoLeg!.arrIcao}`);

  return {
    locationFit,
    tailLocation,
    repositionRequired,
    repositionFrom: repositionRequired ? tailLocation : null,
    hardBlockOverlap,
    softHoldOverlap,
    repoBoost,
    repoLegId: repoLeg?.id ?? null,
    notes,
  };
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
