"use client";

import { useCountUp } from "../use-count-up";
import { useReveal } from "../use-reveal";
import { formatCurrency } from "@/lib/utils";
import { experienceGlassV2 } from "./experience-tokens";
import { ChapterStaggerItem } from "./chapter-transition";

export function ProFormaHero({
  netAnnualCost,
  costPerOwnerHour,
  charterOffset,
}: {
  netAnnualCost: number;
  costPerOwnerHour: number;
  charterOffset: number;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>({ threshold: 0.2 });
  const annual = useCountUp(netAnnualCost, shown);
  const perHour = useCountUp(costPerOwnerHour, shown);
  const charter = useCountUp(charterOffset, shown);

  const metrics = [
    { label: "Net annual cost", value: formatCurrency(annual) },
    { label: "Cost per owner hour", value: formatCurrency(perHour) },
    { label: "Charter revenue offset", value: formatCurrency(charter) },
  ];

  return (
    <div ref={ref} className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      {metrics.map((m) => (
        <ChapterStaggerItem key={m.label}>
          <div className={experienceGlassV2 + " p-4 text-center sm:p-5"}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 sm:text-xs">
              {m.label}
            </p>
            <p className="mt-2 font-mono text-xl tabular-nums text-atlas-accent sm:text-2xl">
              {m.value}
            </p>
          </div>
        </ChapterStaggerItem>
      ))}
    </div>
  );
}
