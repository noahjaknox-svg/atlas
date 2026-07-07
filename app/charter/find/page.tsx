import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { CharterShell } from "@/components/internal/charter/charter-shell";
import { TripFinderForm } from "@/components/internal/charter/trip-finder-form";

export default async function CharterFindPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "charter");

  const shell = getInternalShellProps(user);

  return (
    <CharterShell {...shell}>
      <div>
        <h1 className="font-serif text-2xl">Find aircraft</h1>
        <p className="mt-1 text-sm text-atlas-muted">
          Enter trip routing to find the most available aircraft against the JetInsight schedule
        </p>
        <div className="mt-8">
          <TripFinderForm />
        </div>
      </div>
    </CharterShell>
  );
}
