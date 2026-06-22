"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ClientSnapshotView } from "@/lib/client-serializer";
import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import { interpolateExperienceCopy } from "@/lib/experience-defaults";
import { ProFormaClient } from "@/components/client/pro-forma-client";
import { ProFormaVisualSummary } from "../../pro-forma-visual-summary";
import { ChapterStagger, ChapterStaggerItem } from "../chapter-transition";
import { ProFormaHero } from "../pro-forma-hero";
import { ExperienceSlideV2 } from "./experience-slide-v2";
import { experienceGlassV2 } from "../experience-tokens";

export function ExperienceProFormaPageV2({
  slug,
  section,
  client,
  aircraftParam,
  contactName,
  payloadMetrics,
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
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");

  const bodyCopy = interpolateExperienceCopy(section.bodyCopy, {
    contactName,
    aircraftName: client.aircraft.label,
  });

  const netAnnual = payloadMetrics?.netAnnualCost ?? client.proForma.netAnnualCost;
  const perHour = payloadMetrics?.costPerOwnerHour ?? client.proForma.costPerOwnerHour;
  const charter = payloadMetrics?.charterRevenueOffset ?? 0;

  return (
    <ExperienceSlideV2>
      <ChapterStagger className="flex h-full w-full flex-col justify-center gap-4">
        <ChapterStaggerItem className="shrink-0">
          <h1 className="font-serif text-xl text-white sm:text-2xl">{section.title}</h1>
          {bodyCopy ? (
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/65 sm:text-sm">
              {bodyCopy}
            </p>
          ) : null}
        </ChapterStaggerItem>

        <ProFormaHero
          netAnnualCost={netAnnual}
          costPerOwnerHour={perHour}
          charterOffset={charter}
        />

        <ChapterStaggerItem className="min-h-0 flex-1">
          <div className={cn(experienceGlassV2, "p-4 sm:p-5")}>
            <ProFormaVisualSummary
              lineItems={client.proForma.lineItems}
              period={period}
              onPeriodChange={setPeriod}
              compact
            />
          </div>
        </ChapterStaggerItem>

        <ChapterStaggerItem className="shrink-0">
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            className="w-full rounded-xl border border-white/20 bg-white/5 py-3 text-xs font-medium uppercase tracking-widest text-white/80 transition-colors hover:bg-white/10 sm:text-sm"
          >
            {showBreakdown ? "Hide full breakdown" : "View full breakdown"}
          </button>
        </ChapterStaggerItem>

        {showBreakdown ? (
          <ChapterStaggerItem className="min-h-0 flex-1 overflow-hidden pb-2">
            <ProFormaClient
              slug={slug}
              initial={client}
              initialAircraftId={aircraftParam ?? client.aircraft.id}
              embedded
              experiencePath
              slide
            />
          </ChapterStaggerItem>
        ) : null}
      </ChapterStagger>
    </ExperienceSlideV2>
  );
}
