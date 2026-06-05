"use client";

import type { UtilizationProfile } from "@/lib/proforma-utilization";
import { cn } from "@/lib/utils";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";

const METRICS_GRID =
  "grid grid-cols-[minmax(11rem,1fr)_minmax(4.5rem,max-content)] items-center gap-x-4 border-b border-atlas-border/40 px-4 py-2.5 last:border-b-0";

export function ProFormaScenarioPanel({
  profile,
  charterEnabled = true,
  ownerProfiles = [],
  onOwnerHoursChange,
}: {
  profile: UtilizationProfile;
  charterEnabled?: boolean;
  ownerProfiles?: ProposalOwnerProfile[];
  onOwnerHoursChange: (hours: number) => void;
}) {
  const multiOwner = ownerProfiles.length > 1;

  return (
    <div className="overflow-hidden rounded-lg border border-atlas-border/80 bg-atlas-surface/25">
      <div className="border-b border-atlas-border/50 px-4 py-4">
        {multiOwner ? (
          <div>
            <p className="atlas-label">Owner flight hours</p>
            <p className="atlas-caption mt-1">
              Set per owner in the setup bar above ({profile.ownerFlightHours} total)
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {ownerProfiles.map((p) => (
                <li
                  key={p.sortOrder}
                  className="flex justify-between gap-3 border-b border-atlas-border/30 py-1.5 last:border-b-0"
                >
                  <span className="text-atlas-muted">{p.displayName}</span>
                  <span className="font-mono tabular-nums">{fmtHours(p.annualFlightHours)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <label className="block">
            <span className="atlas-label">Owner flight hours</span>
            <span className="atlas-caption mt-1 block">
              Also editable in setup bar — drives P&L below
            </span>
            <input
              type="number"
              min={0}
              step={1}
              className="atlas-input mt-3 w-full max-w-[8rem] text-center sm:text-left"
              value={Number.isFinite(profile.ownerFlightHours) ? profile.ownerFlightHours : ""}
              onChange={(e) => onOwnerHoursChange(parseFloat(e.target.value) || 0)}
            />
          </label>
        )}
      </div>

      <div className="py-1">
        <MetricRow
          label="Max annual usage"
          value={fmtHours(profile.maxAnnualUsage)}
          muted={profile.maxAnnualUsage <= 0}
        />
        {charterEnabled ? (
          <>
            <MetricRow
              label="Available charter flight hours"
              value={fmtHours(profile.availableCharterFlightHours)}
            />
            <MetricRow
              label="Charter revenue hours"
              value={fmtHours(profile.charterRevenueHours)}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={METRICS_GRID}>
      <p className="atlas-proforma-line text-atlas-muted">{label}</p>
      <p
        className={cn(
          "shrink-0 whitespace-nowrap text-right font-mono text-sm tabular-nums text-atlas-accent",
          muted && "text-atlas-muted"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function fmtHours(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n % 1 === 0 ? `${n}` : n.toFixed(1);
}
