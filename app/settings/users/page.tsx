import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { InternalShell } from "@/components/internal/internal-shell";
import { UsersAdmin } from "@/components/internal/users-admin";

export default async function UsersSettingsPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/pipeline");

  return (
    <InternalShell userName={user.name} isAdmin>
      <UsersAdmin />
    </InternalShell>
  );
}
