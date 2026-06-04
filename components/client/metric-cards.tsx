import { formatCurrency, formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCards({
  metrics,
}: {
  metrics: {
    netAnnualCost: number;
    netMonthlyCost: number;
    ownerHours: number;
    charterRevenueOffset: number;
    costPerOwnerHour: number;
  };
}) {
  const cards = [
    { label: "Estimated Annual Ownership Cost", value: formatCurrency(metrics.netAnnualCost) },
    { label: "Estimated Monthly Ownership Cost", value: formatCurrency(metrics.netMonthlyCost) },
    { label: "Owner Annual Hours", value: formatNumber(metrics.ownerHours) },
    { label: "Charter Revenue Offset", value: formatCurrency(metrics.charterRevenueOffset) },
    { label: "Cost Per Owner Hour", value: formatCurrency(metrics.costPerOwnerHour) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className="border-atlas-border/60 bg-atlas-surface/80">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-atlas-muted">{c.label}</p>
            <p className="mt-2 font-mono text-2xl tabular-nums text-atlas-accent">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
