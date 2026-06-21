import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import {
  dataHubSearchParamsFromRecord,
  isPrefetchableDataHubTab,
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
  const activeTab = params.tab ?? "aircraft";
  const filterParams = dataHubSearchParamsFromRecord(params);

  let initialTabData: DataHubListPayload | null = null;
  if (isPrefetchableDataHubTab(activeTab)) {
    initialTabData = await prefetchDataHubTab(activeTab, filterParams);
  }

  return (
    <InternalShell userName={user.name} isAdmin workspace>
      <DataHubClient initialTab={activeTab} initialTabData={initialTabData} />
    </InternalShell>
  );
}
