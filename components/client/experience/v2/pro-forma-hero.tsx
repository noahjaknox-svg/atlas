"use client";

import { useCountUp } from "../use-count-up";
import { useReveal } from "../use-reveal";
import { cn, formatCurrency } from "@/lib/utils";
import { experienceGlassV2 } from "./experience-tokens";

export function ProFormaMetricsRow({
  netAnnualCost,
  costPerOwnerHour,
}: {
  netAnnualCost: number;
  costPerOwnerHour: number;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>({ threshold: 0.2 });
  const annual = useCountUp(netAnnualCost, shown);
  const perHour = useCountUp(costPerOwnerHour, shown);

  const metrics = [
    { label: "Net annual cost", value: formatCurrency(annual) },
    { label: "Cost per owner hour", value: formatCurrency(perHour) },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 gap-3">
      {metrics.map((m) => (
        <div key={m.label} className={cnMetricCard()}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 sm:text-xs">
            {m.label}
          </p>
          <p className="mt-2 font-mono text-lg tabular-nums text-atlas-accent sm:text-xl">
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function cnMetricCard() {
  return cn(experienceGlassV2, "p-4 sm:p-5");
}

/** @deprecated Use ProFormaMetricsRow in v2 experience layout. */
export function ProFormaHero({
  netAnnualCost,
  costPerOwnerHour,
  charterOffset: _charterOffset,
}: {
  netAnnualCost: number;
  costPerOwnerHour: number;
  charterOffset: number;
}) {
  return (
    <ProFormaMetricsRow
      netAnnualCost={netAnnualCost}
      costPerOwnerHour={costPerOwnerHour}
    />
  );
}
