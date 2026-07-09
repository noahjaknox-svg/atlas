import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { EmptyLegsShell } from "@/components/internal/charter/empty-legs/empty-legs-shell";
import { RoutingProfilesAdmin } from "@/components/internal/charter/empty-legs/routing-profiles-admin";

export default async function EmptyLegsRoutingProfilesPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "charter");

  const shell = getInternalShellProps(user);

  return (
    <EmptyLegsShell
      {...shell}
      title="Routing Profiles"
      description="Fixed-price route overrides for empty leg pricing"
    >
      <RoutingProfilesAdmin />
    </EmptyLegsShell>
  );
}
