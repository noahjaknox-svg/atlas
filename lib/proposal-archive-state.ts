/** Pure archive helpers — safe to import from client tests without server-only db. */
export function isProposalArchived(
  proposal: { deletedAt: Date | null } | null | undefined
): proposal is { deletedAt: Date } {
  return proposal != null && proposal.deletedAt != null;
}
