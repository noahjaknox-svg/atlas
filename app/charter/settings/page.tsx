import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { prisma } from "@/lib/db";
import { CharterShell } from "@/components/internal/charter/charter-shell";
import { CharterSettingsClient } from "@/components/internal/charter/empty-legs/charter-settings-client";

export default async function CharterSettingsPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "charter");

  const [settings, source] = await Promise.all([
    prisma.emptyLegSettings.findUnique({ where: { id: "default" } }),
    prisma.scheduleSource.findFirst({
      where: { enabled: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const shell = getInternalShellProps(user);

  return (
    <CharterShell {...shell}>
      <div>
        <h1 className="font-serif text-2xl">Charter Settings</h1>
        <p className="mt-1 text-sm text-atlas-muted">
          Global JetInsight schedule sync for Charter — schedule, empty legs, and placements
        </p>
        <div className="mt-8">
          <CharterSettingsClient
            initial={{
              jetinsightConfigured: Boolean(process.env.JETINSIGHT_ICS_URL?.trim()) || !!source,
              source: source
                ? {
                    name: source.name,
                    lastSyncedAt: source.lastSyncedAt?.toISOString() ?? null,
                    lastSyncStatus: source.lastSyncStatus,
                    pollIntervalMinutes: source.pollIntervalMinutes,
                  }
                : null,
              emptyLegSync: settings
                ? {
                    lastCharterSyncAt: settings.lastCharterSyncAt?.toISOString() ?? null,
                    lastCharterSyncStatus: settings.lastCharterSyncStatus,
                    lastCharterSyncStatsJson: settings.lastCharterSyncStatsJson,
                  }
                : null,
            }}
          />
        </div>
      </div>
    </CharterShell>
  );
}
