"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn, formatCurrency, parseFormattedNumber } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/money-input";
import { HoursInput } from "@/components/ui/hours-input";
import { ClientProFormaStatement } from "@/components/client/client-proforma-statement";
import { ProFormaAssumptionsList } from "@/components/client/pro-forma-assumptions";
import { ProFormaUtilizationSummary } from "@/components/client/pro-forma-utilization-summary";
import { ProFormaFinancingPanel } from "@/components/shared/pro-forma-financing-panel";
import { CrewLadderStepper } from "@/components/shared/crew-ladder-stepper";
import {
  serializeClientSnapshotFromPayload,
  type ClientSnapshotView,
} from "@/lib/client-serializer-payload";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";
import {
  computeWorkspaceProFormaForClient,
  resolveClientCrewSummary,
  resolvePortalCrewStepFloor,
  stringsToAssumptionMap,
} from "@/lib/workspace-proforma-client";
import type { AssumptionMap } from "@/lib/assumptions";
import {
  isFinancingScenarioVisible,
  resolveInitialFinancingEnabled,
} from "@/lib/financing-scenario";
import { useExperienceBootstrapOptional } from "@/components/client/experience/v2/experience-bootstrap-context";
import { ProFormaCompare } from "@/components/client/pro-forma-compare";
import {
  buildProFormaComparison,
  compareInputsFromPayload,
  parseCompareParam,
  MAX_COMPARE_AIRCRAFT,
} from "@/lib/client-proforma-compare";

function parseFinancingNumber(raw: string | undefined): number | undefined {
  const n = parseFloat(raw ?? "");
  return Number.isFinite(n) ? n : undefined;
}

function financingBaselineFromMap(map: Record<string, string>) {
  const assumptions = stringsToAssumptionMap(map);
  return {
    enabled: resolveInitialFinancingEnabled(assumptions),
    downPaymentPercent: map.down_payment_percent ?? "",
    interestRate: map.interest_rate ?? "",
    termMonths: map.term_months ?? "",
    balloonPayment: map.balloon_payment ?? "",
  };
}

type ClientProFormaData = ClientSnapshotView;

const inputClass =
  "mt-1.5 w-full rounded border border-white/20 bg-white/10 px-3 py-2.5 font-mono text-sm text-white backdrop-blur focus:border-atlas-accent focus:outline-none focus:ring-1 focus:ring-atlas-accent/30";

/** Shared width for aircraft value + owner hours (fits up to 99,999,999). */
const proFormaNumericInputClass = cn(
  inputClass,
  "mt-0 w-[11rem] max-w-full shrink-0 text-right tabular-nums"
);

const sectionTitleClass =
  "text-xs font-medium uppercase tracking-[0.3em] text-atlas-accent";

function ProFormaSectionTitle({ children }: { children: React.ReactNode }) {
  return <p className={sectionTitleClass}>{children}</p>;
}

const DEFAULT_DESCRIPTION =
  "Explore annual and monthly ownership economics. Adjust aircraft value and owner hours to model scenarios — crew and utilization update live.";

/** Match `.portal-v2-column-scroll-fade` height in globals.css (~2.5rem). */
const PROFORMA_COLUMN_FADE_HEIGHT_PX = 40;

/** Scrollable column wrapper for the embedded pro forma grid. */
function ProFormaColumn({
  children,
  className,
  embedded = false,
  scrollDeps,
  pinnedFooter,
}: {
  children: React.ReactNode;
  className?: string;
  embedded?: boolean;
  /** Re-run overflow/fade detection when column content changes. */
  scrollDeps?: unknown;
  /** Pinned below the scroll region — not covered by the bottom fade overlay. */
  pinnedFooter?: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showScrollFade, setShowScrollFade] = useState(false);

  const updateScrollFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight + 2;
    const atBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - PROFORMA_COLUMN_FADE_HEIGHT_PX;
    setShowScrollFade(hasOverflow && !atBottom);
  }, []);

  useEffect(() => {
    if (!embedded) return;
    const el = scrollRef.current;
    if (!el) return;
    const run = () => updateScrollFade();
    run();
    const t = window.setTimeout(run, 0);
    el.addEventListener("scroll", run, { passive: true });
    const observer = new ResizeObserver(run);
    observer.observe(el);
    const contentEl = contentRef.current;
    if (contentEl) observer.observe(contentEl);
    return () => {
      window.clearTimeout(t);
      el.removeEventListener("scroll", run);
      observer.disconnect();
    };
  }, [embedded, updateScrollFade, children, scrollDeps]);

  if (!embedded) {
    return (
      <div className={cn("min-h-0 min-w-0", className)}>
        {children}
        {pinnedFooter}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden",
        className
      )}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-0.5 sm:pr-1"
          style={{ scrollPaddingBottom: PROFORMA_COLUMN_FADE_HEIGHT_PX }}
        >
          <div ref={contentRef}>{children}</div>
        </div>
        {showScrollFade ? <div className="portal-v2-column-scroll-fade" aria-hidden /> : null}
      </div>
      {pinnedFooter ? (
        <div className="relative z-[3] shrink-0 border-t border-white/10 bg-[#0a0d14] pt-2.5 pb-0.5">
          {pinnedFooter}
        </div>
      ) : null}
    </div>
  );
}

function totalProformaHours(hours: number[]): number {
  return hours.reduce((s, h) => s + (Number.isFinite(h) && h >= 0 ? h : 0), 0);
}

function parseCrewStepIndex(raw: string | undefined): number | undefined {
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) ? n : undefined;
}

function initialCrewStepForSnapshot(
  snapshot: ClientProFormaData,
  ownerHours: number
): number {
  if (snapshot.defaultCrewStepIndex != null) {
    return snapshot.defaultCrewStepIndex;
  }
  const assumptions = stringsToAssumptionMap(snapshot.calculationAssumptions ?? {});
  return resolvePortalCrewStepFloor(assumptions, ownerHours);
}

export function ProFormaClient({
  slug,
  initial,
  initialAircraftId,
  embedded = false,
  experiencePath = true,
  title,
  description,
  showTitleColumn = true,
  className,
}: {
  slug: string;
  initial: ClientProFormaData;
  initialAircraftId?: string | null;
  embedded?: boolean;
  experiencePath?: boolean;
  /** Title shown in the first column (defaults to "Pro Forma"). */
  title?: string;
  /** Descriptive paragraph shown under the title in the first column. */
  description?: string;
  /** When false, the title/description column is omitted (host already shows it). */
  showTitleColumn?: boolean;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const experienceBootstrap = useExperienceBootstrapOptional();

  // Every aircraft's frozen inputs, for side-by-side compare and live selector figures.
  // Empty when the payload only carries lightweight entries (e.g. designer preview).
  const compareInputs = useMemo(
    () => (experienceBootstrap?.payload ? compareInputsFromPayload(experienceBootstrap.payload) : []),
    [experienceBootstrap?.payload]
  );
  const canCompare = compareInputs.length > 1;

  const resolvedInitialAircraftId =
    initialAircraftId ?? initial.aircraft.id ?? initial.aircraftList[0]?.id ?? "";

  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const [snapshot, setSnapshot] = useState(initial);
  const [selectedAircraftId, setSelectedAircraftId] = useState(resolvedInitialAircraftId);
  const [aircraftValue, setAircraftValue] = useState(
    String(initial.editableFields.aircraftValue.value)
  );
  const [proformaOwnerHours, setProformaOwnerHours] = useState<number[]>(
    initial.proformaOwnerHours ?? [initial.editableFields.ownerAnnualHours.value]
  );
  const initialTotalOwnerHours = totalProformaHours(
    initial.proformaOwnerHours ?? [initial.editableFields.ownerAnnualHours.value]
  );
  const initialCrewStep = initialCrewStepForSnapshot(initial, initialTotalOwnerHours);
  const initialFinancing = financingBaselineFromMap(initial.calculationAssumptions ?? {});
  const [baseline, setBaseline] = useState({
    aircraftValue: initial.baseMetrics.aircraftValue,
    proformaOwnerHours:
      initial.baseProformaOwnerHours ??
      initial.proformaOwnerHours ??
      [initial.baseMetrics.ownerHours],
    crewStepIndex: initialCrewStep,
    financing: initialFinancing,
  });
  const [crewStepIndex, setCrewStepIndex] = useState<number>(() => initialCrewStep);
  const [financingEnabled, setFinancingEnabled] = useState(initialFinancing.enabled);
  const [downPaymentPercent, setDownPaymentPercent] = useState(initialFinancing.downPaymentPercent);
  const [interestRate, setInterestRate] = useState(initialFinancing.interestRate);
  const [termMonths, setTermMonths] = useState(initialFinancing.termMonths);
  const [balloonPayment, setBalloonPayment] = useState(initialFinancing.balloonPayment);
  const [aircraftLoading, setAircraftLoading] = useState(false);
  // Client-entered aircraft values, per aircraft, so switching or comparing keeps them.
  const [aircraftValueOverrides, setAircraftValueOverrides] = useState<Record<string, string>>({});
  const aircraftValueOverridesRef = useRef(aircraftValueOverrides);
  aircraftValueOverridesRef.current = aircraftValueOverrides;
  // Aircraft shown side by side; empty when not comparing.
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    const ids = parseCompareParam(
      searchParams.get("compare"),
      compareInputs.map((a) => a.id)
    );
    return ids.length > 1 ? ids : [];
  });
  const comparing = canCompare && compareIds.length > 1;

  const ownerProfiles: ProposalOwnerProfile[] = snapshot.ownerProfiles ?? [];
  const multiOwner = ownerProfiles.length > 1;
  const totalOwnerHours = useMemo(
    () => totalProformaHours(proformaOwnerHours),
    [proformaOwnerHours]
  );

  const calculationAssumptions = useMemo(
    () => snapshot.calculationAssumptions ?? {},
    [snapshot.calculationAssumptions]
  );
  const configuratorAssumptions = useMemo(
    () => stringsToAssumptionMap(calculationAssumptions),
    [calculationAssumptions]
  );
  const financingScenarioVisible = useMemo(
    () => isFinancingScenarioVisible(configuratorAssumptions),
    [configuratorAssumptions]
  );

  const canComputeLocally = Object.keys(calculationAssumptions).length > 0;

  const crewStepFloor = useMemo(() => {
    if (!canComputeLocally) return undefined;
    return resolvePortalCrewStepFloor(configuratorAssumptions, totalOwnerHours);
  }, [canComputeLocally, configuratorAssumptions, totalOwnerHours]);

  useEffect(() => {
    if (crewStepFloor == null) return;
    setCrewStepIndex((prev) => (prev < crewStepFloor ? crewStepFloor : prev));
  }, [crewStepFloor]);

  const showAircraftSelector = snapshot.aircraftList.length > 1;
  const userEditedRef = useRef(false);
  const fetchGenerationRef = useRef(0);

  /**
   * - "reset": fresh aircraft, drop client edits (initial load, no edits yet).
   * - "keepShared": switching aircraft after the client edited — owner hours, crew and
   *   financing carry over (they're the client's own flying, not the aircraft's); aircraft
   *   value comes from that aircraft's own override or default. Crew is re-floored by effect.
   * - "refresh": server echo of the current aircraft; keep everything but the view.
   */
  const applySnapshot = useCallback(
    (next: ClientProFormaData, mode: "reset" | "keepShared" | "refresh" = "reset") => {
    setSnapshot(next);
    const override = aircraftValueOverridesRef.current[next.aircraft.id];
    setAircraftValue(
      mode !== "refresh" && override != null
        ? override
        : String(next.editableFields.aircraftValue.value)
    );
    const nextProformaHours =
      next.proformaOwnerHours ?? [next.editableFields.ownerAnnualHours.value];
    if (mode === "keepShared") {
      // Per-owner hours only transfer when the owner roster lines up.
      setProformaOwnerHours((prev) =>
        prev.length === nextProformaHours.length ? prev : nextProformaHours
      );
    } else {
      setProformaOwnerHours(nextProformaHours);
    }
    const nextCrewStep = initialCrewStepForSnapshot(
      next,
      totalProformaHours(nextProformaHours)
    );
    if (mode !== "refresh") {
      const nextFinancing = financingBaselineFromMap(next.calculationAssumptions ?? {});
      setBaseline({
        aircraftValue: next.baseMetrics.aircraftValue,
        proformaOwnerHours:
          next.baseProformaOwnerHours ??
          next.proformaOwnerHours ??
          [next.baseMetrics.ownerHours],
        crewStepIndex: nextCrewStep,
        financing: nextFinancing,
      });
    }
    if (mode === "reset") {
      const nextFinancing = financingBaselineFromMap(next.calculationAssumptions ?? {});
      setCrewStepIndex(nextCrewStep);
      setFinancingEnabled(nextFinancing.enabled);
      setDownPaymentPercent(nextFinancing.downPaymentPercent);
      setInterestRate(nextFinancing.interestRate);
      setTermMonths(nextFinancing.termMonths);
      setBalloonPayment(nextFinancing.balloonPayment);
      userEditedRef.current = false;
    }
  }, []);

  const loadAircraftData = useCallback(
    async (aircraftId: string) => {
      const isDraftPreview = searchParams.get("draft") === "1";
      // Once the client has modeled their own flying, keep it when they look at another aircraft.
      const mode = userEditedRef.current ? "keepShared" : "reset";

      if (!isDraftPreview && experienceBootstrap?.payload) {
        const local = serializeClientSnapshotFromPayload(experienceBootstrap.payload, {
          aircraftInstanceId: aircraftId,
        });
        if (local) {
          applySnapshot(local, mode);
          return;
        }
      }

      const generation = ++fetchGenerationRef.current;
      setAircraftLoading(true);
      try {
        const res = isDraftPreview
          ? await fetch(
              `/api/proposals/${encodeURIComponent(initial.proposal.id)}/portal-preview/client?aircraftInstanceId=${encodeURIComponent(aircraftId)}`
            )
          : await fetch(`/api/portal/${slug}/scenario`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                aircraftInstanceId: aircraftId,
                persistScenario: false,
              }),
            });
        if (!res.ok) return;
        const data = (await res.json()) as ClientProFormaData;
        if (generation !== fetchGenerationRef.current) return;
        if (data.aircraft.id !== aircraftId) return;
        applySnapshot(data, mode);
      } finally {
        if (generation === fetchGenerationRef.current) {
          setAircraftLoading(false);
        }
      }
    },
    [slug, applySnapshot, searchParams, initial.proposal.id, experienceBootstrap?.payload]
  );

  const initialFingerprint = `${initial.aircraft.id}:${initial.calculationAssumptions?.proforma_custom_fixed_costs ?? ""}`;
  const prevInitialFingerprintRef = useRef(initialFingerprint);

  useEffect(() => {
    if (initialFingerprint === prevInitialFingerprintRef.current) return;
    prevInitialFingerprintRef.current = initialFingerprint;
    const id =
      initialAircraftId ?? initial.aircraft.id ?? initial.aircraftList[0]?.id ?? "";
    setSelectedAircraftId(id);
    applySnapshot(initial);
  }, [initialFingerprint, initialAircraftId, initial, applySnapshot]);

  const parsedAircraftValue = useMemo(
    () => parseFloat(parseFormattedNumber(aircraftValue)) || 0,
    [aircraftValue]
  );

  const localCalc = useMemo(() => {
    if (!canComputeLocally) return null;
    return computeWorkspaceProFormaForClient(configuratorAssumptions, {
      aircraftValue: parsedAircraftValue,
      proformaOwnerHours,
      ownerProfiles: ownerProfiles.length > 0 ? ownerProfiles : undefined,
      ownerHours: multiOwner ? undefined : totalOwnerHours,
      crewStepIndex,
      financingEnabled: financingScenarioVisible ? financingEnabled : false,
      downPaymentPercent: parseFinancingNumber(downPaymentPercent),
      interestRate: parseFinancingNumber(interestRate),
      termMonths: parseFinancingNumber(termMonths),
      balloonPayment: parseFinancingNumber(balloonPayment),
    });
  }, [
    canComputeLocally,
    configuratorAssumptions,
    parsedAircraftValue,
    proformaOwnerHours,
    ownerProfiles,
    multiOwner,
    totalOwnerHours,
    crewStepIndex,
    financingScenarioVisible,
    financingEnabled,
    downPaymentPercent,
    interestRate,
    termMonths,
    balloonPayment,
  ]);

  // Shared client inputs applied to every aircraft, for compare and the selector cards.
  const sharedCompareInputs = useMemo(
    () => ({
      proformaOwnerHours,
      crewStepIndex,
      financingEnabled,
      downPaymentPercent: parseFinancingNumber(downPaymentPercent),
      interestRate: parseFinancingNumber(interestRate),
      termMonths: parseFinancingNumber(termMonths),
      balloonPayment: parseFinancingNumber(balloonPayment),
    }),
    [
      proformaOwnerHours,
      crewStepIndex,
      financingEnabled,
      downPaymentPercent,
      interestRate,
      termMonths,
      balloonPayment,
    ]
  );

  const aircraftValueNumbers = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, raw] of Object.entries(aircraftValueOverrides)) {
      const n = parseFloat(parseFormattedNumber(raw));
      if (Number.isFinite(n)) out[id] = n;
    }
    return out;
  }, [aircraftValueOverrides]);

  const comparison = useMemo(() => {
    if (!comparing) return null;
    const byId = new Map(compareInputs.map((a) => [a.id, a]));
    const selected = compareIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    if (selected.length < 2) return null;
    return buildProFormaComparison(selected, sharedCompareInputs, aircraftValueNumbers);
  }, [comparing, compareInputs, compareIds, sharedCompareInputs, aircraftValueNumbers]);

  // Live net annual per aircraft under the client's inputs, shown on the selector cards.
  const netAnnualByAircraft = useMemo(() => {
    if (!canCompare) return {};
    const all = buildProFormaComparison(compareInputs, sharedCompareInputs, aircraftValueNumbers);
    return Object.fromEntries(
      all.columns.map((c) => [c.id, Math.abs(c.metrics.netAnnualCost)])
    ) as Record<string, number>;
  }, [canCompare, compareInputs, sharedCompareInputs, aircraftValueNumbers]);

  const statementRows: ProFormaStatementRow[] = useMemo(() => {
    if (!localCalc) return snapshot.statementRows;
    return localCalc.statementRows;
  }, [localCalc, snapshot.statementRows]);

  const crewSummary = useMemo(() => {
    if (localCalc) {
      return resolveClientCrewSummary(localCalc.calculationAssumptions, {
        ownerProfiles: ownerProfiles.length > 0 ? ownerProfiles : undefined,
      });
    }
    return snapshot.crewSummary;
  }, [localCalc, ownerProfiles, snapshot.crewSummary]);

  // Net annual cost comes from the shared workspace metric helpers; hourly cost is
  // |net annual cost| ÷ owner annual hours (guarded against divide-by-zero).
  const netAnnualCost = localCalc?.metrics.netAnnualCost ?? snapshot.proForma.netAnnualCost;
  const hourlyNetCost =
    totalOwnerHours > 0 ? Math.abs(netAnnualCost) / totalOwnerHours : 0;

  const financingActive =
    financingScenarioVisible &&
    (localCalc?.calculationAssumptions.financing_enabled === "yes" ||
      (!localCalc && financingEnabled));
  const monthlyDebtService = useMemo(() => {
    if (!financingScenarioVisible) return 0;
    const raw = localCalc?.calculationAssumptions.monthly_debt_service;
    const n = parseFloat(raw ?? "");
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [
    financingScenarioVisible,
    localCalc?.calculationAssumptions.monthly_debt_service,
  ]);

  // Assumptions shown off-statement — same panel as the internal workspace pro forma.
  const assumptionsUsed = useMemo(
    () => localCalc?.assumptionsUsed ?? snapshot.assumptionsUsed ?? [],
    [localCalc, snapshot.assumptionsUsed]
  );

  const scenarioPayload = useMemo(
    () => ({
      aircraftValue: parsedAircraftValue,
      proformaOwnerHours,
      ownerHours: totalOwnerHours,
      crewStepIndex,
      financingEnabled,
      downPaymentPercent: parseFinancingNumber(downPaymentPercent),
      interestRate: parseFinancingNumber(interestRate),
      termMonths: parseFinancingNumber(termMonths),
      balloonPayment: parseFinancingNumber(balloonPayment),
      aircraftInstanceId: selectedAircraftId || undefined,
    }),
    [
      parsedAircraftValue,
      proformaOwnerHours,
      totalOwnerHours,
      crewStepIndex,
      financingEnabled,
      downPaymentPercent,
      interestRate,
      termMonths,
      balloonPayment,
      selectedAircraftId,
    ]
  );

  const financingAssumptions = useMemo((): AssumptionMap => {
    const base = configuratorAssumptions;
    return {
      ...base,
      aircraft_value: String(parsedAircraftValue),
      financing_enabled: financingEnabled ? "yes" : "no",
      down_payment_percent: downPaymentPercent,
      interest_rate: interestRate,
      term_months: termMonths,
      balloon_payment: balloonPayment,
    };
  }, [
    configuratorAssumptions,
    parsedAircraftValue,
    financingEnabled,
    downPaymentPercent,
    interestRate,
    termMonths,
    balloonPayment,
  ]);

  const persistScenario = useCallback(async () => {
    await fetch(`/api/portal/${slug}/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...scenarioPayload,
        persistScenario: true,
      }),
    });
  }, [slug, scenarioPayload]);

  const fetchFromServer = useCallback(async () => {
    const isDraftPreview = searchParams.get("draft") === "1";
    if (isDraftPreview && canComputeLocally && !userEditedRef.current) {
      return;
    }
    const generation = ++fetchGenerationRef.current;
    const aircraftIdAtFetch = selectedAircraftId;
    const res =
      isDraftPreview && initial.proposal.id
        ? await fetch(
            `/api/proposals/${encodeURIComponent(initial.proposal.id)}/portal-preview/client?aircraftInstanceId=${encodeURIComponent(aircraftIdAtFetch)}`
          )
        : await fetch(`/api/portal/${slug}/scenario`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...scenarioPayload,
              persistScenario: userEditedRef.current,
            }),
          });
    if (!res.ok) return;
    const updated = (await res.json()) as ClientProFormaData;
    if (generation !== fetchGenerationRef.current) return;
    if (updated.aircraft.id !== aircraftIdAtFetch) return;
    applySnapshot(updated, "refresh");
  }, [
    slug,
    scenarioPayload,
    applySnapshot,
    searchParams,
    initial.proposal.id,
    selectedAircraftId,
    canComputeLocally,
  ]);

  useEffect(() => {
    if (canComputeLocally) return;
    const t = setTimeout(() => void fetchFromServer(), 200);
    return () => clearTimeout(t);
  }, [canComputeLocally, fetchFromServer]);

  useEffect(() => {
    if (!userEditedRef.current) return;
    const t = setTimeout(() => void persistScenario(), 800);
    return () => clearTimeout(t);
  }, [persistScenario]);

  // Shallow URL update: keeps ?aircraft / ?compare shareable and reload-safe without a
  // server re-render (and without logging a portal view) on every toggle.
  function writeUrl(aircraftId: string, nextCompareIds: string[]) {
    const params = new URLSearchParams(window.location.search);
    if (aircraftId && aircraftId !== "legacy-primary") {
      params.set("aircraft", aircraftId);
    } else {
      params.delete("aircraft");
    }
    if (nextCompareIds.length > 1) {
      params.set("compare", nextCompareIds.join(","));
    } else {
      params.delete("compare");
    }
    const base = experiencePath ? `/${slug}/experience/pro-forma` : `/${slug}/pro-forma`;
    const qs = params.toString();
    window.history.replaceState(window.history.state, "", qs ? `${base}?${qs}` : base);
  }

  function selectAircraft(id: string) {
    if (id === selectedAircraftId) return;
    setSelectedAircraftId(id);
    writeUrl(id, compareIds);
    void loadAircraftData(id);
  }

  function setAircraftValueFor(aircraftId: string, value: string) {
    userEditedRef.current = true;
    setAircraftValueOverrides((prev) => ({ ...prev, [aircraftId]: value }));
    if (aircraftId === selectedAircraftId) setAircraftValue(value);
  }

  function startCompare() {
    const others = compareInputs.map((a) => a.id).filter((id) => id !== selectedAircraftId);
    const current = compareInputs.some((a) => a.id === selectedAircraftId)
      ? [selectedAircraftId]
      : [];
    const next = [...current, ...others].slice(0, 2);
    setCompareIds(next);
    writeUrl(selectedAircraftId, next);
  }

  function stopCompare() {
    setCompareIds([]);
    writeUrl(selectedAircraftId, []);
  }

  function toggleCompareAircraft(id: string) {
    let next: string[];
    if (compareIds.includes(id)) {
      // Keep at least two columns; "Done comparing" leaves compare.
      if (compareIds.length <= 2) return;
      next = compareIds.filter((x) => x !== id);
    } else {
      if (compareIds.length >= MAX_COMPARE_AIRCRAFT) return;
      next = [...compareIds, id];
    }
    setCompareIds(next);
    writeUrl(selectedAircraftId, next);
  }

  function viewAircraftFromCompare(id: string) {
    setCompareIds([]);
    if (id === selectedAircraftId) {
      writeUrl(id, []);
      return;
    }
    setSelectedAircraftId(id);
    writeUrl(id, []);
    void loadAircraftData(id);
  }

  function restore() {
    userEditedRef.current = true;
    setAircraftValueOverrides({});
    setAircraftValue(String(baseline.aircraftValue));
    setProformaOwnerHours([...baseline.proformaOwnerHours]);
    setCrewStepIndex(baseline.crewStepIndex);
    setFinancingEnabled(baseline.financing.enabled);
    setDownPaymentPercent(baseline.financing.downPaymentPercent);
    setInterestRate(baseline.financing.interestRate);
    setTermMonths(baseline.financing.termMonths);
    setBalloonPayment(baseline.financing.balloonPayment);
  }

  function patchOwnerHoursAtIndex(index: number, hours: number) {
    userEditedRef.current = true;
    setProformaOwnerHours((prev) => {
      const next = [...prev];
      next[index] = Math.max(0, hours);
      return next;
    });
  }

  // Aircraft selector strip — only when the proposal has more than one aircraft.
  // Outside compare, a card switches the focused aircraft; in compare, it toggles a column.
  const compareFull = compareIds.length >= MAX_COMPARE_AIRCRAFT;
  const aircraftSelector = showAircraftSelector ? (
    <div className="flex shrink-0 flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
        role={comparing ? "group" : "radiogroup"}
        aria-label={comparing ? "Aircraft to compare" : "Aircraft"}
      >
        {snapshot.aircraftList.map((ac) => {
          const inCompare = compareIds.includes(ac.id);
          const active = comparing ? inCompare : selectedAircraftId === ac.id;
          const lockedIn = comparing && inCompare && compareIds.length <= 2;
          const blocked = comparing && !inCompare && compareFull;
          const netAnnual = netAnnualByAircraft[ac.id];
          return (
            <button
              key={ac.id}
              type="button"
              role={comparing ? "checkbox" : "radio"}
              aria-checked={active}
              onClick={() => (comparing ? toggleCompareAircraft(ac.id) : selectAircraft(ac.id))}
              disabled={aircraftLoading || blocked || lockedIn}
              title={
                blocked
                  ? `Compare up to ${MAX_COMPARE_AIRCRAFT} aircraft at a time`
                  : lockedIn
                    ? "Comparing needs at least two aircraft"
                    : undefined
              }
              className={cn(
                "flex min-w-[12rem] shrink-0 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                active
                  ? "border-atlas-accent bg-atlas-accent/15"
                  : "border-white/20 hover:border-white/40",
                (aircraftLoading || blocked) && "cursor-not-allowed opacity-50",
                lockedIn && "cursor-default"
              )}
            >
              {comparing ? (
                <span
                  aria-hidden
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                    inCompare ? "border-atlas-accent bg-atlas-accent text-[#0a0d14]" : "border-white/40"
                  )}
                >
                  {inCompare ? "✓" : null}
                </span>
              ) : null}
              {ac.portalImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ac.portalImageUrl} alt="" className="h-9 w-14 shrink-0 rounded object-cover" />
              ) : null}
              <span className="min-w-0">
                <span className={cn("block truncate", active ? "text-atlas-accent" : "text-white/80")}>
                  {ac.label}
                  {ac.tailNumber ? <span className="ml-1.5 text-white/45">{ac.tailNumber}</span> : null}
                </span>
                {netAnnual != null ? (
                  <span className="block font-mono text-xs tabular-nums text-white/55">
                    {formatCurrency(netAnnual)}/yr net
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {canCompare ? (
        <button
          type="button"
          onClick={comparing ? stopCompare : startCompare}
          className={cn(
            "shrink-0 self-start rounded-lg border px-4 py-2 text-sm transition-colors sm:self-center",
            comparing
              ? "border-white/20 text-white/80 hover:border-white/40 hover:text-white"
              : "border-atlas-accent/60 text-atlas-accent hover:bg-atlas-accent/10"
          )}
        >
          {comparing ? "Done comparing" : "Compare side by side"}
        </button>
      ) : null}
    </div>
  ) : null;

  const ownerHoursInputs = multiOwner ? (
    <div>
      <p className="text-sm text-white/70">Owner flight hours</p>
      <ul className="mt-3 space-y-3">
        {ownerProfiles.map((profile, index) => (
          <li
            key={profile.id ?? profile.sortOrder}
            className="flex items-center justify-between gap-3"
          >
            <span className="min-w-0 truncate text-sm text-white/80">
              {profile.displayName}
            </span>
            <HoursInput
              min={0}
              step={1}
              className={proFormaNumericInputClass}
              value={Number.isFinite(proformaOwnerHours[index])
                ? proformaOwnerHours[index]!
                : 0}
              onChange={(hours) => patchOwnerHoursAtIndex(index, hours)}
              aria-label={`${profile.displayName} flight hours`}
            />
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor="owner-annual-hours" className="text-sm text-white/70">
        Owner annual hours
      </label>
      <HoursInput
        id="owner-annual-hours"
        value={proformaOwnerHours[0] ?? totalOwnerHours}
        onChange={(hours) => patchOwnerHoursAtIndex(0, hours)}
        className={proFormaNumericInputClass}
      />
    </div>
  );

  const resolvedTitle = title ?? "Pro Forma";
  const resolvedDescription = description ?? DEFAULT_DESCRIPTION;

  // Column 1 — title + descriptive copy.
  const titlePanel = (
    <div className="flex min-h-0 flex-col gap-4">
      <ProFormaSectionTitle>Financial outlook</ProFormaSectionTitle>
      <div className="space-y-3">
        <h2 className="font-serif text-2xl text-white sm:text-3xl">{resolvedTitle}</h2>
        {snapshot.aircraft?.label ? (
          <p className="text-sm text-white/60">{snapshot.aircraft.label}</p>
        ) : null}
        <p className="text-sm leading-relaxed text-white/70">{resolvedDescription}</p>
      </div>
    </div>
  );

  // Column 2 — assumptions stack pulled from the workspace computation.
  const assumptionsPanel = (
    <div className="flex min-h-0 flex-col gap-4">
      <ProFormaSectionTitle>Your assumptions</ProFormaSectionTitle>
      <div className="space-y-5">
      {comparing ? (
        <p className="text-sm text-white/60">
          These apply to every aircraft you&apos;re comparing. Set each aircraft&apos;s value in
          its column.
        </p>
      ) : null}
      <div>
        {comparing ? null : (
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <label htmlFor="aircraft-value" className="text-sm text-white/70">
              Aircraft value
            </label>
            <MoneyInput
              id="aircraft-value"
              value={aircraftValue}
              onChange={(v) => setAircraftValueFor(selectedAircraftId, v)}
              className={proFormaNumericInputClass}
            />
          </div>
        )}
        <div className={comparing ? undefined : "pt-3"}>{ownerHoursInputs}</div>
      </div>
      {canComputeLocally ? (
        <div className="rounded-lg border border-white/15 bg-white/5 px-4 py-3">
          <CrewLadderStepper
            assumptions={configuratorAssumptions}
            ownerHours={totalOwnerHours}
            crewStepIndex={crewStepIndex}
            variant="portal"
            onCrewChange={(next) => {
              userEditedRef.current = true;
              const step = parseCrewStepIndex(next.crew_step_index);
              if (step != null) setCrewStepIndex(step);
            }}
          />
        </div>
      ) : null}
      {crewSummary && !comparing ? (
        <ProFormaUtilizationSummary
          summary={crewSummary}
          totalOwnerHours={totalOwnerHours}
          maxHours={crewSummary.maxAnnualUtilization}
        />
      ) : null}
      {canComputeLocally && financingScenarioVisible ? (
        <ProFormaFinancingPanel
          assumptions={financingAssumptions}
          variant="portal"
          defaultOpen={false}
          onChange={(next) => {
            userEditedRef.current = true;
            setFinancingEnabled(next.financing_enabled === "yes");
            setDownPaymentPercent(next.down_payment_percent ?? "");
            setInterestRate(next.interest_rate ?? "");
            setTermMonths(next.term_months ?? "");
            setBalloonPayment(next.balloon_payment ?? "");
          }}
        />
      ) : null}
      {comparing ? null : <ProFormaAssumptionsList items={assumptionsUsed} />}
      </div>
    </div>
  );

  const restoreButton = (
    <button
      type="button"
      onClick={restore}
      className="text-sm text-atlas-accent hover:underline"
    >
      Restore to PrismJet assumptions
    </button>
  );

  // Column 3 — the pro forma statement.
  const statementPanel = (
    <div className="flex min-h-0 flex-col gap-4">
      <ProFormaSectionTitle>Pro forma statement</ProFormaSectionTitle>
      <ClientProFormaStatement
        rows={statementRows}
        period={period}
        collapsible
        defaultExpanded
        onPeriodChange={setPeriod}
      />
    </div>
  );

  // Column 4 — totals / net costs.
  const totalsPanel = (
    <div className="flex min-h-0 flex-col gap-4">
      <ProFormaSectionTitle>Net costs</ProFormaSectionTitle>
      <div className="space-y-4 rounded-lg border border-white/15 bg-white/5 p-4 backdrop-blur">
      <dl className="space-y-4">
        <div>
          <dt className="text-sm text-white/60">Total aircraft value</dt>
          <dd className="mt-1 font-mono text-lg tabular-nums text-white">
            {formatCurrency(parsedAircraftValue)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-white/60">Annual cost (net)</dt>
          <dd className="mt-1 font-mono text-xl tabular-nums text-atlas-accent">
            {formatCurrency(Math.abs(netAnnualCost))}
          </dd>
          {financingActive && monthlyDebtService > 0 ? (
            <p className="mt-0.5 text-xs text-white/45">Includes debt service in fixed costs</p>
          ) : null}
        </div>
        {financingActive && monthlyDebtService > 0 ? (
          <div>
            <dt className="text-sm text-white/60">Monthly debt service</dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-white">
              {formatCurrency(monthlyDebtService)}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-sm text-white/60">Hourly cost</dt>
          <dd className="mt-1 font-mono text-lg tabular-nums text-white">
            {hourlyNetCost > 0 ? formatCurrency(hourlyNetCost) : "—"}
          </dd>
          <p className="mt-0.5 text-xs text-white/45">
            Net cost ÷ {totalOwnerHours || 0} owner hours
          </p>
        </div>
      </dl>
      </div>
    </div>
  );

  // Grid children: [title?] assumptions + (statement, totals) — or one compare panel spanning both.
  const bodyColumnCount = (showTitleColumn ? 1 : 0) + 1 + (comparison ? 1 : 2);

  return (
    <div
      className={cn(
        "text-white",
        embedded && "flex min-h-0 flex-1 flex-col overflow-hidden",
        className
      )}
    >
      {aircraftSelector}
      <div
        className={cn(
          // Embedded: flex-1 fills what's left under the selector strip (h-full would overflow).
          "grid min-h-0 grid-cols-1 gap-5 md:grid-cols-2 md:gap-6",
          !embedded && "h-full",
          showTitleColumn
            ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,2.75fr)_minmax(0,3.5fr)_minmax(0,2fr)] xl:gap-5"
            : "xl:grid-cols-[minmax(0,2.75fr)_minmax(0,3.5fr)_minmax(0,2fr)] xl:gap-5",
          embedded &&
            (bodyColumnCount === 4
              ? "grid-rows-[repeat(4,minmax(0,1fr))]"
              : bodyColumnCount === 3
                ? "grid-rows-[repeat(3,minmax(0,1fr))]"
                : "grid-rows-[repeat(2,minmax(0,1fr))]"),
          embedded &&
            "flex-1 md:grid-rows-[repeat(2,minmax(0,1fr))] xl:grid-rows-[minmax(0,1fr)]",
          aircraftLoading && "opacity-70 transition-opacity"
        )}
      >
        {showTitleColumn ? (
          <ProFormaColumn embedded={embedded} scrollDeps={resolvedTitle}>
            {titlePanel}
          </ProFormaColumn>
        ) : null}
        <ProFormaColumn
          embedded={embedded}
          scrollDeps={`${assumptionsUsed.length}:${comparing}`}
          pinnedFooter={restoreButton}
        >
          {assumptionsPanel}
        </ProFormaColumn>
        {comparison ? (
          <ProFormaColumn
            embedded={embedded}
            className="md:col-span-2"
            scrollDeps={`${comparison.columns.length}:${comparison.statementRows.length}:${period}`}
          >
            <ProFormaCompare
              comparison={comparison}
              period={period}
              onPeriodChange={setPeriod}
              aircraftValues={aircraftValueOverrides}
              onAircraftValueChange={setAircraftValueFor}
              onViewAircraft={viewAircraftFromCompare}
            />
          </ProFormaColumn>
        ) : (
          <>
            <ProFormaColumn
              embedded={embedded}
              className="md:col-span-2 xl:col-span-1"
              scrollDeps={`${statementRows.length}:${period}`}
            >
              {statementPanel}
            </ProFormaColumn>
            <ProFormaColumn embedded={embedded} className="md:col-span-2 xl:col-span-1">
              {totalsPanel}
            </ProFormaColumn>
          </>
        )}
      </div>
    </div>
  );
}
