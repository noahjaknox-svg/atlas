"use client";

import type { ClubClientView } from "@/lib/club-client-view";
import { Callout, ClubCard } from "./club-ui";
import {
  CashTimelineView,
  MemberCostView,
  PrismjetView,
  ProFormaView,
  ProgramStatsView,
  ScalingView,
  StructuresView,
  type ClubViewKey,
} from "./club-views";

/** Renders one Silverleaf club view from the proposal's club model. Renders nothing for other proposals. */
export function ClubEconomicsBlock({
  view,
  club,
  designer = false,
}: {
  view: ClubViewKey;
  club: ClubClientView | null | undefined;
  /** In the designer, explain why an empty block is empty instead of hiding it. */
  designer?: boolean;
}) {
  if (!club) {
    return designer ? (
      <ClubCard>
        <Callout>
          Club economics appear here once this proposal has club inputs (Silverleaf usage type).
        </Callout>
      </ClubCard>
    ) : null;
  }
  if (view === "prismjet" && !club.prismjet) {
    return designer ? (
      <ClubCard>
        <Callout tone="warn">
          PrismJet economics are only available while the PrismJet economics page is visible. They are
          never sent to the client when that page is hidden.
        </Callout>
      </ClubCard>
    ) : null;
  }

  switch (view) {
    case "program-stats":
      return <ProgramStatsView club={club} />;
    case "structures":
      return <StructuresView club={club} />;
    case "scaling":
      return <ScalingView club={club} />;
    case "member-cost":
      return <MemberCostView club={club} />;
    case "cash-timeline":
      return <CashTimelineView club={club} />;
    case "pro-forma":
      return <ProFormaView club={club} />;
    case "prismjet":
      return <PrismjetView club={club} />;
    default:
      return null;
  }
}
