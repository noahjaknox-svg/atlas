"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { HoursInput } from "@/components/ui/hours-input";
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
import { EquityPercentInput } from "@/components/internal/workspace/equity-percent-input";

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
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-8 sm:gap-y-3">
      <div className="atlas-form-field min-w-[8rem]">
        <label className="atlas-field-label" htmlFor="owner-count">
          Owner count
        </label>
        <select
          id="owner-count"
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value, 10))}
          className="atlas-input w-full sm:w-[5.5rem]"
        >
          {Array.from({ length: MAX_OWNER_COUNT }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="atlas-form-field min-w-0 flex-1 sm:max-w-md">
        <label className="atlas-field-label" htmlFor="allocation-mode">
          Expense allocation
        </label>
        <select
          id="allocation-mode"
          value={allocationMode}
          onChange={(e) =>
            onAllocationModeChange(e.target.value as OwnerExpenseAllocationMode)
          }
          className="atlas-input w-full"
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
  onProfilesChange,
  defaultHours = 400,
}: {
  profiles: ProposalOwnerProfile[];
  onProfilesChange: (next: ProposalOwnerProfile[]) => void;
  defaultHours?: number;
}) {
  const count = profiles.length;
  const validation = useMemo(
    () => validateOwnerProfiles(profiles, 0, count > 1),
    [profiles, count]
  );

  function patchProfile(index: number, patch: Partial<ProposalOwnerProfile>) {
    const next = profiles.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onProfilesChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-atlas-border/70 bg-atlas-bg/20">
        <table className="atlas-data-table">
          <thead>
            <tr>
              <th>Owner</th>
              <th className="text-right">Default flight hours</th>
              <th className="text-right">Equity %</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p, i) => (
              <tr key={p.id ?? `owner-${i}`}>
                <td>
                  <input
                    type="text"
                    className="atlas-input w-full"
                    value={p.displayName}
                    onChange={(e) => patchProfile(i, { displayName: e.target.value })}
                    aria-label={`Owner ${i + 1} name`}
                  />
                </td>
                <td>
                  <HoursInput
                    min={0}
                    step={1}
                    className="atlas-input atlas-input-mono w-full text-right"
                    value={Number.isFinite(p.annualFlightHours) ? p.annualFlightHours : 0}
                    onChange={(hours) =>
                      patchProfile(i, {
                        annualFlightHours: hours,
                      })
                    }
                    aria-label={`${p.displayName} default flight hours`}
                  />
                </td>
                <td>
                  {count === 1 ? (
                    <span className="block text-right font-mono text-sm tabular-nums text-atlas-muted">
                      100%
                    </span>
                  ) : (
                    <EquityPercentInput
                      value={Number.isFinite(p.ownershipPercent) ? p.ownershipPercent : 0}
                      onChange={(ownershipPercent) =>
                        patchProfile(i, { ownershipPercent })
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

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs leading-relaxed">
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
          Default hours seed the pro forma utilization scenario. Edit scenario hours in the
          pro forma panel.
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
