"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import type { ClubClientView } from "@/lib/club-client-view";
import {
  STRUCTURE_LABELS,
  compareStructures,
  computeClubOwnerView,
  computeScaling,
  computeSteadyState,
  membersPerAircraft,
  type ClubInputs,
  type StructureKey,
} from "@/lib/club-proforma";
import { cn } from "@/lib/utils";
import { BarList, CashChart, HoursGauge, type BarRow } from "./club-charts";
import { fmtInt, fmtPct, fmtUsd, fmtUsdCompact } from "./club-format";
import {
  AnimatedNumber,
  Callout,
  ClubCard,
  ClubHeader,
  KpiTile,
  ModelNote,
  RangeField,
  Segmented,
  clubText,
} from "./club-ui";

export type ClubViewKey =
  | "program-stats"
  | "structures"
  | "scaling"
  | "member-cost"
  | "cash-timeline"
  | "pro-forma"
  | "prismjet";

const STRUCTURE_BLURB: Record<StructureKey, string> = {
  licensing: "Silverleaf lends the name and member access for a fee and royalty. No capital at risk.",
  jv: "Silverleaf shares the bridge capital and the fleet equally with the operator.",
  ownerFinanced: "Silverleaf arranges acquisition financing and owns three quarters of the fleet.",
};

const STRUCTURE_ORDER: StructureKey[] = ["licensing", "jv", "ownerFinanced"];

// ---------------------------------------------------------------------------
// Program stats
// ---------------------------------------------------------------------------

export function ProgramStatsView({ club }: { club: ClubClientView }) {
  const i = club.inputs;
  return (
    <ClubCard>
      <ClubHeader
        eyebrow="The program"
        title="Membership at a glance"
        description="One initiation, one monthly figure, and one published rate for the time you fly."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile countUp label="Initiation (one time)" value={i.initiationFee} format={fmtUsd} hint="Non-refundable" />
        <KpiTile countUp label="Monthly dues" value={i.monthlyDues} format={fmtUsd} hint="Billed in advance" />
        <KpiTile countUp label="Block hour rate" value={i.blockHourRate} format={fmtUsd} hint="Per block hour" />
        <KpiTile
          countUp
          label="Included hours"
          value={i.allocationHours}
          format={(n) => `${Math.round(n)} hrs`}
          hint="Per member, per year"
        />
      </div>
    </ClubCard>
  );
}

// ---------------------------------------------------------------------------
// Ownership structures (Silverleaf perspective)
// ---------------------------------------------------------------------------

export function StructuresView({ club }: { club: ClubClientView }) {
  const reduced = useReducedMotion();
  const perTail = membersPerAircraft(club.inputs);
  const [aircraft, setAircraft] = useState(3);
  const [active, setActive] = useState<StructureKey>("ownerFinanced");

  const cmp = useMemo(
    () => compareStructures(club.inputs, { aircraft, members: perTail * aircraft }),
    [club.inputs, aircraft, perTail]
  );
  const rows = Object.fromEntries(cmp.owner.map((o) => [o.key, o])) as Record<
    StructureKey,
    (typeof cmp.owner)[number]
  >;
  const maxCash = Math.max(...cmp.owner.map((o) => Math.abs(o.silverleafAnnualCash)), 1);
  const sel = rows[active];
  // Badges come from the figures on screen, so they never contradict them.
  const topCash = cmp.owner.reduce((a, b) => (b.silverleafAnnualCash > a.silverleafAnnualCash ? b : a)).key;
  const topEquity = cmp.owner.reduce((a, b) => (b.silverleafFleetEquity > a.silverleafFleetEquity ? b : a)).key;
  const badgesFor = (key: StructureKey): string[] => {
    const out: string[] = [];
    if (key === topCash) out.push("Most cash");
    if (key === topEquity && rows[key].silverleafFleetEquity > 0) out.push("Most fleet equity");
    if (rows[key].silverleafBridgeCapital === 0) out.push("No capital at risk");
    return out;
  };

  return (
    <ClubCard>
      <ClubHeader
        eyebrow="Ownership structure"
        title="Three ways to build the club"
        description="They differ on one axis: how much capital Silverleaf puts at risk and how much of the fleet it owns at the end."
        aside={
          <Segmented
            ariaLabel="Fleet size"
            size="sm"
            value={aircraft}
            onChange={setAircraft}
            options={Array.from({ length: club.inputs.maxAircraft }, (_, k) => ({
              value: k + 1,
              label: `${k + 1} aircraft`,
            }))}
          />
        }
      />

      <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Ownership structure">
        {STRUCTURE_ORDER.map((key) => {
          const o = rows[key];
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setActive(key)}
              className={cn(
                "group relative rounded-2xl border p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60",
                isActive
                  ? "border-emerald-400/60 bg-emerald-400/[0.08] shadow-[0_0_0_1px_rgba(74,222,128,0.25),0_12px_40px_-12px_rgba(74,222,128,0.35)]"
                  : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.06]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{STRUCTURE_LABELS[key]}</span>
              </div>
              {badgesFor(key).length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {badgesFor(key).map((b) => (
                    <span
                      key={b}
                      className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="mt-2 min-h-[3.6rem] text-xs leading-relaxed text-white/55">{STRUCTURE_BLURB[key]}</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-white/45">Annual cash to Silverleaf</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                <AnimatedNumber value={o.silverleafAnnualCash} format={fmtUsd} />
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={cn("h-full rounded-full", isActive ? "bg-emerald-400" : "bg-white/35")}
                  initial={false}
                  animate={{ width: `${(Math.abs(o.silverleafAnnualCash) / maxCash) * 100}%` }}
                  transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <KpiTile label="Bridge capital at risk" value={sel.silverleafBridgeCapital} format={fmtUsd} hint="Down-payment share" tone={sel.silverleafBridgeCapital === 0 ? "positive" : "default"} />
          <KpiTile label="Silverleaf fleet ownership" value={sel.silverleafEquityPct} format={(n) => fmtPct(n)} hint="Of the club fleet" />
          <KpiTile label={`Fleet equity, year ${cmp.equityAtMonth / 12}`} value={sel.silverleafFleetEquity} format={fmtUsdCompact} hint="At cost, less debt" />
          <KpiTile label="Annual cash, run rate" value={sel.silverleafAnnualCash} format={fmtUsdCompact} hint={`${aircraft} aircraft · ${perTail * aircraft} members`} tone="positive" />
        </motion.div>
      </AnimatePresence>

      {active === "licensing" ? (
        <p className={cn(clubText.muted, "mt-3")}>
          Licensing: {fmtUsd(club.inputs.licenceFee)} annual fee plus a {fmtPct(club.inputs.royaltyPct)} royalty on club gross revenue.
        </p>
      ) : null}
      <ModelNote />
    </ClubCard>
  );
}

// ---------------------------------------------------------------------------
// Fleet scaling
// ---------------------------------------------------------------------------

function waterfall(s: ReturnType<typeof computeSteadyState>, share: number): { rows: BarRow[]; scale: number } {
  const rows: BarRow[] = [
    { kind: "in", label: "Dues", value: s.duesRevenue },
    { kind: "in", label: "Flight revenue", value: s.flightRevenue + s.overageRevenue },
    { kind: "out", label: "Direct operating cost", value: s.directCost },
    { kind: "out", label: "Fixed operating cost", value: s.fixedCost },
    { kind: "out", label: "Debt service", value: s.debtService },
    { kind: "out", label: "Operator share", value: s.operatingShare, note: fmtPct(share) },
    { kind: "net", label: "Club net", value: s.clubNet },
  ];
  return { rows, scale: Math.max(s.duesRevenue + s.flightRevenue + s.overageRevenue, 1) };
}

export function ScalingView({ club }: { club: ClubClientView }) {
  const perTail = membersPerAircraft(club.inputs);
  const [aircraft, setAircraft] = useState(1);
  const scaling = useMemo(() => computeScaling(club.inputs), [club.inputs]);
  const s = scaling[Math.min(aircraft, scaling.length) - 1] ?? scaling[0];
  const w = waterfall(s, club.inputs.operatingSharePct);

  return (
    <ClubCard>
      <ClubHeader
        eyebrow="Fleet scaling"
        title="Each aircraft is bought by the members who need it"
        description={`${perTail} members fill one aircraft. Net per member stays constant as the fleet grows.`}
        aside={
          <Segmented
            ariaLabel="Fleet size"
            size="sm"
            value={aircraft}
            onChange={setAircraft}
            options={scaling.map((x) => ({ value: x.aircraft, label: `${x.aircraft}` }))}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <BarList rows={w.rows} scale={w.scale} />
        <div className="grid grid-cols-2 gap-3 self-start lg:grid-cols-1">
          <KpiTile label="Members" value={s.members} format={fmtInt} />
          <KpiTile label="Club net per year" value={s.clubNet} format={fmtUsdCompact} tone="positive" />
          <KpiTile label="Net per member" value={s.netPerMember} format={fmtUsd} />
        </div>
      </div>
      <ModelNote />
    </ClubCard>
  );
}

// ---------------------------------------------------------------------------
// Member cost calculator
// ---------------------------------------------------------------------------

export function MemberCostView({ club }: { club: ClubClientView }) {
  const i = club.inputs;
  const [hours, setHours] = useState(i.allocationHours);
  const maxHours = Math.round(i.allocationHours * 1.6);
  const overHours = Math.max(0, hours - i.allocationHours);
  const dues = i.monthlyDues * 12;
  const flight = Math.min(hours, i.allocationHours) * i.blockHourRate;
  const overageRate = i.directCostPerFlightHour * (1 + i.overageMarkup);
  const overage = overHours * overageRate;
  const total = dues + flight + overage;

  return (
    <ClubCard>
      <ClubHeader
        eyebrow="Member cost"
        title="What a year of flying costs"
        description="Slide the hours you expect to fly. Time beyond the included hours is billed at cost plus a small margin, never at a surprise rate."
      />
      <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
        <div className="mx-auto w-full max-w-[220px]">
          <HoursGauge hours={hours} allocation={i.allocationHours} maxHours={maxHours} />
        </div>
        <div className="space-y-5">
          <RangeField
            label="Hours flown per year"
            value={hours}
            min={0}
            max={maxHours}
            onChange={setHours}
            display={`${hours} hrs`}
          />
          <dl className="grid gap-2 text-sm">
            {[
              ["Annual dues", dues, `${fmtUsd(i.monthlyDues)} × 12`],
              ["Flight time", flight, `${Math.min(hours, i.allocationHours)} hrs × ${fmtUsd(i.blockHourRate)}`],
              ["Overage", overage, overHours > 0 ? `${overHours} hrs × ${fmtUsd(overageRate)}` : "None"],
            ].map(([label, value, note]) => (
              <div key={String(label)} className="flex items-baseline justify-between gap-3 border-b border-white/[0.07] pb-2">
                <dt className="text-white/65">
                  {label} <span className="ml-1 text-xs text-white/40">{note}</span>
                </dt>
                <dd className="tabular-nums text-white">
                  <AnimatedNumber value={Number(value)} format={fmtUsd} />
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <dt className="font-semibold text-white">Total, per year</dt>
              <dd className="text-2xl font-semibold tabular-nums text-emerald-300">
                <AnimatedNumber value={total} format={fmtUsd} />
              </dd>
            </div>
          </dl>
          <p className={clubText.muted}>
            Plus a one-time {fmtUsd(i.initiationFee)} initiation in the first year. The initiation is non-refundable.
          </p>
          <AnimatePresence initial={false}>
            {overHours > 0 ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <Callout tone="warn">
                  {overHours} hours past your {i.allocationHours} included. They are billed at cost plus {fmtPct(i.overageMarkup)} and shown before you confirm any trip.
                </Callout>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </ClubCard>
  );
}

// ---------------------------------------------------------------------------
// Cash timeline + adjustable pro forma (Silverleaf perspective)
// ---------------------------------------------------------------------------

type Ramp = "spec" | "workbook" | "custom";

function useClubModel(base: ClubInputs) {
  const [founding, setFounding] = useState(base.foundingMembers);
  const [perYear, setPerYear] = useState(base.membersPerYear);
  const [flown, setFlown] = useState(base.flownHoursPerMember);
  const ramp: Ramp =
    founding === 10 && perYear === 10 ? "spec" : founding === 10 && perYear === 3 ? "workbook" : "custom";

  const inputs = useMemo<ClubInputs>(
    () => ({
      ...base,
      foundingMembers: founding,
      membersPerYear: perYear,
      flownHoursPerMember: flown,
      acquisitionMonths: undefined,
    }),
    [base, founding, perYear, flown]
  );
  const owner = useMemo(() => computeClubOwnerView(inputs, { horizonMonths: 60 }), [inputs]);

  return {
    inputs,
    owner,
    founding,
    perYear,
    flown,
    ramp,
    setFounding,
    setPerYear,
    setFlown,
    setRamp(r: Ramp) {
      if (r === "spec") {
        setFounding(10);
        setPerYear(10);
      } else if (r === "workbook") {
        setFounding(10);
        setPerYear(3);
      }
    },
    reset() {
      setFounding(base.foundingMembers);
      setPerYear(base.membersPerYear);
      setFlown(base.flownHoursPerMember);
    },
  };
}

export function CashTimelineView({ club }: { club: ClubClientView }) {
  const m = useClubModel(club.inputs);
  const monthly = m.owner.monthly;
  const last = monthly.months[monthly.months.length - 1];

  return (
    <ClubCard>
      <ClubHeader
        eyebrow="Cash position"
        title="Cumulative cash, month by month"
        description="Initiation fees fund each down payment. The dip marks the months a new aircraft is carried before it enters service."
        aside={
          <Segmented
            ariaLabel="Member growth"
            size="sm"
            value={m.ramp}
            onChange={(r) => m.setRamp(r)}
            options={[
              { value: "spec", label: "10 / year" },
              { value: "workbook", label: "3 / year" },
              ...(m.ramp === "custom" ? [{ value: "custom" as Ramp, label: "Custom" }] : []),
            ]}
          />
        }
      />
      <CashChart months={monthly.months} acquisitionMonths={monthly.acquisitionMonths} lowPoint={monthly.lowPoint} />
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Members, month 60" value={last.members} format={fmtInt} />
        <KpiTile label="Aircraft, month 60" value={last.fleet} format={fmtInt} />
        <KpiTile label="Cash, month 60" value={last.cumulative} format={fmtUsdCompact} tone={last.cumulative >= 0 ? "positive" : "negative"} />
        <KpiTile
          label="Low point"
          value={monthly.lowPoint?.cumulative ?? 0}
          format={fmtUsdCompact}
          tone={monthly.lowPoint ? "negative" : "default"}
          hint={monthly.lowPoint ? `Month ${monthly.lowPoint.month}` : "Never negative"}
        />
      </div>
      <ModelNote />
    </ClubCard>
  );
}

export function ProFormaView({ club }: { club: ClubClientView }) {
  const m = useClubModel(club.inputs);
  const reduced = useReducedMotion();
  const [aircraft, setAircraft] = useState(3);
  const [active, setActive] = useState<StructureKey>("ownerFinanced");
  const perTail = membersPerAircraft(m.inputs);
  const monthly = m.owner.monthly;
  const last = monthly.months[monthly.months.length - 1];
  const offFleetHours = monthly.months.reduce((s, x) => s + x.offFleetOccupiedHours, 0);
  const cmp = useMemo(
    () => compareStructures(m.inputs, { aircraft, members: perTail * aircraft }),
    [m.inputs, aircraft, perTail]
  );
  const steady = cmp.state;
  const w = waterfall(steady, m.inputs.operatingSharePct);
  const sel = cmp.owner.find((o) => o.key === active)!;
  const maxCash = Math.max(...cmp.owner.map((o) => Math.abs(o.silverleafAnnualCash)), 1);
  const dirty =
    m.founding !== club.inputs.foundingMembers ||
    m.perYear !== club.inputs.membersPerYear ||
    m.flown !== club.inputs.flownHoursPerMember;

  return (
    <div className="space-y-4">
      <ClubCard glow>
        <ClubHeader
          eyebrow="Silverleaf pro forma"
          title="Shape the model"
          description="Change the assumptions that matter most and the whole pro forma recalculates."
          aside={
            <button
              type="button"
              onClick={m.reset}
              disabled={!dirty}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70 transition hover:border-white/40 hover:text-white disabled:pointer-events-none disabled:opacity-30"
            >
              Reset
            </button>
          }
        />
        <div className="grid gap-5 md:grid-cols-3">
          <RangeField label="Founding members" value={m.founding} min={5} max={15} onChange={m.setFounding} display={`${m.founding}`} hint="Admitted in month one" />
          <RangeField label="New members per year" value={m.perYear} min={0} max={20} onChange={m.setPerYear} display={`${m.perYear}`} hint="Spec: 10 · Workbook: 3" />
          <RangeField label="Hours flown per member" value={m.flown} min={20} max={80} onChange={m.setFlown} display={`${m.flown} hrs`} hint={`${m.inputs.allocationHours} included each year`} />
        </div>
        <AnimatePresence initial={false}>
          {offFleetHours > 0 ? (
            <motion.div className="mt-4" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Callout tone="warn">
                {fmtInt(offFleetHours)} occupied hours over five years are flown on outside aircraft at {fmtUsd(m.inputs.offFleetOccupiedRate)} each, while new aircraft are conformed or when members&apos; hours exceed fleet capacity. This erodes the margin.
              </Callout>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </ClubCard>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile countUp label="Members, month 60" value={last.members} format={fmtInt} />
        <KpiTile countUp label="Aircraft, month 60" value={last.fleet} format={fmtInt} />
        <KpiTile countUp label="Cash, month 60" value={last.cumulative} format={fmtUsdCompact} tone={last.cumulative >= 0 ? "positive" : "negative"} />
        <KpiTile
          countUp
          label="Lowest cash point"
          value={monthly.lowPoint?.cumulative ?? 0}
          format={fmtUsdCompact}
          tone={monthly.lowPoint ? "negative" : "default"}
          hint={monthly.lowPoint ? `Month ${monthly.lowPoint.month}` : "Never negative"}
        />
      </div>

      <ClubCard>
        <ClubHeader eyebrow="Cash position" title="Cumulative cash" />
        <CashChart months={monthly.months} acquisitionMonths={monthly.acquisitionMonths} lowPoint={monthly.lowPoint} />
      </ClubCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ClubCard>
          <ClubHeader
            eyebrow="Run rate"
            title="Club economics"
            aside={
              <Segmented
                ariaLabel="Fleet size"
                size="sm"
                value={aircraft}
                onChange={setAircraft}
                options={Array.from({ length: m.inputs.maxAircraft }, (_, k) => ({ value: k + 1, label: `${k + 1}` }))}
              />
            }
          />
          <BarList rows={w.rows} scale={w.scale} />
        </ClubCard>

        <ClubCard>
          <ClubHeader eyebrow="Structure" title="Cash to Silverleaf" />
          <div className="mb-4">
            <Segmented
              ariaLabel="Ownership structure"
              size="sm"
              value={active}
              onChange={setActive}
              options={STRUCTURE_ORDER.map((k) => ({ value: k, label: STRUCTURE_LABELS[k] }))}
            />
          </div>
          <ul className="space-y-3">
            {cmp.owner.map((o) => (
              <li key={o.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className={cn(o.key === active ? "font-semibold text-white" : "text-white/60")}>{o.label}</span>
                  <span className="tabular-nums text-white">
                    <AnimatedNumber value={o.silverleafAnnualCash} format={fmtUsd} />
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div
                    className={cn("h-full rounded-full", o.key === active ? "bg-emerald-400" : "bg-white/30")}
                    initial={false}
                    animate={{ width: `${(Math.abs(o.silverleafAnnualCash) / maxCash) * 100}%` }}
                    transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <KpiTile label="Bridge capital" value={sel.silverleafBridgeCapital} format={fmtUsdCompact} />
            <KpiTile label={`Fleet equity, yr ${cmp.equityAtMonth / 12}`} value={sel.silverleafFleetEquity} format={fmtUsdCompact} tone="positive" />
          </div>
        </ClubCard>
      </div>
      <ModelNote />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PrismJet economics (hidden before the proposal is shared with Silverleaf)
// ---------------------------------------------------------------------------

export function PrismjetView({ club }: { club: ClubClientView }) {
  const pj = club.prismjet;
  if (!pj) return null;
  const maxCash = Math.max(...pj.structures.map((s) => Math.abs(s.annualCash)), 1);
  return (
    <div className="space-y-4">
      <ClubCard>
        <ClubHeader
          eyebrow="PrismJet"
          title="Operator economics"
          description="How PrismJet is paid for operating the club. The share pays for the certificate, crew, dispatch, Atlas and member fulfilment."
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile countUp label="Operating share" value={pj.operatingSharePct} format={(n) => fmtPct(n)} hint={pj.operatingShareBasis === "gross" ? "Of club gross revenue" : "Of flight revenue"} />
          <KpiTile countUp label="Operating share, per year" value={pj.operatingShareAnnual} format={fmtUsdCompact} hint="At three aircraft" tone="positive" />
        </div>
      </ClubCard>

      <ClubCard>
        <ClubHeader eyebrow="By structure" title="Annual cash to PrismJet" />
        <ul className="space-y-3">
          {pj.structures.map((s) => (
            <li key={s.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-white/75">
                  {s.label} <span className="ml-1 text-xs text-white/40">{fmtPct(s.equityPct)} equity</span>
                </span>
                <span className="tabular-nums text-white">{fmtUsd(s.annualCash)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${(Math.abs(s.annualCash) / maxCash) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </ClubCard>

      <ClubCard>
        <ClubHeader
          eyebrow="Launch phase"
          title="Interim lift rate"
          description="Margin per occupied hour while the club buys lift from PrismJet before it owns an aircraft."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-white/45">
                <th className="pb-2 font-medium">Rate, all hours</th>
                {pj.interimLift[0]?.margins.map((m) => (
                  <th key={m.deadhead} className="pb-2 text-right font-medium">
                    {fmtPct(m.deadhead)} deadhead
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pj.interimLift.map((row) => (
                <tr key={row.rate} className="border-t border-white/[0.07]">
                  <td className="py-2.5 tabular-nums text-white/80">{fmtUsd(row.rate)}</td>
                  {row.margins.map((m) => (
                    <td key={m.deadhead} className={cn("py-2.5 text-right tabular-nums", m.margin < 0 ? "text-rose-300" : "text-emerald-300")}>
                      {fmtUsd(m.margin)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ModelNote />
      </ClubCard>
    </div>
  );
}
