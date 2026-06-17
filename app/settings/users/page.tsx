import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { loadUsersAdminData } from "@/lib/users-admin-load";
import { InternalShell } from "@/components/internal/internal-shell";
import { UsersAdmin } from "@/components/internal/users-admin";

export default async function UsersSettingsPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(ROUTES.home);

  const initialData = await loadUsersAdminData(user.id);

  return (
    <InternalShell userName={user.name} isAdmin>
      <UsersAdmin initialData={initialData} />
    </InternalShell>
  );
}
