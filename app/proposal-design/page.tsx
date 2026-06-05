import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { InternalShell } from "@/components/internal/internal-shell";
import { ProposalDesignEditor } from "@/components/internal/proposal-design-editor";
import { getPortalContent, getFleetShowcase } from "@/lib/portal-content";

export default async function ProposalDesignPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");

  const [content, fleet] = await Promise.all([getPortalContent(), getFleetShowcase()]);

  return (
    <InternalShell userName={user.name} isAdmin={user.role === "admin"}>
      <h1 className="font-serif text-2xl text-atlas-text">Proposal Design</h1>
      <p className="mt-2 max-w-2xl text-sm text-atlas-muted">
        Global portal branding, clouds, About, Services, Fleet, and Contact — live for all
        client portals without republishing individual proposals.
      </p>
      <ProposalDesignEditor initialContent={content} initialFleet={fleet} />
    </InternalShell>
  );
}
