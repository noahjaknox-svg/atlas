import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { EmptyLegsShell } from "@/components/internal/charter/empty-legs/empty-legs-shell";
import { EmptyLegSettingsAdmin } from "@/components/internal/charter/empty-legs/empty-leg-settings-admin";

export default async function EmptyLegsSettingsPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "charter");

  const shell = getInternalShellProps(user);

  return (
    <EmptyLegsShell
      {...shell}
      title="Empty Leg Settings"
      description="Global defaults for emails, branding, consent, and public list behavior"
    >
      <EmptyLegSettingsAdmin />
    </EmptyLegsShell>
  );
}
