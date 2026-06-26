"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn, formatCurrency, parseFormattedNumber } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/money-input";
import { HoursInput } from "@/components/ui/hours-input";
import { ClientProFormaStatement } from "@/components/client/client-proforma-statement";
import { ProFormaAssumptionsList } from "@/components/client/pro-forma-assumptions";
import { ProFormaUtilizationSummary } from "@/components/client/pro-forma-utilization-summary";
import { CrewLadderStepper } from "@/components/shared/crew-ladder-stepper";
import type { ClientSnapshotView } from "@/lib/client-serializer";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";
import {
  computeWorkspaceProFormaForClient,
  resolveClientCrewSummary,
  resolvePortalCrewStepFloor,
  stringsToAssumptionMap,
} from "@/lib/workspace-proforma-client";

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

/** Scrollable column wrapper for the embedded pro forma grid. */
function ProFormaColumn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-0 min-w-0",
        "max-xl:overflow-visible xl:overflow-y-auto xl:overscroll-y-contain xl:pr-1",
        className
      )}
    >
      {children}
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const [snapshot, setSnapshot] = useState(initial);
  const [selectedAircraftId, setSelectedAircraftId] = useState(
    initialAircraftId ?? initial.aircraft.id ?? initial.aircraftList[0]?.id ?? ""
  );
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
  const [baseline, setBaseline] = useState({
    aircraftValue: initial.baseMetrics.aircraftValue,
    proformaOwnerHours:
      initial.baseProformaOwnerHours ??
      initial.proformaOwnerHours ??
      [initial.baseMetrics.ownerHours],
    crewStepIndex: initialCrewStep,
  });
  const [crewStepIndex, setCrewStepIndex] = useState<number>(() => initialCrewStep);
  const [aircraftLoading, setAircraftLoading] = useState(false);

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
  const canComputeLocally = Object.keys(calculationAssumptions).length > 0;

  const crewStepFloor = useMemo(() => {
    if (!canComputeLocally) return undefined;
    return resolvePortalCrewStepFloor(
      stringsToAssumptionMap(calculationAssumptions),
      totalOwnerHours
    );
  }, [canComputeLocally, calculationAssumptions, totalOwnerHours]);

  useEffect(() => {
    if (crewStepFloor == null) return;
    setCrewStepIndex((prev) => (prev < crewStepFloor ? crewStepFloor : prev));
  }, [crewStepFloor]);

  const showAircraftSelector = snapshot.aircraftList.length > 1;
  const userEditedRef = useRef(false);

  const applySnapshot = useCallback((next: ClientProFormaData, resetEdits = true) => {
    setSnapshot(next);
    setAircraftValue(String(next.editableFields.aircraftValue.value));
    const nextProformaHours =
      next.proformaOwnerHours ?? [next.editableFields.ownerAnnualHours.value];
    setProformaOwnerHours(nextProformaHours);
    const nextCrewStep = initialCrewStepForSnapshot(
      next,
      totalProformaHours(nextProformaHours)
    );
    if (resetEdits) {
      setBaseline({
        aircraftValue: next.baseMetrics.aircraftValue,
        proformaOwnerHours:
          next.baseProformaOwnerHours ??
          next.proformaOwnerHours ??
          [next.baseMetrics.ownerHours],
        crewStepIndex: nextCrewStep,
      });
      setCrewStepIndex(nextCrewStep);
      userEditedRef.current = false;
    }
  }, []);

  const loadAircraftData = useCallback(
    async (aircraftId: string) => {
      setAircraftLoading(true);
      try {
        const res = await fetch(`/api/portal/${slug}/scenario`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aircraftInstanceId: aircraftId,
            persistScenario: false,
          }),
        });
        if (res.ok) {
          applySnapshot((await res.json()) as ClientProFormaData);
        }
      } finally {
        setAircraftLoading(false);
      }
    },
    [slug, applySnapshot]
  );

  const prevInitialAircraftIdRef = useRef(initialAircraftId);

  useEffect(() => {
    if (initialAircraftId === prevInitialAircraftIdRef.current) return;
    prevInitialAircraftIdRef.current = initialAircraftId;
    const id =
      initialAircraftId ?? initial.aircraft.id ?? initial.aircraftList[0]?.id ?? "";
    setSelectedAircraftId(id);
    applySnapshot(initial);
  }, [initialAircraftId, initial, applySnapshot]);

  const parsedAircraftValue = useMemo(
    () => parseFloat(parseFormattedNumber(aircraftValue)) || 0,
    [aircraftValue]
  );

  const localCalc = useMemo(() => {
    if (!canComputeLocally) return null;
    return computeWorkspaceProFormaForClient(
      stringsToAssumptionMap(calculationAssumptions),
      {
        aircraftValue: parsedAircraftValue,
        proformaOwnerHours,
        ownerProfiles: ownerProfiles.length > 0 ? ownerProfiles : undefined,
        ownerHours: multiOwner ? undefined : totalOwnerHours,
        crewStepIndex,
      }
    );
  }, [
    canComputeLocally,
    calculationAssumptions,
    parsedAircraftValue,
    proformaOwnerHours,
    ownerProfiles,
    multiOwner,
    totalOwnerHours,
    crewStepIndex,
  ]);

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
      aircraftInstanceId: selectedAircraftId || undefined,
    }),
    [parsedAircraftValue, proformaOwnerHours, totalOwnerHours, crewStepIndex, selectedAircraftId]
  );

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
    const res = await fetch(`/api/portal/${slug}/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...scenarioPayload,
        persistScenario: userEditedRef.current,
      }),
    });
    if (res.ok) {
      const updated = (await res.json()) as ClientProFormaData;
      applySnapshot(updated, false);
    }
  }, [slug, scenarioPayload, applySnapshot]);

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

  function selectAircraft(id: string) {
    if (id === selectedAircraftId) return;
    setSelectedAircraftId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id && id !== "legacy-primary") {
      params.set("aircraft", id);
    } else {
      params.delete("aircraft");
    }
    const base = experiencePath
      ? `/${slug}/experience/pro-forma`
      : `/${slug}/pro-forma`;
    router.replace(`${base}?${params.toString()}`, { scroll: false });
    void loadAircraftData(id);
  }

  function restore() {
    userEditedRef.current = true;
    setAircraftValue(String(baseline.aircraftValue));
    setProformaOwnerHours([...baseline.proformaOwnerHours]);
    setCrewStepIndex(baseline.crewStepIndex);
  }

  function patchOwnerHoursAtIndex(index: number, hours: number) {
    userEditedRef.current = true;
    setProformaOwnerHours((prev) => {
      const next = [...prev];
      next[index] = Math.max(0, hours);
      return next;
    });
  }

  // Aircraft selector only renders when the proposal has more than one aircraft.
  const aircraftSelector = showAircraftSelector ? (
    <div className="flex flex-wrap gap-2">
      {snapshot.aircraftList.map((ac) => (
        <button
          key={ac.id}
          type="button"
          onClick={() => selectAircraft(ac.id)}
          disabled={aircraftLoading}
          className={cn(
            "rounded-lg border px-4 py-2 text-sm transition-colors",
            selectedAircraftId === ac.id
              ? "border-atlas-accent bg-atlas-accent/15 text-atlas-accent"
              : "border-white/20 text-white/70 hover:border-white/40 hover:text-white",
            aircraftLoading && "pointer-events-none opacity-60"
          )}
        >
          {ac.label}
          {ac.tailNumber ? (
            <span className="ml-2 text-white/45">{ac.tailNumber}</span>
          ) : null}
        </button>
      ))}
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
      {aircraftSelector}
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <label htmlFor="aircraft-value" className="text-sm text-white/70">
            Aircraft value
          </label>
          <MoneyInput
            id="aircraft-value"
            value={aircraftValue}
            onChange={(v) => {
              userEditedRef.current = true;
              setAircraftValue(v);
            }}
            className={proFormaNumericInputClass}
          />
        </div>
        <div className="pt-3">{ownerHoursInputs}</div>
      </div>
      {canComputeLocally ? (
        <div className="rounded-lg border border-white/15 bg-white/5 px-4 py-3">
          <CrewLadderStepper
            assumptions={stringsToAssumptionMap(calculationAssumptions)}
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
      {crewSummary ? (
        <ProFormaUtilizationSummary
          summary={crewSummary}
          totalOwnerHours={totalOwnerHours}
          maxHours={crewSummary.maxAnnualUtilization}
        />
      ) : null}
      <ProFormaAssumptionsList items={assumptionsUsed} />
      <button
        type="button"
        onClick={restore}
        className="text-sm text-atlas-accent hover:underline"
      >
        Restore to PrismJet assumptions
      </button>
      </div>
    </div>
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
        </div>
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

  return (
    <div
      className={cn(
        "text-white",
        embedded
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : "",
        className
      )}
    >
      <div
        className={cn(
          embedded
            ? "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain xl:overflow-hidden"
            : "",
          "grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6",
          showTitleColumn
            ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,2.75fr)_minmax(0,3.5fr)_minmax(0,2fr)] xl:gap-5"
            : "xl:grid-cols-[minmax(0,2.75fr)_minmax(0,3.5fr)_minmax(0,2fr)] xl:gap-5",
          embedded && "xl:h-full xl:min-h-0 xl:flex-1 xl:grid-rows-1",
          aircraftLoading && "opacity-70 transition-opacity"
        )}
      >
        {showTitleColumn ? (
          <ProFormaColumn>{titlePanel}</ProFormaColumn>
        ) : null}
        <ProFormaColumn>{assumptionsPanel}</ProFormaColumn>
        <ProFormaColumn className="md:col-span-2 xl:col-span-1">
          {statementPanel}
        </ProFormaColumn>
        <ProFormaColumn className="md:col-span-2 xl:col-span-1 xl:self-start">
          {totalsPanel}
        </ProFormaColumn>
      </div>
    </div>
  );
}
