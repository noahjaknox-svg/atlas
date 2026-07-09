import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { EmptyLegsShell } from "@/components/internal/charter/empty-legs/empty-legs-shell";
import { PublicListsAdmin } from "@/components/internal/charter/empty-legs/public-lists-admin";

export default async function EmptyLegsPublicListsPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "charter");

  const shell = getInternalShellProps(user);

  return (
    <EmptyLegsShell
      {...shell}
      title="Public Lists"
      description="Embeddable empty leg lists with tokens, layout, and field visibility"
    >
      <PublicListsAdmin />
    </EmptyLegsShell>
  );
}
