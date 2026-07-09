"use client";

import { useState } from "react";
import type { PricingBreakdown } from "@/lib/charter/empty-legs/pricing";

export function PricingBreakdownButton({
  emptyLegId,
  placementId,
}: {
  emptyLegId: string;
  placementId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PricingBreakdown | null>(null);

  async function load() {
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/charter/empty-legs/${emptyLegId}/placements/${placementId}/pricing`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load pricing");
        setData(null);
      } else {
        setData(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pricing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-block">
      <button
        type="button"
        className="text-xs text-atlas-accent hover:underline"
        onClick={() => void load()}
      >
        Pricing
      </button>
      {open ? (
        <div className="mt-2 rounded border border-atlas-border bg-atlas-bg p-3 text-xs">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-medium">Pricing breakdown</span>
            <button
              type="button"
              className="text-atlas-muted hover:text-atlas-text"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          {loading ? <p className="text-atlas-muted">Loading…</p> : null}
          {error ? <p className="text-red-600">{error}</p> : null}
          {data && !loading ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
              <dt className="text-atlas-muted">Source</dt>
              <dd>{data.source}</dd>
              <dt className="text-atlas-muted">iCal hours</dt>
              <dd>{data.icalDurationHours.toFixed(2)}</dd>
              <dt className="text-atlas-muted">Min hours</dt>
              <dd>{data.minimumQuotableHours}</dd>
              <dt className="text-atlas-muted">Pricing hours</dt>
              <dd>{data.pricingDurationHours.toFixed(2)}</dd>
              <dt className="text-atlas-muted">Hourly rate</dt>
              <dd>{data.hourlyRate != null ? `$${data.hourlyRate}` : "—"}</dd>
              <dt className="text-atlas-muted">Base</dt>
              <dd>{data.basePrice != null ? `$${data.basePrice}` : "—"}</dd>
              <dt className="text-atlas-muted">Discount</dt>
              <dd>
                {data.discountPercent != null ? `${data.discountPercent}%` : "—"}
                {data.discountApplied != null ? ` (−$${data.discountApplied})` : ""}
              </dd>
              <dt className="text-atlas-muted">Final</dt>
              <dd>
                {data.priceHidden
                  ? "Hidden"
                  : data.finalDisplayPrice != null
                    ? `$${data.finalDisplayPrice}`
                    : "—"}
              </dd>
              {data.listRoutingProfileName ? (
                <>
                  <dt className="text-atlas-muted">List profile</dt>
                  <dd>{data.listRoutingProfileName}</dd>
                </>
              ) : null}
              {data.globalRoutingProfileName ? (
                <>
                  <dt className="text-atlas-muted">Global profile</dt>
                  <dd>{data.globalRoutingProfileName}</dd>
                </>
              ) : null}
            </dl>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
