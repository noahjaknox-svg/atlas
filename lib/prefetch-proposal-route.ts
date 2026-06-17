import { ROUTES } from "@/lib/routes";

const prefetchedIds = new Set<string>();

/** Prefetch a proposal workspace route once per session (hover / panel open). */
export function prefetchProposalRoute(
  router: { prefetch: (href: string) => void },
  proposalId: string
) {
  if (prefetchedIds.has(proposalId)) return;
  prefetchedIds.add(proposalId);
  router.prefetch(ROUTES.aircraftManagement.proposal(proposalId));
}
