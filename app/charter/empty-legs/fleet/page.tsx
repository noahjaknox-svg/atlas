import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { EmptyLegsShell } from "@/components/internal/charter/empty-legs/empty-legs-shell";
import { FleetConfigAdmin } from "@/components/internal/charter/empty-legs/fleet-config-admin";

export default async function EmptyLegsFleetPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "charter");

  const shell = getInternalShellProps(user);

  return (
    <EmptyLegsShell
      {...shell}
      title="Fleet Config"
      description="Public display details, photos, and aircraft profile links per tail"
    >
      <FleetConfigAdmin />
    </EmptyLegsShell>
  );
}
