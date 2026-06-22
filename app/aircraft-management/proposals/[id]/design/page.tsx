import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/**
 * The per-proposal "Design report" editor has been consolidated into the single
 * "Edit presentation" flow on the proposal workspace. Page structure, layout, and
 * visuals are now owned globally by the Deck Builder (Proposal Design), while each
 * proposal edits copy and page selection from the workspace. This route redirects
 * any existing links/bookmarks to the workspace.
 */
export default async function ProposalDesignRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(ROUTES.aircraftManagement.proposal(id));
}
