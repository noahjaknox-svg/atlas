import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { EmptyLegsShell } from "@/components/internal/charter/empty-legs/empty-legs-shell";
import { AircraftProfilesAdmin } from "@/components/internal/charter/empty-legs/aircraft-profiles-admin";

export default async function EmptyLegsAircraftProfilesPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "charter");

  const shell = getInternalShellProps(user);

  return (
    <EmptyLegsShell
      {...shell}
      title="Pricing Profiles"
      description="Empty-leg hourly rates and quotable-time defaults for warehouse aircraft types"
    >
      <AircraftProfilesAdmin />
    </EmptyLegsShell>
  );
}
