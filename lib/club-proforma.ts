/**
 * Silverleaf Air Golf Club pro forma.
 *
 * Pure, dependency-free calculator for the membership-club model. It is NOT
 * part of the aircraft-ownership pro forma engine (`lib/proforma.ts`) and must
 * stay isolated from it: that engine is golden-mastered for every other
 * usage type.
 *
 * Two layers:
 *  - `computeClubMonthly`  — month-by-month cash model (mirrors the
 *    "Silverleaf Golf Club" workbook: occupied vs flight hours, in-fleet vs
 *    off-fleet lift, down payment on acquisition, conformity lag).
 *  - `computeSteadyState` / `compareStructures` — annual run-rate economics
 *    and the licensing / joint-venture / owner-financed comparison from the
 *    program specification.
 *
 * Results are split into an owner view (Silverleaf only) and a PrismJet view.
 * Only the owner view may be sent to a client unless the PrismJet page is
 * visible in the published proposal.
 */

export type OperatingShareBasis = "gross" | "flight";
/** "occupied": DOC on occupied hours (spec). "occupied_over_occupancy": DOC on occupied ÷ occupancy, i.e. including repositioning (workbook). */
export type DirectCostBasis = "occupied" | "occupied_over_occupancy";

export type ClubInputs = {
  // Aircraft (per tail)
  assetCost: number;
  downPaymentPct: number;
  interestRate: number;
  termYears: number;
  fixedAnnualCostPerAircraft: number;
  directCostPerFlightHour: number;
  annualCapacityHours: number;
  occupancyRate: number;
  conformityMonths: number;
  maxAircraft: number;

  // Member terms
  initiationFee: number;
  monthlyDues: number;
  blockHourRate: number;
  /** Annual occupied-hour allocation per member. */
  allocationHours: number;
  /** Hours members actually fly per year (defaults to allocation). Above allocation → overage. */
  flownHoursPerMember: number;
  overageMarkup: number;

  // Operator / lift terms
  offFleetOccupiedRate: number;
  operatingSharePct: number;
  operatingShareBasis: OperatingShareBasis;
  directCostBasis: DirectCostBasis;

  // Member ramp
  foundingMembers: number;
  membersPerYear: number;
  /**
   * Hard cap on members (a waiting list beyond it). Defaults to the full fleet's capacity
   * (maxAircraft × members per aircraft): selling more memberships than aircraft is the
   * failure mode the program is designed to avoid.
   */
  memberCap?: number;
  /** Optional explicit acquisition months (1-based). When omitted, acquisitions follow the initiation trigger. */
  acquisitionMonths?: number[];

  // Ownership structures
  licenceFee: number;
  royaltyPct: number;
  jvSilverleafPct: number;
  ownerFinancedSilverleafPct: number;
  /** Share of one down payment Silverleaf puts up as bridge capital, per structure. */
  bridgeDownPayments: { licensing: number; jv: number; ownerFinanced: number };

  // Launch phase (PrismJet view only)
  interimLiftRates: number[];
  deadheadRatios: number[];
};

/** Defaults: the program specification's commercial terms, with the recommended base-case switches. */
export const CLUB_DEFAULTS: ClubInputs = {
  assetCost: 17_000_000,
  downPaymentPct: 0.2,
  interestRate: 0.06,
  termYears: 15,
  fixedAnnualCostPerAircraft: 1_500_000,
  directCostPerFlightHour: 3_500,
  annualCapacityHours: 600,
  occupancyRate: 0.85,
  conformityMonths: 4,
  maxAircraft: 4,

  initiationFee: 500_000,
  monthlyDues: 15_000,
  blockHourRate: 9_000,
  allocationHours: 50,
  flownHoursPerMember: 50,
  overageMarkup: 0.1,

  offFleetOccupiedRate: 12_000,
  operatingSharePct: 0.15,
  operatingShareBasis: "gross",
  directCostBasis: "occupied_over_occupancy",

  foundingMembers: 10,
  membersPerYear: 10,

  licenceFee: 500_000,
  royaltyPct: 0.05,
  jvSilverleafPct: 0.5,
  ownerFinancedSilverleafPct: 0.75,
  bridgeDownPayments: { licensing: 0, jv: 0.5, ownerFinanced: 1 },

  interimLiftRates: [7_000, 6_500, 6_000, 5_500],
  deadheadRatios: [0.25, 0.4],
};

/** Switch set that reproduces the program specification's published figures. */
export const SPEC_SWITCHES: Partial<ClubInputs> = {
  directCostBasis: "occupied",
  offFleetOccupiedRate: 14_000,
  operatingShareBasis: "gross",
};

/** Switch set that reproduces the "Silverleaf Golf Club" workbook (Sheet1). */
export const WORKBOOK_SWITCHES: Partial<ClubInputs> = {
  directCostBasis: "occupied_over_occupancy",
  offFleetOccupiedRate: 12_000,
  operatingShareBasis: "flight",
  foundingMembers: 10,
  membersPerYear: 3,
  acquisitionMonths: [1, 19],
};

export function withInputs(overrides: Partial<ClubInputs> = {}): ClubInputs {
  return { ...CLUB_DEFAULTS, ...overrides };
}

// ---------------------------------------------------------------------------
// Financing
// ---------------------------------------------------------------------------

export function downPayment(i: ClubInputs): number {
  return i.assetCost * i.downPaymentPct;
}

export function loanAmount(i: ClubInputs): number {
  return i.assetCost - downPayment(i);
}

/** Unrounded monthly payment (the aircraft pro forma engine rounds; the spec does not). */
export function monthlyDebtService(i: ClubInputs): number {
  const principal = loanAmount(i);
  const n = i.termYears * 12;
  const r = i.interestRate / 12;
  if (principal <= 0 || n <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function annualDebtService(i: ClubInputs): number {
  return monthlyDebtService(i) * 12;
}

function loanBalanceAfter(i: ClubInputs, months: number): number {
  const principal = loanAmount(i);
  const r = i.interestRate / 12;
  const pmt = monthlyDebtService(i);
  if (months <= 0) return principal;
  if (r === 0) return Math.max(0, principal - pmt * months);
  const g = Math.pow(1 + r, months);
  return Math.max(0, principal * g - (pmt * (g - 1)) / r);
}

/** Principal retired on one aircraft after `months` of payments. */
export function principalRetiredAfter(i: ClubInputs, months: number): number {
  return loanAmount(i) - loanBalanceAfter(i, months);
}

// ---------------------------------------------------------------------------
// Capacity
// ---------------------------------------------------------------------------

export function occupiedCapacityPerAircraft(i: ClubInputs): number {
  return i.annualCapacityHours * i.occupancyRate;
}

export function membersPerAircraft(i: ClubInputs): number {
  if (i.allocationHours <= 0) return 0;
  return Math.floor(occupiedCapacityPerAircraft(i) / i.allocationHours + 1e-9);
}

/** Paid initiations needed to fund one down payment. */
export function acquisitionTrigger(i: ClubInputs): number {
  if (i.initiationFee <= 0) return Infinity;
  return Math.ceil(downPayment(i) / i.initiationFee - 1e-9);
}

/** Members in month `m` (1-based). Month 1 is the founding cohort. */
export function membersInMonth(i: ClubInputs, month: number): number {
  if (month <= 0) return 0;
  const cap = i.memberCap ?? i.maxAircraft * membersPerAircraft(i);
  const raw =
    month === 1
      ? i.foundingMembers
      : Math.floor((i.membersPerYear / 12) * month + i.foundingMembers + 1e-9);
  return Math.min(raw, cap);
}

/** Acquisition months for each aircraft (1-based), explicit or trigger-driven. */
export function resolveAcquisitionMonths(i: ClubInputs, horizonMonths: number): number[] {
  if (i.acquisitionMonths) {
    return [...i.acquisitionMonths].sort((a, b) => a - b).slice(0, i.maxAircraft);
  }
  const trigger = acquisitionTrigger(i);
  const perTail = Math.max(1, membersPerAircraft(i));
  const months: number[] = [];
  for (let m = 1; m <= horizonMonths && months.length < i.maxAircraft; m++) {
    const needed = trigger + perTail * months.length;
    if (membersInMonth(i, m) >= needed) months.push(m);
  }
  return months;
}

// ---------------------------------------------------------------------------
// Monthly model
// ---------------------------------------------------------------------------

export type ClubMonth = {
  month: number;
  members: number;
  fleet: number;
  operationalFleet: number;
  occupiedHours: number;
  inFleetOccupiedHours: number;
  offFleetOccupiedHours: number;
  initiationRevenue: number;
  duesRevenue: number;
  flightRevenue: number;
  overageRevenue: number;
  totalRevenue: number;
  downPayment: number;
  fixedAndDebt: number;
  inFleetCost: number;
  offFleetCost: number;
  operatingShare: number;
  totalCost: number;
  net: number;
  cumulative: number;
};

export type ClubMonthlyResult = {
  months: ClubMonth[];
  acquisitionMonths: number[];
  /** First month the cumulative balance turns negative after having been positive, and its low point. */
  lowPoint: { month: number; cumulative: number } | null;
  /** Annual rollup of the monthly rows (year 1 = months 1-12). */
  years: ClubYear[];
};

export type ClubYear = {
  year: number;
  endMembers: number;
  endFleet: number;
  revenue: number;
  net: number;
  endCumulative: number;
};

export function computeClubMonthly(
  inputs: ClubInputs,
  horizonMonths = 60
): ClubMonthlyResult {
  const i = inputs;
  const acq = resolveAcquisitionMonths(i, horizonMonths);
  const fleetAt = (m: number) => acq.filter((a) => a <= m).length;
  const monthlyFixedAndDebtPerAircraft =
    (annualDebtService(i) + i.fixedAnnualCostPerAircraft) / 12;
  const monthlyCapacityOccupied = (i.annualCapacityHours / 12) * i.occupancyRate;
  const dp = downPayment(i);

  const months: ClubMonth[] = [];
  let prevMembers = 0;
  let cumulative = 0;
  let peak = -Infinity;
  let lowPoint: ClubMonthlyResult["lowPoint"] = null;

  for (let m = 1; m <= horizonMonths; m++) {
    const members = membersInMonth(i, m);
    const fleet = fleetAt(m);
    const opFleet = Math.max(0, fleetAt(m - i.conformityMonths));

    const allocMonthly = i.allocationHours / 12;
    const flownMonthly = i.flownHoursPerMember / 12;
    const occupiedHours = members * flownMonthly;
    const billedHours = members * Math.min(flownMonthly, allocMonthly);
    const overageHours = members * Math.max(0, flownMonthly - allocMonthly);

    const capacity = opFleet * monthlyCapacityOccupied;
    const inFleet = Math.min(occupiedHours, capacity);
    const offFleet = Math.max(0, occupiedHours - capacity);

    const initiationRevenue = (members - prevMembers) * i.initiationFee;
    const duesRevenue = members * i.monthlyDues;
    const flightRevenue = billedHours * i.blockHourRate;
    const overageRevenue =
      overageHours * i.directCostPerFlightHour * (1 + i.overageMarkup);
    const totalRevenue =
      initiationRevenue + duesRevenue + flightRevenue + overageRevenue;

    const inFleetFlightHours =
      i.directCostBasis === "occupied_over_occupancy"
        ? inFleet / i.occupancyRate
        : inFleet;
    const inFleetCost = inFleetFlightHours * i.directCostPerFlightHour;
    const offFleetCost = offFleet * i.offFleetOccupiedRate;
    const fixedAndDebt = fleet * monthlyFixedAndDebtPerAircraft;
    const downPaymentOut = (fleet - fleetAt(m - 1)) * dp;
    const shareBase =
      i.operatingShareBasis === "gross"
        ? totalRevenue
        : flightRevenue + overageRevenue;
    const operatingShare = shareBase * i.operatingSharePct;

    const totalCost =
      inFleetCost + offFleetCost + fixedAndDebt + downPaymentOut + operatingShare;
    const net = totalRevenue - totalCost;
    cumulative += net;
    peak = Math.max(peak, cumulative);
    if (m > 1 && cumulative < 0 && peak > 0) {
      if (!lowPoint || cumulative < lowPoint.cumulative) {
        lowPoint = { month: m, cumulative };
      }
    }

    months.push({
      month: m,
      members,
      fleet,
      operationalFleet: opFleet,
      occupiedHours,
      inFleetOccupiedHours: inFleet,
      offFleetOccupiedHours: offFleet,
      initiationRevenue,
      duesRevenue,
      flightRevenue,
      overageRevenue,
      totalRevenue,
      downPayment: downPaymentOut,
      fixedAndDebt,
      inFleetCost,
      offFleetCost,
      operatingShare,
      totalCost,
      net,
      cumulative,
    });
    prevMembers = members;
  }

  const years: ClubYear[] = [];
  for (let y = 0; y * 12 < months.length; y++) {
    const slice = months.slice(y * 12, y * 12 + 12);
    const last = slice[slice.length - 1];
    years.push({
      year: y + 1,
      endMembers: last.members,
      endFleet: last.fleet,
      revenue: slice.reduce((s, r) => s + r.totalRevenue, 0),
      net: slice.reduce((s, r) => s + r.net, 0),
      endCumulative: last.cumulative,
    });
  }

  return { months, acquisitionMonths: acq, lowPoint, years };
}

// ---------------------------------------------------------------------------
// Steady-state (annual run-rate) economics
// ---------------------------------------------------------------------------

export type SteadyState = {
  aircraft: number;
  members: number;
  duesRevenue: number;
  flightRevenue: number;
  overageRevenue: number;
  grossRevenue: number;
  inFleetCost: number;
  offFleetCost: number;
  directCost: number;
  fixedCost: number;
  debtService: number;
  operatingShare: number;
  /** Club net after the operating share (initiation fees excluded: they fund down payments). */
  clubNet: number;
  netPerAircraft: number;
  netPerMember: number;
  offFleetOccupiedHours: number;
  /** True when members' hours exceed the fleet's occupied capacity. */
  overCapacity: boolean;
};

export function computeSteadyState(
  inputs: ClubInputs,
  aircraft: number,
  members: number
): SteadyState {
  const i = inputs;
  const flown = members * i.flownHoursPerMember;
  const billed = members * Math.min(i.flownHoursPerMember, i.allocationHours);
  const overageHours = members * Math.max(0, i.flownHoursPerMember - i.allocationHours);
  const capacity = aircraft * occupiedCapacityPerAircraft(i);
  const inFleet = Math.min(flown, capacity);
  const offFleet = Math.max(0, flown - capacity);

  const duesRevenue = members * i.monthlyDues * 12;
  const flightRevenue = billed * i.blockHourRate;
  const overageRevenue =
    overageHours * i.directCostPerFlightHour * (1 + i.overageMarkup);
  const grossRevenue = duesRevenue + flightRevenue + overageRevenue;

  const flightHours =
    i.directCostBasis === "occupied_over_occupancy"
      ? inFleet / i.occupancyRate
      : inFleet;
  const inFleetCost = flightHours * i.directCostPerFlightHour;
  const offFleetCost = offFleet * i.offFleetOccupiedRate;
  const fixedCost = aircraft * i.fixedAnnualCostPerAircraft;
  const debtService = aircraft * annualDebtService(i);
  const shareBase =
    i.operatingShareBasis === "gross" ? grossRevenue : flightRevenue + overageRevenue;
  const operatingShare = shareBase * i.operatingSharePct;
  const clubNet =
    grossRevenue - inFleetCost - offFleetCost - fixedCost - debtService - operatingShare;

  return {
    aircraft,
    members,
    duesRevenue,
    flightRevenue,
    overageRevenue,
    grossRevenue,
    inFleetCost,
    offFleetCost,
    directCost: inFleetCost + offFleetCost,
    fixedCost,
    debtService,
    operatingShare,
    clubNet,
    netPerAircraft: aircraft > 0 ? clubNet / aircraft : 0,
    netPerMember: members > 0 ? clubNet / members : 0,
    offFleetOccupiedHours: offFleet,
    overCapacity: offFleet > 0,
  };
}

/** Steady state at 1..maxAircraft tails, each filled to capacity. */
export function computeScaling(inputs: ClubInputs): SteadyState[] {
  const perTail = membersPerAircraft(inputs);
  const out: SteadyState[] = [];
  for (let n = 1; n <= inputs.maxAircraft; n++) {
    out.push(computeSteadyState(inputs, n, perTail * n));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ownership structures
// ---------------------------------------------------------------------------

export type StructureKey = "licensing" | "jv" | "ownerFinanced";

export const STRUCTURE_LABELS: Record<StructureKey, string> = {
  licensing: "Licensing",
  jv: "Joint venture",
  ownerFinanced: "Owner-financed",
};

export type StructureOwnerResult = {
  key: StructureKey;
  label: string;
  silverleafAnnualCash: number;
  silverleafBridgeCapital: number;
  silverleafEquityPct: number;
  /** Silverleaf's share of fleet cost less loans, plus principal retired by `equityAtMonth`. */
  silverleafFleetEquity: number;
};

export type StructureComparison = {
  state: SteadyState;
  equityAtMonth: number;
  /** Acquisition months used for the equity roll (months since first aircraft, 0-based). */
  equityAcquisitionMonths: number[];
  principalRetired: number;
  owner: StructureOwnerResult[];
  prismjet: { key: StructureKey; label: string; annualCash: number; equityPct: number }[];
};

/**
 * Compare the three structures at a given fleet and member count.
 * `equityAcquisitionMonths` are months-from-start (first aircraft = 0) used to
 * roll principal retired up to `equityAtMonth`. Spec default: aircraft at
 * months 0, 12, 24 and equity read at month 36.
 */
export function compareStructures(
  inputs: ClubInputs,
  opts: {
    aircraft: number;
    members: number;
    equityAtMonth?: number;
    equityAcquisitionMonths?: number[];
  }
): StructureComparison {
  const i = inputs;
  const state = computeSteadyState(i, opts.aircraft, opts.members);
  const equityAtMonth = opts.equityAtMonth ?? 36;
  const acqMonths =
    opts.equityAcquisitionMonths ??
    Array.from({ length: opts.aircraft }, (_, k) => k * 12);
  const principalRetired = acqMonths.reduce(
    (sum, a) => sum + principalRetiredAfter(i, Math.max(0, equityAtMonth - a)),
    0
  );
  const fleetCost = opts.aircraft * i.assetCost;
  const fleetLoans = opts.aircraft * loanAmount(i);
  const fleetNetOfDebt = fleetCost - fleetLoans + principalRetired;
  const operatingShare = state.operatingShare;
  const dp = downPayment(i);

  const silverleafPct: Record<StructureKey, number> = {
    licensing: 0,
    jv: i.jvSilverleafPct,
    ownerFinanced: i.ownerFinancedSilverleafPct,
  };

  const silverleafCash: Record<StructureKey, number> = {
    licensing: i.licenceFee + i.royaltyPct * state.grossRevenue,
    jv: state.clubNet * i.jvSilverleafPct,
    ownerFinanced: state.clubNet * i.ownerFinancedSilverleafPct,
  };

  const keys: StructureKey[] = ["licensing", "jv", "ownerFinanced"];

  const owner = keys.map<StructureOwnerResult>((key) => ({
    key,
    label: STRUCTURE_LABELS[key],
    silverleafAnnualCash: silverleafCash[key],
    silverleafBridgeCapital: i.bridgeDownPayments[key] * dp,
    silverleafEquityPct: silverleafPct[key],
    silverleafFleetEquity: silverleafPct[key] * fleetNetOfDebt,
  }));

  // PrismJet earns the operating share plus whatever of the club net Silverleaf does not take.
  const prismjet = keys.map((key) => {
    const clubRemainder =
      key === "licensing"
        ? state.clubNet - silverleafCash[key]
        : state.clubNet * (1 - silverleafPct[key]);
    return {
      key,
      label: STRUCTURE_LABELS[key],
      annualCash: operatingShare + clubRemainder,
      equityPct: key === "licensing" ? 1 : 1 - silverleafPct[key],
    };
  });

  return {
    state,
    equityAtMonth,
    equityAcquisitionMonths: acqMonths,
    principalRetired,
    owner,
    prismjet,
  };
}

// ---------------------------------------------------------------------------
// Launch phase (PrismJet only)
// ---------------------------------------------------------------------------

export type InterimLiftRow = {
  rate: number;
  margins: { deadhead: number; margin: number }[];
};

/** Club margin per occupied hour when buying lift from PrismJet at an all-hours rate. */
export function interimLiftTable(inputs: ClubInputs): InterimLiftRow[] {
  return inputs.interimLiftRates.map((rate) => ({
    rate,
    margins: inputs.deadheadRatios.map((deadhead) => ({
      deadhead,
      margin: Math.round((inputs.blockHourRate - rate * (1 + deadhead)) * 100) / 100,
    })),
  }));
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

/** Everything Silverleaf (and members) may see. Contains no PrismJet cash, equity or interim rates. */
export type ClubOwnerView = {
  inputs: Pick<
    ClubInputs,
    | "assetCost"
    | "downPaymentPct"
    | "initiationFee"
    | "monthlyDues"
    | "blockHourRate"
    | "allocationHours"
    | "overageMarkup"
    | "annualCapacityHours"
    | "occupancyRate"
    | "conformityMonths"
    | "maxAircraft"
    | "operatingSharePct"
  >;
  membersPerAircraft: number;
  acquisitionTrigger: number;
  annualDebtServicePerAircraft: number;
  monthly: ClubMonthlyResult;
  scaling: SteadyState[];
  structures: { state: SteadyState; owner: StructureOwnerResult[]; principalRetired: number; equityAtMonth: number };
};

/** PrismJet-only economics. Never serialised to a client unless the PrismJet page is visible. */
export type ClubPrismjetView = {
  operatingSharePct: number;
  operatingShareBasis: OperatingShareBasis;
  structures: StructureComparison["prismjet"];
  operatingShareAnnual: number;
  interimLift: InterimLiftRow[];
};

export type ClubModelResult = {
  owner: ClubOwnerView;
  prismjet: ClubPrismjetView;
};

/** Silverleaf-only projection. Safe to compute in the browser; carries no PrismJet cash, equity or lift rates. */
export function computeClubOwnerView(
  inputs: ClubInputs,
  opts: { horizonMonths?: number; structureAircraft?: number } = {}
): ClubOwnerView {
  const horizon = opts.horizonMonths ?? 60;
  const perTail = membersPerAircraft(inputs);
  const aircraft = Math.min(opts.structureAircraft ?? 3, inputs.maxAircraft);
  const comparison = compareStructures(inputs, {
    aircraft,
    members: perTail * aircraft,
  });

  return {
    inputs: {
      assetCost: inputs.assetCost,
      downPaymentPct: inputs.downPaymentPct,
      initiationFee: inputs.initiationFee,
      monthlyDues: inputs.monthlyDues,
      blockHourRate: inputs.blockHourRate,
      allocationHours: inputs.allocationHours,
      overageMarkup: inputs.overageMarkup,
      annualCapacityHours: inputs.annualCapacityHours,
      occupancyRate: inputs.occupancyRate,
      conformityMonths: inputs.conformityMonths,
      maxAircraft: inputs.maxAircraft,
      operatingSharePct: inputs.operatingSharePct,
    },
    membersPerAircraft: perTail,
    acquisitionTrigger: acquisitionTrigger(inputs),
    annualDebtServicePerAircraft: annualDebtService(inputs),
    monthly: computeClubMonthly(inputs, horizon),
    scaling: computeScaling(inputs),
    structures: {
      state: comparison.state,
      owner: comparison.owner,
      principalRetired: comparison.principalRetired,
      equityAtMonth: comparison.equityAtMonth,
    },
  };
}

export function computeClubPrismjetView(
  inputs: ClubInputs,
  opts: { structureAircraft?: number } = {}
): ClubPrismjetView {
  const perTail = membersPerAircraft(inputs);
  const aircraft = Math.min(opts.structureAircraft ?? 3, inputs.maxAircraft);
  const comparison = compareStructures(inputs, {
    aircraft,
    members: perTail * aircraft,
  });
  return {
    operatingSharePct: inputs.operatingSharePct,
    operatingShareBasis: inputs.operatingShareBasis,
    structures: comparison.prismjet,
    operatingShareAnnual: comparison.state.operatingShare,
    interimLift: interimLiftTable(inputs),
  };
}

export function computeClubModel(
  inputs: ClubInputs,
  opts: { horizonMonths?: number; structureAircraft?: number } = {}
): ClubModelResult {
  return {
    owner: computeClubOwnerView(inputs, opts),
    prismjet: computeClubPrismjetView(inputs, opts),
  };
}
