import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InternalShell } from "@/components/internal/internal-shell";
import { IntegrationsClient } from "@/components/internal/settings/integrations-client";

export default async function IntegrationsSettingsPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/pipeline");

  const latestFuel = await prisma.fuelIndexSnapshot.findFirst({
    orderBy: { fetchedAt: "desc" },
  });

  const fboCount = await prisma.fboLocation.count();
  const fboWithPrices = await prisma.fboLocation.count({
    where: {
      jetARetailPrice: { not: null },
      jetAContractPrice: { not: null },
    },
  });

  const scheduleSource = await prisma.scheduleSource.findFirst({
    where: { enabled: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <InternalShell userName={user.name} isAdmin>
      <IntegrationsClient
        initial={{
          eiaConfigured: Boolean(process.env.EIA_API_KEY?.trim()),
          iflightConfigured: Boolean(process.env.IFLIGHTPLANNER_API_KEY?.trim()),
          jetinsightConfigured: Boolean(process.env.JETINSIGHT_ICS_URL?.trim()),
          jetinsightSource: scheduleSource
            ? {
                name: scheduleSource.name,
                lastSyncedAt: scheduleSource.lastSyncedAt?.toISOString() ?? null,
                lastSyncStatus: scheduleSource.lastSyncStatus,
              }
            : null,
          latestFuel: latestFuel
            ? {
                pricePerGallon: Number(latestFuel.pricePerGallon),
                effectiveDate: latestFuel.effectiveDate.toISOString().slice(0, 10),
                fetchedAt: latestFuel.fetchedAt.toISOString(),
                indexName: latestFuel.indexName,
              }
            : null,
          fboCount,
          fboWithPrices,
        }}
      />
    </InternalShell>
  );
}
