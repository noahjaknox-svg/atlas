import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import {
  dataHubSearchParamsFromRecord,
  isPrefetchableDataHubTab,
  prefetchAirportsTabData,
  prefetchDataHubTab,
  type DataHubListPayload,
} from "@/lib/data-hub-prefetch";
import { ROUTES } from "@/lib/routes";
import { InternalShell } from "@/components/internal/internal-shell";
import { DataHubClient } from "@/components/internal/data-hub-client";

export default async function DataHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; [key: string]: string | undefined }>;
}) {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(ROUTES.home);

  const params = await searchParams;
  const activeTab = params.tab ?? "airports";
  const filterParams = dataHubSearchParamsFromRecord(params);

  let initialTabData: DataHubListPayload | null = null;
  let initialAirportsTabData: Awaited<ReturnType<typeof prefetchAirportsTabData>> | null =
    null;

  if (activeTab === "airports") {
    initialAirportsTabData = await prefetchAirportsTabData(filterParams);
  } else if (isPrefetchableDataHubTab(activeTab)) {
    initialTabData = await prefetchDataHubTab(activeTab, filterParams);
  }

  return (
    <InternalShell userName={user.name} isAdmin workspace>
      <DataHubClient
        initialTab={activeTab}
        initialTabData={initialTabData}
        initialAirportsTabData={initialAirportsTabData}
      />
    </InternalShell>
  );
}
