import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getInternalUser, hasCharterAccess } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { CharterShell } from "@/components/internal/charter/charter-shell";
import { TripsDashboard } from "@/components/internal/charter/trips-dashboard";

export default async function CharterTripsPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  if (!hasCharterAccess(user.role)) redirect(ROUTES.home);

  return (
    <CharterShell userName={user.name} isAdmin={user.role === "admin"}>
      <div>
        <h1 className="font-serif text-2xl">Trips</h1>
        <p className="mt-1 text-sm text-atlas-muted">
          Charter trip requests from manual entry and inbound email
        </p>
        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-atlas-muted">Loading…</p>}>
            <TripsDashboard />
          </Suspense>
        </div>
      </div>
    </CharterShell>
  );
}
