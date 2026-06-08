"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  ALLOCATION_MODE_OPTIONS,
  type OwnerExpenseAllocationMode,
} from "@/lib/owner-expense-allocation";
import {
  MAX_OWNER_COUNT,
  normalizeProfilesForCount,
  validateOwnerProfiles,
  type ProposalOwnerProfile,
} from "@/lib/proposal-owners";

export function OwnerControlsStrip({
  profiles,
  allocationMode,
  onProfilesChange,
  onAllocationModeChange,
  defaultHours = 400,
}: {
  profiles: ProposalOwnerProfile[];
  allocationMode: OwnerExpenseAllocationMode;
  onProfilesChange: (next: ProposalOwnerProfile[]) => void;
  onAllocationModeChange: (mode: OwnerExpenseAllocationMode) => void;
  defaultHours?: number;
}) {
  const count = profiles.length;

  function setCount(n: number) {
    onProfilesChange(normalizeProfilesForCount(n, profiles, defaultHours));
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <div className="flex items-center gap-2">
        <label className="atlas-kicker shrink-0" htmlFor="owner-count">
          Owner count
        </label>
        <select
          id="owner-count"
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value, 10))}
          className="atlas-input w-[5.5rem]"
        >
          {Array.from({ length: MAX_OWNER_COUNT }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <label className="atlas-kicker shrink-0" htmlFor="allocation-mode">
          Expense allocation
        </label>
        <select
          id="allocation-mode"
          value={allocationMode}
          onChange={(e) =>
            onAllocationModeChange(e.target.value as OwnerExpenseAllocationMode)
          }
          className="atlas-input min-w-[12rem] max-w-md"
        >
          {ALLOCATION_MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function OwnerSplitsTable({
  profiles,
  maxAnnualUtilization,
  onProfilesChange,
  fullWidth = false,
  defaultHours = 400,
}: {
  profiles: ProposalOwnerProfile[];
  maxAnnualUtilization: number;
  onProfilesChange: (next: ProposalOwnerProfile[]) => void;
  fullWidth?: boolean;
  defaultHours?: number;
}) {
  const count = profiles.length;
  const validation = useMemo(
    () => validateOwnerProfiles(profiles, maxAnnualUtilization, count > 1),
    [profiles, maxAnnualUtilization, count]
  );

  function patchProfile(index: number, patch: Partial<ProposalOwnerProfile>) {
    const next = profiles.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onProfilesChange(next);
  }

  return (
    <div className={cn("space-y-3", !fullWidth && "border-t border-atlas-border/60 pt-3")}>
      <div
        className={cn(
          "overflow-hidden rounded-md border border-atlas-border/70",
          fullWidth && "bg-atlas-surface/20"
        )}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-atlas-border/60 bg-atlas-bg/40">
              <th className="px-3 py-2 text-left atlas-kicker font-normal">Owner</th>
              <th className="w-32 px-3 py-2 text-right atlas-kicker font-normal">Flight hours</th>
              <th className="w-28 px-3 py-2 text-right atlas-kicker font-normal">Equity %</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p, i) => (
              <tr key={i} className="border-b border-atlas-border/40 last:border-b-0">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    className="atlas-input w-full"
                    value={p.displayName}
                    onChange={(e) => patchProfile(i, { displayName: e.target.value })}
                    aria-label={`Owner ${i + 1} name`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="atlas-input w-full text-right"
                    value={Number.isFinite(p.annualFlightHours) ? p.annualFlightHours : ""}
                    onChange={(e) =>
                      patchProfile(i, {
                        annualFlightHours: parseFloat(e.target.value) || 0,
                      })
                    }
                    aria-label={`${p.displayName} flight hours`}
                  />
                </td>
                <td className="px-3 py-2">
                  {count === 1 ? (
                    <span className="block text-right font-mono tabular-nums text-atlas-muted">
                      100%
                    </span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      className="atlas-input w-full text-right"
                      value={Number.isFinite(p.ownershipPercent) ? p.ownershipPercent : ""}
                      onChange={(e) =>
                        patchProfile(i, {
                          ownershipPercent: parseFloat(e.target.value) || 0,
                        })
                      }
                      aria-label={`${p.displayName} equity percent`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
        <p className="text-atlas-muted">
          Total owner hours:{" "}
          <span className="font-mono tabular-nums text-atlas-text">
            {validation.totalHours}
          </span>
          {validation.maxHours > 0 ? (
            <>
              {" "}
              / max{" "}
              <span className="font-mono tabular-nums">{validation.maxHours}</span>
            </>
          ) : null}
        </p>
        {count > 1 ? (
          <p
            className={cn(
              "font-mono tabular-nums",
              Math.abs(validation.equitySum - 100) > 0.5
                ? "text-amber-600"
                : "text-atlas-muted"
            )}
          >
            Equity total: {validation.equitySum.toFixed(1)}%
          </p>
        ) : null}
        <p className="atlas-caption text-atlas-muted">
          Owner hours reduce shared charter availability. Set max utilization in the Utilization tab.
        </p>
      </div>

      {!validation.ok ? (
        <ul className="text-xs text-amber-700 dark:text-amber-400">
          {validation.messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
