import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { InternalShell } from "@/components/internal/internal-shell";
import { ProposalDesignShell } from "@/components/internal/proposal-design/proposal-design-shell";
import { getPortalContent, getFleetShowcase, getExperienceMasterTemplates } from "@/lib/portal-content";

export default async function ProposalDesignPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");

  const [content, fleet, templates] = await Promise.all([
    getPortalContent(),
    getFleetShowcase(),
    getExperienceMasterTemplates(),
  ]);

  return (
    <InternalShell userName={user.name} isAdmin={user.role === "admin"} workspace>
      <ProposalDesignShell
        initialContent={content}
        initialFleet={fleet}
        initialTemplates={templates}
      />
    </InternalShell>
  );
}
