import Link from "next/link";
import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { InternalShell } from "@/components/internal/internal-shell";
import { ROUTES } from "@/lib/routes";

export default async function SettingsPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");

  return (
    <InternalShell userName={user.name} isAdmin={user.role === "admin"}>
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="font-serif text-2xl">Settings</h1>
        <ul className="divide-y divide-atlas-border rounded-lg border border-atlas-border">
          {user.role === "admin" ? (
            <>
              <li>
                <Link
                  href="/settings/integrations"
                  className="block px-4 py-3 text-sm hover:bg-atlas-surface/40"
                >
                  <span className="font-medium">Integrations</span>
                  <span className="mt-0.5 block text-atlas-muted">
                    EIA fuel sync status and manual triggers
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/settings/users"
                  className="block px-4 py-3 text-sm hover:bg-atlas-surface/40"
                >
                  <span className="font-medium">Users</span>
                  <span className="mt-0.5 block text-atlas-muted">
                    Invite and manage internal accounts
                  </span>
                </Link>
              </li>
            </>
          ) : null}
          <li>
            <Link
              href="/help"
              className="block px-4 py-3 text-sm hover:bg-atlas-surface/40"
            >
              <span className="font-medium">Help</span>
              <span className="mt-0.5 block text-atlas-muted">
                Pipeline badges, Data Hub imports, and access notes
              </span>
            </Link>
          </li>
          <li>
            <Link
              href={ROUTES.aircraftManagement.proposalDesign}
              className="block px-4 py-3 text-sm hover:bg-atlas-surface/40"
            >
              <span className="font-medium">Proposal design</span>
              <span className="mt-0.5 block text-atlas-muted">
                Master report copy and global portal branding
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </InternalShell>
  );
}
