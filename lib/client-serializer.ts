import type { ProposalSnapshotPayload } from "./snapshot";
import { calculateProForma, assumptionsToProFormaInputs } from "./proforma";
import { toNumber } from "./utils";

/** Strip internal-only data from snapshot for client API responses. */
export function serializeClientSnapshot(
  snapshot: ProposalSnapshotPayload,
  overrides?: { aircraftValue?: number; ownerHours?: number }
) {
  const baseAssumptions: Record<string, number | string> = {};
  for (const [key, meta] of Object.entries(snapshot.assumptions)) {
    if (meta.visibleToClient) {
      baseAssumptions[key] = meta.value;
    }
  }

  const aircraftValue =
    overrides?.aircraftValue ??
    toNumber(baseAssumptions.aircraft_value ?? snapshot.metrics.aircraftValue);
  const ownerHours =
    overrides?.ownerHours ??
    toNumber(baseAssumptions.owner_annual_hours ?? snapshot.metrics.ownerHours);

  const calcMap = {
    ...Object.fromEntries(
      Object.entries(baseAssumptions).map(([k, v]) => [k, String(v)])
    ),
    aircraft_value: String(aircraftValue),
    owner_annual_hours: String(ownerHours),
  };

  const proForma = calculateProForma(assumptionsToProFormaInputs(calcMap));

  return {
    proposal: snapshot.proposal,
    prospect: {
      name: snapshot.prospect.name,
      contactName: snapshot.prospect.contactName,
    },
    aircraft: snapshot.aircraft,
    sections: snapshot.sections,
    editableFields: {
      aircraftValue: {
        value: aircraftValue,
        label: "Aircraft Value",
        editable: true,
      },
      ownerAnnualHours: {
        value: ownerHours,
        label: "Owner Annual Hours",
        editable: true,
      },
    },
    baseMetrics: snapshot.metrics,
    proForma: {
      lineItems: proForma.lineItems.filter((l) =>
        ["revenue", "fixed", "variable", "subtotal", "total", "metric"].includes(
          l.category
        )
      ),
      netAnnualCost: proForma.netAnnualCost,
      netMonthlyCost: proForma.netMonthlyCost,
      costPerOwnerHour: proForma.costPerOwnerHour,
      totalRevenue: proForma.totalRevenue,
    },
    fixedCostBreakdown: buildFixedBreakdown(baseAssumptions),
  };
}

function buildFixedBreakdown(assumptions: Record<string, number | string>) {
  const items = [
    { key: "crew_total", label: "Crew salaries and benefits" },
    { key: "crew_training", label: "Crew training" },
    { key: "management_fee", label: "Management fee" },
    { key: "hangar_annual", label: "Hangar" },
    { key: "insurance_annual", label: "Insurance" },
    { key: "maintenance_mgmt_fee", label: "Maintenance management fee" },
    { key: "wifi_subscription", label: "Wi-Fi / subscriptions" },
    { key: "cleaning_annual", label: "Cleaning" },
    { key: "supplies_annual", label: "Supplies" },
    { key: "airport_fees_annual", label: "Airport fees" },
  ];

  return items
    .map((item) => ({
      ...item,
      annual: toNumber(assumptions[item.key]),
      monthly: toNumber(assumptions[item.key]) / 12,
    }))
    .filter((i) => i.annual > 0);
}
