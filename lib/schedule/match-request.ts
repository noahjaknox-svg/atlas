import type { ScheduleEvent } from "@prisma/client";
import type { MatchReasoning } from "@/lib/schedule/types";

export interface CharterRequestInput {
  requestedDepIcao: string;
  requestedArrIcao: string;
  requestedDepartAt: Date;
  paxCount?: number | null;
}

export interface MatchCandidate {
  tailNumber: string;
  fleetAircraftId: string | null;
  score: number;
  rank: number;
  recommended: boolean;
  reasoning: MatchReasoning;
}

const TURN_BUFFER_MS = 2 * 60 * 60 * 1000;
const REPO_LOOKBACK_MS = 6 * 60 * 60 * 1000;
const BASE_SCORE = 100;
const SOFT_HOLD_PENALTY = 25;
const REPO_BOOST = 30;
const LOCATION_MISMATCH_PENALTY = 50;

export function matchCharterRequest(
  request: CharterRequestInput,
  events: ScheduleEvent[],
  fleet: { tailNumber: string; id: string; homeBase: string | null }[]
): MatchCandidate[] {
  const reqEnd = new Date(request.requestedDepartAt.getTime() + 4 * 60 * 60 * 1000);
  const dep = request.requestedDepIcao.toUpperCase();

  const candidates: MatchCandidate[] = [];

  for (const ac of fleet) {
    const tailEvents = events.filter(
      (e) => e.tailNumber === ac.tailNumber && !e.deletedAt
    );
    const reasoning = buildReasoning(request, dep, reqEnd, tailEvents, ac);
    let score = BASE_SCORE;

    if (!reasoning.locationFit) score -= LOCATION_MISMATCH_PENALTY;
    if (reasoning.hardBlockOverlap) {
      score = 0;
    }
    if (reasoning.softHoldOverlap) score -= SOFT_HOLD_PENALTY;
    if (reasoning.repoBoost) score += REPO_BOOST;

    if (score > 0) {
      candidates.push({
        tailNumber: ac.tailNumber,
        fleetAircraftId: ac.id,
        score,
        rank: 0,
        recommended: false,
        reasoning,
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

function buildReasoning(
  request: CharterRequestInput,
  dep: string,
  reqEnd: Date,
  events: ScheduleEvent[],
  ac: { tailNumber: string; homeBase: string | null }
): MatchReasoning {
  const notes: string[] = [];
  const atDeparture = request.requestedDepartAt;

  const tailLocation = inferLocationAt(events, atDeparture, ac.homeBase);
  const locationFit = tailLocation === dep;
  if (!locationFit) {
    notes.push(
      tailLocation
        ? `Tail at ${tailLocation}, request departs ${dep}`
        : `Could not determine tail location at departure`
    );
  }

  const hardBlockOverlap = events.some(
    (e) =>
      e.availabilityClass === "hard_block" &&
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
      (e.arrIcao?.toUpperCase() === dep || e.depIcao?.toUpperCase() === dep)
  );
  const repoBoost = !!repoLeg;
  if (repoBoost) notes.push(`Repo leg aligns: ${repoLeg!.depIcao} → ${repoLeg!.arrIcao}`);

  return {
    locationFit,
    tailLocation,
    hardBlockOverlap,
    softHoldOverlap,
    repoBoost,
    repoLegId: repoLeg?.id ?? null,
    notes,
  };
}

import { inferLocationAt } from "@/lib/schedule/location";

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
