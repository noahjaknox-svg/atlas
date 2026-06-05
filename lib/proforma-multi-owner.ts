import type { AssumptionMap } from "@/lib/assumptions";
import {
  allocatePoolAmount,
  type OwnerExpenseAllocationMode,
} from "@/lib/owner-expense-allocation";
import { getAllocationMode } from "@/lib/proposal-owners";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";
import {
  assumptionsToProFormaInputs,
  blendedFuelPrice,
  fuelCostPerHour,
  variableCostPerHour,
} from "@/lib/proforma";

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

function rowAnnual(rows: ProFormaStatementRow[], key: string): number {
  const row = rows.find((r) => r.key === key);
  return row?.annual ?? 0;
}

function ownerVariableAnnual(assumptions: AssumptionMap, hours: number): number {
  if (hours <= 0) return 0;
  const inputs = assumptionsToProFormaInputs(assumptions);
  const blended = blendedFuelPrice(
    inputs.homeFuelPrice,
    inputs.awayFuelPrice,
    inputs.homeFuelPct
  );
  const fuelHr = fuelCostPerHour(inputs.fuelBurnGph, blended);
  const varHr =
    num(assumptions.variable_cost_per_hour) ||
    variableCostPerHour({
      fuelCostPerHour: fuelHr,
      engineProgramRate: inputs.engineProgramRate,
      apuProgramRate: inputs.apuProgramRate,
      partsProgramRate: inputs.partsProgramRate,
      inspectionReserveRate: inputs.inspectionReserveRate,
      maintenanceReserveRate: inputs.maintenanceReserveRate,
      tripExpensePerHour: inputs.tripExpensePerHour,
    }) + num(assumptions.airframe_program_rate);
  return -Math.abs(varHr * hours);
}

export type PerOwnerEconomicsLine = {
  label: string;
  annual: number;
};

export type PerOwnerEconomics = {
  profile: ProposalOwnerProfile;
  lines: PerOwnerEconomicsLine[];
  netAnnualOwnerCost: number;
  costPerFlightHour: number;
  ownerVariableCost: number;
};

export type PerOwnerFinancing = {
  profile: ProposalOwnerProfile;
  ownershipPercent: number;
  impliedEquity: number;
  monthlyDebtService: number;
  annualDebtService: number;
};

export function buildPerOwnerEconomics(
  assumptions: AssumptionMap,
  profiles: ProposalOwnerProfile[],
  statementRows: ProFormaStatementRow[],
  mode?: OwnerExpenseAllocationMode
): PerOwnerEconomics[] {
  if (profiles.length === 0) return [];

  const allocationMode = mode ?? getAllocationMode(assumptions);
  const totalRevenue = rowAnnual(statementRows, "total_revenue");
  const totalFixed = rowAnnual(statementRows, "total_fixed_ownership");
  const totalCharterVar = rowAnnual(statementRows, "total_charter_variable");
  const netBeforeOwner =
    rowAnnual(statementRows, "bridge_net_before_owner") ||
    rowAnnual(statementRows, "net_operating_pl");

  return profiles.map((profile) => {
    const allocRevenue = allocatePoolAmount(
      totalRevenue,
      profile,
      profiles,
      allocationMode,
      "revenue"
    );
    const allocFixed = allocatePoolAmount(
      totalFixed,
      profile,
      profiles,
      allocationMode,
      "fixed"
    );
    const allocCharterVar = allocatePoolAmount(
      totalCharterVar,
      profile,
      profiles,
      allocationMode,
      "charter_variable"
    );
    const allocNetBefore = allocatePoolAmount(
      netBeforeOwner,
      profile,
      profiles,
      allocationMode,
      "net_before_owner"
    );

    const ownerVar = ownerVariableAnnual(assumptions, profile.annualFlightHours);
    const netAnnualOwner = allocNetBefore + ownerVar;
    const hours = profile.annualFlightHours;
    const costPerFlightHour =
      hours > 0 ? Math.abs(netAnnualOwner) / hours : 0;

    const lines: PerOwnerEconomicsLine[] = [
      { label: "Allocated revenue", annual: allocRevenue },
      { label: "Allocated fixed costs", annual: allocFixed },
      { label: "Allocated charter variable", annual: allocCharterVar },
      { label: "Net before owner use", annual: allocNetBefore },
      { label: "Owner variable costs", annual: ownerVar },
      { label: "Net annual owner cost", annual: netAnnualOwner },
    ];

    return {
      profile,
      lines,
      netAnnualOwnerCost: netAnnualOwner,
      costPerFlightHour,
      ownerVariableCost: ownerVar,
    };
  });
}

export function buildPerOwnerFinancing(
  assumptions: AssumptionMap,
  profiles: ProposalOwnerProfile[],
  mode?: OwnerExpenseAllocationMode
): PerOwnerFinancing[] {
  const financingEnabled = assumptions.financing_enabled === "yes";
  if (!financingEnabled || profiles.length <= 1) return [];

  const allocationMode = mode ?? getAllocationMode(assumptions);
  const aircraftValue = num(assumptions.aircraft_value);
  const monthlyDebt = num(assumptions.monthly_debt_service);

  return profiles.map((profile) => {
    const pct = profile.ownershipPercent;
    const share = profile.ownershipPercent / 100;
    const monthly = allocatePoolAmount(
      monthlyDebt,
      profile,
      profiles,
      allocationMode,
      "financing"
    );
    return {
      profile,
      ownershipPercent: pct,
      impliedEquity: aircraftValue * share,
      monthlyDebtService: monthly,
      annualDebtService: monthly * 12,
    };
  });
}
