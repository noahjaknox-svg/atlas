import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import type { ClubInputs, ClubOwnerView, ClubPrismjetView } from "@/lib/club-proforma";

/**
 * Portal-facing slice of the club model.
 *
 * The PrismJet economics page is the last page of the proposal and is hidden
 * before the proposal is shared with the Silverleaf owner. Hiding a page does
 * not stop its data from being serialised, so the PrismJet view and interim
 * lift rates are included ONLY when that page is visible in the published
 * sections.
 */
export const CLUB_PRISMJET_PAGE_SLUG = "prismjet-economics";

export type ClubClientView = {
  /** Inputs the portal needs to recompute the owner view in the browser. */
  inputs: ClubInputs;
  owner: ClubOwnerView;
  /** Present only when the PrismJet economics page is visible. */
  prismjet?: ClubPrismjetView;
};

export function isPrismjetPageVisible(
  sections: ReadonlyArray<{ pageSlug?: string | null; visible: boolean }>
): boolean {
  return sections.some((s) => s.pageSlug === CLUB_PRISMJET_PAGE_SLUG && s.visible);
}

type ClubPayloadSlice = Pick<ProposalSnapshotPayload, "clubModel" | "sections">;

export function buildClubClientView(
  snapshot: ClubPayloadSlice,
  opts: { forcePrismjet?: boolean } = {}
): ClubClientView | null {
  const club = snapshot.clubModel;
  if (!club) return null;

  // `forcePrismjet` is for the staff designer only, so PrismJet content can be designed
  // before it is hidden for the Silverleaf version. Never used on client-facing paths.
  if ((opts.forcePrismjet || isPrismjetPageVisible(snapshot.sections)) && club.result.prismjet) {
    return { inputs: club.inputs, owner: club.result.owner, prismjet: club.result.prismjet };
  }

  return {
    // Interim lift rates are PrismJet-only launch terms.
    inputs: { ...club.inputs, interimLiftRates: [], deadheadRatios: [] },
    owner: club.result.owner,
  };
}

/**
 * Strip PrismJet-only club data from a snapshot before it reaches a browser (the v2
 * portal hands the whole payload to a client component). Identity for every proposal
 * without a club model, so other usage types are untouched.
 */
export function sanitizeSnapshotForClient<T extends ClubPayloadSlice>(payload: T): T {
  if (!payload.clubModel) return payload;
  const view = buildClubClientView(payload);
  if (!view) return payload;
  // A hidden page still ships its content, so blank the PrismJet page's blocks too: its
  // narrative (charter split, operating share rationale) is as sensitive as its numbers.
  const sections = payload.sections.map((s) =>
    s.pageSlug === CLUB_PRISMJET_PAGE_SLUG && !s.visible
      ? { ...s, bodyCopy: null, contentBlocks: null }
      : s
  );
  return {
    ...payload,
    sections,
    clubModel: {
      version: payload.clubModel.version,
      inputs: view.inputs,
      result: { owner: view.owner, prismjet: view.prismjet },
    },
  };
}
