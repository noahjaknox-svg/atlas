import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { getDefaultHomeRoute, getInternalShellProps } from "@/lib/departments";
import { loadUsersAdminData } from "@/lib/users-admin-load";
import { InternalShell } from "@/components/internal/internal-shell";
import { UsersAdmin } from "@/components/internal/users-admin";

export default async function UsersSettingsPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(getDefaultHomeRoute(user));

  const initialData = await loadUsersAdminData(user.id);
  const shell = getInternalShellProps(user);

  return (
    <InternalShell {...shell}>
      <UsersAdmin
        initialData={initialData}
        currentUser={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }}
      />
    </InternalShell>
  );
}
