"use client";

import type { ClientSnapshotView } from "@/lib/client-serializer";
import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { interpolateExperienceCopy } from "@/lib/experience-defaults";
import { ProFormaClient } from "@/components/client/pro-forma-client";
import { ExperienceSlideV2 } from "./experience-slide-v2";

export function ExperienceProFormaPageV2({
  slug,
  section,
  client,
  aircraftParam,
  contactName,
}: {
  slug: string;
  section: ExperienceSectionSnapshot;
  client: ClientSnapshotView;
  aircraftParam?: string | null;
  contactName: string;
  payloadMetrics?: {
    netAnnualCost: number;
    costPerOwnerHour: number;
    charterRevenueOffset: number;
  };
}) {
  const bodyCopy = interpolateExperienceCopy(section.bodyCopy, {
    contactName,
    aircraftName: client.aircraft.label,
  });

  return (
    <ExperienceSlideV2
      lockViewport
      flushBottom
      className="min-h-0 flex-1"
      contentClassName="!mx-0 h-full min-h-0 !max-w-[min(100%,100rem)]"
    >
      <ProFormaClient
        slug={slug}
        initial={client}
        initialAircraftId={aircraftParam ?? client.aircraft.id}
        embedded
        experiencePath
        title={section.title}
        description={bodyCopy || undefined}
        className="min-h-0 flex-1"
      />
    </ExperienceSlideV2>
  );
}
