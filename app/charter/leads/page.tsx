import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { CharterShell } from "@/components/internal/charter/charter-shell";
import { CharterLeadsDashboard } from "@/components/internal/charter/empty-legs/charter-leads-dashboard";

export default async function CharterLeadsPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "charter");

  const shell = getInternalShellProps(user);

  return (
    <CharterShell {...shell}>
      <div>
        <h1 className="font-serif text-2xl">Leads</h1>
        <p className="mt-1 text-sm text-atlas-muted">
          Public iframe empty leg submissions
        </p>
        <div className="mt-8">
          <CharterLeadsDashboard />
        </div>
      </div>
    </CharterShell>
  );
}
