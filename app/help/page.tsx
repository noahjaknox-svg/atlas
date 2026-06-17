import Link from "next/link";
import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { InternalShell } from "@/components/internal/internal-shell";
import { ROUTES } from "@/lib/routes";

export default async function HelpPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");

  return (
    <InternalShell userName={user.name} isAdmin={user.role === "admin"}>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-serif text-2xl">Help</h1>
          <p className="mt-1 text-sm text-atlas-muted">
            Quick reference for Atlas internal tools.
          </p>
        </div>

        <section className="space-y-3 rounded-lg border border-atlas-border p-5">
          <h2 className="font-medium">Pipeline</h2>
          <p className="text-sm text-atlas-muted">
            Drag cards between stages to update workflow. The{" "}
            <span className="rounded bg-amber-900/40 px-1 py-0.5 text-xs text-amber-200">
              Missing Info
            </span>{" "}
            badge counts required workspace fields still empty (aircraft value, home airport, crew,
            hangar, insurance, fuel, and charter rate when charter is enabled). Open the proposal
            workspace to complete them.
          </p>
          <p className="text-sm text-atlas-muted">
            Press <kbd className="rounded border border-atlas-border px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>{" "}
            or <kbd className="rounded border border-atlas-border px-1.5 py-0.5 font-mono text-xs">Ctrl+K</kbd>{" "}
            on the pipeline page to focus search.
          </p>
        </section>

        <section className="space-y-3 rounded-lg border border-atlas-border p-5">
          <h2 className="font-medium">Data Hub</h2>
          <p className="text-sm text-atlas-muted">
            Admins manage reference data under{" "}
            <Link href={ROUTES.dataWarehouse.data} className="text-atlas-accent hover:underline">
              Data
            </Link>
            . Use <strong>Re-import seed CSV</strong> for the bundled reference file, or upload a
            matching CSV on the Aircraft tab. Fuel index sync requires{" "}
            <code className="text-xs">EIA_API_KEY</code> — see{" "}
            <Link href="/settings/integrations" className="text-atlas-accent hover:underline">
              Integrations
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3 rounded-lg border border-atlas-border p-5">
          <h2 className="font-medium">Access</h2>
          <p className="text-sm text-atlas-muted">
            You must be invited and provisioned in Atlas before login succeeds. Contact an admin
            under{" "}
            <Link href="/settings/users" className="text-atlas-accent hover:underline">
              Settings → Users
            </Link>
            .
          </p>
        </section>
      </div>
    </InternalShell>
  );
}
