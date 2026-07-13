import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { EmptyLegsShell } from "@/components/internal/charter/empty-legs/empty-legs-shell";
import { EmptyLegsInventory } from "@/components/internal/charter/empty-legs/empty-legs-inventory";

export default async function EmptyLegsInventoryPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "charter");

  const shell = getInternalShellProps(user);

  return (
    <EmptyLegsShell
      {...shell}
      fillHeight
      title="Empty Legs Inventory"
      description="Positioning flights detected from JetInsight — manage availability, placements, and promotion"
    >
      <EmptyLegsInventory />
    </EmptyLegsShell>
  );
}
