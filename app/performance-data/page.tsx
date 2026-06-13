import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { InternalShell } from "@/components/internal/internal-shell";

export default async function PerformanceDataPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/pipeline");

  return (
    <InternalShell userName={user.name} isAdmin>
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-serif text-2xl">Performance Data</h1>
        <p className="text-sm text-atlas-muted">
          Reference performance datasets will live here.
        </p>
      </div>
    </InternalShell>
  );
}
