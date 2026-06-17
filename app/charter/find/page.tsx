import { redirect } from "next/navigation";
import { getInternalUser, hasCharterAccess } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { CharterShell } from "@/components/internal/charter/charter-shell";
import { TripFinderForm } from "@/components/internal/charter/trip-finder-form";

export default async function CharterFindPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  if (!hasCharterAccess(user.role)) redirect(ROUTES.home);

  return (
    <CharterShell userName={user.name} isAdmin={user.role === "admin"}>
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
