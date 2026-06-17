import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadScheduleTimeline } from "@/lib/schedule/load-timeline";
import { InternalShell } from "@/components/internal/internal-shell";
import { ScheduleView } from "@/components/internal/schedule-view";

export default async function SchedulePage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");

  const timelineData = await loadScheduleTimeline(prisma, {});

  const initialSource = timelineData.source
    ? {
        id: timelineData.source.id,
        name: timelineData.source.name,
        lastSyncedAt: timelineData.source.lastSyncedAt?.toISOString() ?? null,
        lastSyncStatus: timelineData.source.lastSyncStatus,
      }
    : null;

  const initialFleet = timelineData.fleet.map((f) => ({
    tailNumber: f.tailNumber,
    homeBase: f.homeBase,
    typeCode: f.typeCode,
  }));

  return (
    <InternalShell userName={user.name} isAdmin={user.role === "admin"} workspace>
      <div className="flex h-full min-h-0 flex-col px-3 py-4 lg:px-4">
        <div className="shrink-0">
          <h1 className="font-serif text-2xl">Schedule</h1>
          <p className="mt-0.5 text-sm text-atlas-muted">
            Atlas charter availability — green sells, blue repositions, red is blocked
          </p>
        </div>
        <ScheduleView
          initialTimeline={timelineData.timeline}
          initialSource={initialSource}
          initialFleet={initialFleet}
          isAdmin={user.role === "admin"}
        />
      </div>
    </InternalShell>
  );
}
