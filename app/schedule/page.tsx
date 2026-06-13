import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadScheduleKanban } from "@/lib/schedule/load-kanban";
import { loadScheduleTimeline } from "@/lib/schedule/load-timeline";
import { KANBAN_COLUMNS } from "@/lib/schedule/kanban";
import { scheduleRangeEnd, startOfUtcDay } from "@/lib/schedule/view-range";
import { InternalShell } from "@/components/internal/internal-shell";
import { ScheduleView } from "@/components/internal/schedule-view";

export default async function SchedulePage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");

  const rangeStart = startOfUtcDay(new Date());
  const rangeEnd = scheduleRangeEnd(rangeStart);

  const [kanban, timelineData] = await Promise.all([
    loadScheduleKanban(prisma, { rangeStart, rangeEnd }),
    loadScheduleTimeline(prisma, { rangeStart, rangeEnd }),
  ]);

  const initialKanban = {
    columns: KANBAN_COLUMNS,
    rangeStart: kanban.rangeStart,
    rangeEnd: kanban.rangeEnd,
    source: kanban.source
      ? {
          id: kanban.source.id,
          name: kanban.source.name,
          lastSyncedAt: kanban.source.lastSyncedAt?.toISOString() ?? null,
          lastSyncStatus: kanban.source.lastSyncStatus,
        }
      : null,
    fleet: kanban.fleet,
    eventCount: kanban.eventCount,
    board: kanban.board,
  };

  return (
    <InternalShell userName={user.name} isAdmin={user.role === "admin"} workspace>
      <div className="flex h-full min-h-0 flex-col px-3 py-4 lg:px-4">
        <div className="shrink-0">
          <h1 className="font-serif text-2xl">Schedule</h1>
          <p className="mt-0.5 text-sm text-atlas-muted">
            Atlas charter availability — when each tail is quotable, where it sits, and legs to sell
          </p>
        </div>
        <ScheduleView
          initialKanban={initialKanban}
          initialTimeline={timelineData.timeline}
          isAdmin={user.role === "admin"}
        />
      </div>
    </InternalShell>
  );
}
