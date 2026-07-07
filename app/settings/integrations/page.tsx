import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getInternalShellProps } from "@/lib/departments";
import { InternalShell } from "@/components/internal/internal-shell";
import { IntegrationsClient } from "@/components/internal/settings/integrations-client";

export default async function IntegrationsSettingsPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");

  const scheduleSource = await prisma.scheduleSource.findFirst({
    where: { enabled: true },
    orderBy: { updatedAt: "desc" },
  });

  const shell = getInternalShellProps(user);

  return (
    <InternalShell {...shell}>
      <IntegrationsClient
        initial={{
          iflightConfigured: Boolean(process.env.IFLIGHTPLANNER_API_KEY?.trim()),
          jetinsightConfigured: Boolean(process.env.JETINSIGHT_ICS_URL?.trim()),
          jetinsightSource: scheduleSource
            ? {
                name: scheduleSource.name,
                lastSyncedAt: scheduleSource.lastSyncedAt?.toISOString() ?? null,
                lastSyncStatus: scheduleSource.lastSyncStatus,
              }
            : null,
        }}
      />
    </InternalShell>
  );
}
